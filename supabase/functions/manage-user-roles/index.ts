import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { action, user_id } = await req.json();

    if (action === "list") {
      // List all users with profiles and roles
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
        roles: rolesMap[u.id] || ["user"],
      }));

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (user_id === user.id) {
        return new Response(JSON.stringify({ error: "Você não pode remover seu próprio acesso admin" }), { status: 400, headers: corsHeaders });
      }
      await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      // Ensure user role exists
      await adminClient.from("user_roles").upsert(
        { user_id, role: "user" },
        { onConflict: "user_id,role" }
      );
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
