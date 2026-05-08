// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizePhone(p: string) {
  return (p || '').replace(/\D/g, '');
}

function matchKeywords(text: string, matchType: string, keywords: string[]) {
  const t = (text || '').toLowerCase().trim();
  const ks = (keywords || []).map((k) => String(k).toLowerCase().trim()).filter(Boolean);
  if (!ks.length) return false;
  if (matchType === 'equals') return ks.some((k) => t === k);
  if (matchType === 'starts_with') return ks.some((k) => t.startsWith(k));
  if (matchType === 'regex') {
    return ks.some((k) => {
      try { return new RegExp(k, 'i').test(text || ''); } catch { return false; }
    });
  }
  // contains (default)
  return ks.some((k) => t.includes(k));
}

async function sendWhatsApp(baseUrl: string, instance: string, apiKey: string, phone: string, text: string) {
  const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Evolution send failed ${r.status}: ${body}`);
  }
  return r.json();
}

function interpolate(text: string, ctx: any) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx?.[k] ?? ''));
}

function findNextNode(edges: any[], sourceId: string, handle?: string) {
  const e = edges.find((ed) => ed.source === sourceId && (handle ? ed.sourceHandle === handle : true));
  return e?.target || null;
}

async function executeRun(admin: any, runId: string) {
  // load run
  const { data: run } = await admin.from('flow_runs').select('*').eq('id', runId).maybeSingle();
  if (!run) return;
  if (['completed', 'failed', 'cancelled'].includes(run.status)) return;

  const { data: flow } = await admin.from('flows').select('*').eq('id', run.flow_id).maybeSingle();
  if (!flow) {
    await admin.from('flow_runs').update({ status: 'failed', error: 'flow not found' }).eq('id', runId);
    return;
  }
  const { data: profile } = await admin.from('profiles').select('instance_name, api_key, base_url').eq('id', run.user_id).maybeSingle();
  if (!profile?.instance_name || !profile?.api_key) {
    await admin.from('flow_runs').update({ status: 'failed', error: 'evolution credentials missing' }).eq('id', runId);
    return;
  }
  const baseUrl = profile.base_url || 'https://api.automacaohelp.com.br';

  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const findNode = (id: string) => nodes.find((n: any) => n.id === id);

  let currentId = run.current_node_id;
  let context = run.context || { name: run.contact_name, phone: run.contact_phone };
  let lastReplyText = run.last_message_text || '';
  let safety = 0;

  while (currentId && safety++ < 50) {
    const node = findNode(currentId);
    if (!node) {
      await admin.from('flow_runs').update({ status: 'completed', current_node_id: null }).eq('id', runId);
      return;
    }
    const data = node.data || {};

    if (node.type === 'trigger') {
      currentId = findNextNode(edges, node.id);
      continue;
    }

    if (node.type === 'send_message') {
      const text = interpolate(data.text || '', context);
      try {
        await sendWhatsApp(baseUrl, profile.instance_name, profile.api_key, run.contact_phone, text);
      } catch (e: any) {
        await admin.from('flow_runs').update({ status: 'failed', error: String(e.message || e), current_node_id: currentId }).eq('id', runId);
        return;
      }
      currentId = findNextNode(edges, node.id);
      continue;
    }

    if (node.type === 'delay') {
      const seconds = Number(data.seconds || 0);
      const next = findNextNode(edges, node.id);
      const scheduledAt = new Date(Date.now() + seconds * 1000).toISOString();
      await admin.from('flow_runs').update({
        status: 'scheduled',
        current_node_id: next,
        scheduled_at: scheduledAt,
      }).eq('id', runId);
      return;
    }

    if (node.type === 'wait_reply') {
      const next = findNextNode(edges, node.id);
      const timeoutMin = Number(data.timeout_minutes || 60);
      const scheduledAt = new Date(Date.now() + timeoutMin * 60_000).toISOString();
      await admin.from('flow_runs').update({
        status: 'waiting_input',
        current_node_id: next,
        scheduled_at: scheduledAt,
      }).eq('id', runId);
      return;
    }

    if (node.type === 'condition') {
      const matched = matchKeywords(lastReplyText, data.match_type || 'contains', data.keywords || []);
      currentId = findNextNode(edges, node.id, matched ? 'match' : 'nomatch');
      continue;
    }

    if (node.type === 'crm_action') {
      try {
        if (data.action === 'add_tag' && data.value) {
          // add tag to contacts with matching phone
          const { data: cs } = await admin.from('contacts').select('id, tags').eq('user_id', run.user_id);
          const tail = run.contact_phone.slice(-8);
          const target = (cs || []).find((c: any) => normalizePhone(c.phone || '').endsWith(tail));
          if (target) {
            const tags = Array.from(new Set([...(target.tags || []), data.value]));
            await admin.from('contacts').update({ tags }).eq('id', target.id);
          }
        } else if (data.action === 'move_deal' && data.value) {
          const tail = run.contact_phone.slice(-8);
          const { data: ds } = await admin.from('deals').select('id, phone').eq('user_id', run.user_id);
          const target = (ds || []).find((d: any) => normalizePhone(d.phone || '').endsWith(tail));
          if (target) {
            await admin.from('deals').update({ status: data.value }).eq('id', target.id);
          }
        } else if (data.action === 'create_followup' && data.value) {
          const hours = Number(data.delay_hours) > 0 ? Number(data.delay_hours) : 24;
          await admin.from('follow_up_tasks').insert({
            user_id: run.user_id,
            contact_name: run.contact_name || run.contact_phone,
            contact_id: run.contact_phone,
            type: 'whatsapp',
            status: 'pending',
            message: interpolate(data.value, context),
            scheduled_at: new Date(Date.now() + hours * 3600_000).toISOString(),
          });
        }
      } catch (e) {
        console.error('crm_action error', e);
      }
      currentId = findNextNode(edges, node.id);
      continue;
    }

    // unknown node
    currentId = findNextNode(edges, node.id);
  }

  await admin.from('flow_runs').update({ status: 'completed', current_node_id: null }).eq('id', runId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'process_scheduled';

    // ============ TRIGGER (called from frontend when a message comes in) ============
    if (action === 'trigger') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const userId = userData.user.id;
      const phone = normalizePhone(body.phone || '');
      const messageText = String(body.message || '');
      const fromBroadcastReply = !!body.from_broadcast_reply;
      const broadcastFlowId: string | null = body.broadcast_flow_id || null;
      const contactName = body.contact_name || phone;
      if (!phone) return new Response(JSON.stringify({ error: 'phone required' }), { status: 400, headers: corsHeaders });

      // 1) Continue existing waiting_input runs first
      const { data: waiting } = await admin
        .from('flow_runs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting_input');
      const tail = phone.slice(-8);
      const continued: string[] = [];
      for (const r of waiting || []) {
        if (normalizePhone(r.contact_phone).endsWith(tail)) {
          await admin.from('flow_runs').update({
            status: 'pending',
            last_message_text: messageText,
            last_event_at: new Date().toISOString(),
          }).eq('id', r.id);
          continued.push(r.id);
        }
      }

      // 2) Match flows: if broadcast has an attributed flow, use it directly; otherwise match enabled flows by trigger
      let flowsToStart: any[] = [];
      if (broadcastFlowId) {
        const { data: f } = await admin.from('flows').select('*').eq('id', broadcastFlowId).eq('user_id', userId).maybeSingle();
        if (f) flowsToStart = [f];
      } else {
        const { data: flows } = await admin.from('flows').select('*').eq('user_id', userId).eq('enabled', true);
        for (const f of flows || []) {
          const triggers = (f.triggers as any[]) || [];
          let triggered = false;
          for (const t of triggers) {
            if (t.type === 'broadcast_reply' && fromBroadcastReply) { triggered = true; break; }
            if (t.type === 'keyword' && matchKeywords(messageText, t.match_type || 'contains', t.keywords || [])) { triggered = true; break; }
          }
          if (triggered) flowsToStart.push(f);
        }
      }
      const newRunIds: string[] = [];
      for (const f of flowsToStart) {
        // Avoid duplicate active run for same flow+contact
        const { data: existing } = await admin
          .from('flow_runs')
          .select('id, status')
          .eq('flow_id', f.id)
          .eq('contact_phone', phone)
          .in('status', ['pending', 'waiting_input', 'scheduled'])
          .maybeSingle();
        if (existing) continue;
        const { data: ins } = await admin.from('flow_runs').insert({
          flow_id: f.id,
          user_id: userId,
          contact_phone: phone,
          contact_name: contactName,
          current_node_id: f.start_node_id,
          status: 'pending',
          last_message_text: messageText,
          last_event_at: new Date().toISOString(),
          context: { name: contactName, phone },
        }).select('id').single();
        if (ins) newRunIds.push(ins.id);
      }

      // Execute everything we touched
      for (const id of [...continued, ...newRunIds]) {
        await executeRun(admin, id).catch((e) => console.error('exec error', id, e));
      }
      return new Response(JSON.stringify({ continued: continued.length, started: newRunIds.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ SCHEDULED PROCESSOR (cron) ============
    if (action === 'process_scheduled') {
      const now = new Date().toISOString();
      const { data: due } = await admin
        .from('flow_runs')
        .select('id, status, scheduled_at')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now)
        .limit(50);
      // also expire waiting_input timeouts
      const { data: expired } = await admin
        .from('flow_runs')
        .select('id')
        .eq('status', 'waiting_input')
        .lte('scheduled_at', now)
        .limit(50);
      for (const r of expired || []) {
        await admin.from('flow_runs').update({ status: 'completed', current_node_id: null }).eq('id', r.id);
      }
      let processed = 0;
      for (const r of due || []) {
        await admin.from('flow_runs').update({ status: 'pending' }).eq('id', r.id);
        await executeRun(admin, r.id).catch((e) => console.error('exec error', r.id, e));
        processed++;
      }
      return new Response(JSON.stringify({ processed, expired: (expired || []).length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: corsHeaders });
  }
});
