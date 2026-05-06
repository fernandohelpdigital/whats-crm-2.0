// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub;

    const body = await req.json();
    const broadcastId = body.broadcast_id as string;
    if (!broadcastId) {
      return new Response(JSON.stringify({ error: 'broadcast_id required' }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load broadcast
    const { data: bc, error: bcErr } = await admin
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .eq('user_id', userId)
      .single();

    if (bcErr || !bc) {
      return new Response(JSON.stringify({ error: 'Broadcast not found' }), { status: 404, headers: corsHeaders });
    }

    // Load profile for evolution credentials
    const { data: profile } = await admin
      .from('profiles')
      .select('instance_name, api_key, base_url')
      .eq('id', userId)
      .single();

    if (!profile?.instance_name || !profile.api_key) {
      await admin.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
      return new Response(JSON.stringify({ error: 'Evolution credentials missing' }), { status: 400, headers: corsHeaders });
    }

    const baseUrl = (profile.base_url || 'https://api.automacaohelp.com.br').replace(/\/$/, '');
    const apiKey = profile.api_key;
    const instanceName = profile.instance_name;

    // Mark running
    await admin.from('broadcasts').update({ status: 'running' }).eq('id', broadcastId);

    // Spawn background task
    const task = (async () => {
      const messages: string[] = bc.messages || [];
      const contactIds: string[] = bc.contact_ids || [];
      const minS = bc.delay_min_seconds || 5;
      const maxS = bc.delay_max_seconds || 20;
      const startIdx = bc.current_index || 0;

      // Load contact details
      const { data: contacts } = await admin
        .from('contacts')
        .select('id, name, phone')
        .in('id', contactIds);
      const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

      const startedAt = Date.now();
      const MAX_RUN_MS = 25 * 60 * 1000; // 25 minutes safety

      for (let i = startIdx; i < contactIds.length; i++) {
        // Check status (pause/cancel)
        const { data: cur } = await admin.from('broadcasts').select('status').eq('id', broadcastId).single();
        if (!cur || cur.status !== 'running') break;
        if (Date.now() - startedAt > MAX_RUN_MS) break;

        const contact = contactMap.get(contactIds[i]);
        if (!contact) {
          await admin.from('broadcasts').update({ current_index: i + 1 }).eq('id', broadcastId);
          continue;
        }

        const text = messages[Math.floor(Math.random() * messages.length)] || '';
        const personalized = text.replace(/\{\{nome\}\}/gi, (contact.name || '').split(' ')[0] || '');

        try {
          const url = `${baseUrl}/message/sendText/${instanceName}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: apiKey },
            body: JSON.stringify({
              number: contact.phone.replace(/\D/g, ''),
              text: personalized,
              delay: 1200,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

          const messageId = json?.key?.id || json?.messageId || null;

          await admin.from('broadcast_logs').insert({
            broadcast_id: broadcastId,
            user_id: userId,
            contact_id: contact.id,
            contact_name: contact.name,
            phone: contact.phone,
            status: 'sent',
            message_text: personalized,
            message_id: messageId,
            sent_at: new Date().toISOString(),
          });

          const { data: latest } = await admin.from('broadcasts').select('sent_count').eq('id', broadcastId).single();
          await admin.from('broadcasts').update({
            sent_count: (latest?.sent_count || 0) + 1,
            current_index: i + 1,
          }).eq('id', broadcastId);
        } catch (e: any) {
          await admin.from('broadcast_logs').insert({
            broadcast_id: broadcastId,
            user_id: userId,
            contact_id: contact.id,
            contact_name: contact.name,
            phone: contact.phone,
            status: 'failed',
            message_text: personalized,
            error: String(e?.message || e),
          });
          const { data: latestF } = await admin.from('broadcasts').select('failed_count').eq('id', broadcastId).single();
          await admin.from('broadcasts').update({
            failed_count: (latestF?.failed_count || 0) + 1,
            current_index: i + 1,
          }).eq('id', broadcastId);
        }

        // Delay (skip last)
        if (i < contactIds.length - 1) {
          const waitMs = (minS + Math.random() * (maxS - minS)) * 1000;
          await sleep(waitMs);
        }
      }

      // Final status
      const { data: final } = await admin.from('broadcasts').select('current_index, status').eq('id', broadcastId).single();
      if (final && final.status === 'running' && final.current_index >= contactIds.length) {
        await admin.from('broadcasts').update({ status: 'completed' }).eq('id', broadcastId);
      }
    })();

    // @ts-ignore EdgeRuntime
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(task);
    } else {
      task.catch(console.error);
    }

    return new Response(JSON.stringify({ ok: true, started: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
