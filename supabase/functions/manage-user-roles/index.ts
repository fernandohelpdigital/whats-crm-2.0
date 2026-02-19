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

    const { action, user_id, instance_name, api_key, base_url, flags } = await req.json();

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

    if (action === "delete_user") {
      if (!user_id) throw new Error("user_id required");
      if (user_id === userId) {
        return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch profile to get instance_name before deleting
      const { data: userProfile } = await adminClient
        .from("profiles")
        .select("instance_name, base_url, api_key")
        .eq("id", user_id)
        .single();

      // Delete instance from Evolution API if exists
      if (userProfile?.instance_name) {
        const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY") || userProfile.api_key;
        const evolutionApiUrl = userProfile.base_url || Deno.env.get("EVOLUTION_API_URL") || "https://api.automacaohelp.com.br";
        try {
          const delRes = await fetch(`${evolutionApiUrl}/instance/delete/${userProfile.instance_name}`, {
            method: "DELETE",
            headers: { apikey: evolutionApiKey },
          });
          if (!delRes.ok) {
            console.error("Evolution API delete instance error:", await delRes.text());
          } else {
            console.log("Evolution instance deleted:", userProfile.instance_name);
          }
        } catch (evoErr: any) {
          console.error("Failed to delete Evolution instance:", evoErr.message);
        }
      }

      // Delete related data
      await adminClient.from("user_feature_flags").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("id", user_id);
      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) throw deleteError;
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

    if (action === "list_user_flags") {
      const { data, error } = await adminClient.from("user_feature_flags").select("*");
      if (error) throw error;
      return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "save_user_flags") {
      if (!user_id) throw new Error("user_id required");
      const flagValues = flags || {};
      
      // Upsert user feature flags
      const { data: existing } = await adminClient
        .from("user_feature_flags")
        .select("id")
        .eq("user_id", user_id)
        .single();
      
      if (existing) {
        const { error } = await adminClient
          .from("user_feature_flags")
          .update(flagValues)
          .eq("user_id", user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data, error } = await adminClient
          .from("user_feature_flags")
          .insert({ user_id, ...flagValues })
          .select("id")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: data?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
