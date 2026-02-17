import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: authError } = await anonClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, user_id, instance_name, api_key, base_url } = await req.json();

    if (action === "list") {
      const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const { data: allRoles } = await adminClient.from("user_roles").select("*");
      const { data: allProfiles } = await adminClient.from("profiles").select("*");

      const rolesMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const profilesMap: Record<string, any> = {};
      (allProfiles || []).forEach((p: any) => {
        profilesMap[p.id] = p;
      });

      const result = users.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        display_name: profilesMap[u.id]?.display_name || u.email,
        instance_name: profilesMap[u.id]?.instance_name || null,
        base_url: profilesMap[u.id]?.base_url || null,
        roles: rolesMap[u.id] || ["user"],
      }));

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_instances") {
      const apiBaseUrl = base_url || "https://api.automacaohelp.com.br";
      // Find any profile with an api_key to use for fetching instances
      const { data: profilesWithKey } = await adminClient
        .from("profiles")
        .select("api_key")
        .not("api_key", "is", null)
        .limit(1);
      
      const globalApiKey = api_key || profilesWithKey?.[0]?.api_key;
      if (!globalApiKey) {
        return new Response(JSON.stringify({ error: "Nenhuma API Key configurada. Configure a API Key de pelo menos um usuário." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const instancesRes = await fetch(`${apiBaseUrl}/instance/fetchInstances`, {
        headers: { apikey: globalApiKey },
      });
      if (!instancesRes.ok) {
        const errBody = await instancesRes.text();
        return new Response(JSON.stringify({ error: `Evolution API error: ${instancesRes.status}`, details: errBody }), { status: instancesRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const instancesData = await instancesRes.json();
      return new Response(JSON.stringify(instancesData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "promote") {
      if (!user_id) throw new Error("user_id required");
      await adminClient.from("user_roles").upsert(
        { user_id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "demote") {
      if (!user_id) throw new Error("user_id required");
      if (user_id === userId) {
        return new Response(JSON.stringify({ error: "Você não pode remover seu próprio acesso admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      await adminClient.from("user_roles").upsert(
        { user_id, role: "user" },
        { onConflict: "user_id,role" }
      );
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "assign_instance") {
      if (!user_id) throw new Error("user_id required");
      const updateData: any = {};
      if (instance_name !== undefined) updateData.instance_name = instance_name;
      if (api_key !== undefined) updateData.api_key = api_key;
      if (base_url !== undefined) updateData.base_url = base_url;
      
      const { error } = await adminClient.from("profiles").update(updateData).eq("id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
