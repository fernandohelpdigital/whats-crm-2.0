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
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY")!;
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api.automacaohelp.com.br";

    const { user_id, display_name, token: instanceToken } = await req.json();

    if (!user_id || !display_name || !instanceToken) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, display_name, token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user exists and doesn't already have an instance
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, instance_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.instance_name) {
      return new Response(JSON.stringify({ success: true, instance_name: profile.instance_name, message: "Instance already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize instance name
    const sanitized = (display_name || "user")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const instanceName = `${sanitized}_${Date.now().toString(36)}`;

    // Create instance on Evolution API
    const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
      body: JSON.stringify({ instanceName, token: instanceToken, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Evolution API create error:", errText);
      return new Response(
        JSON.stringify({ error: "Falha ao criar instância na Evolution API", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Instance created:", instanceName);

    // Update user profile
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ instance_name: instanceName, api_key: instanceToken, base_url: evolutionApiUrl })
      .eq("id", user_id);

    if (updateError) {
      console.error("Profile update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Instância criada, mas falha ao atualizar perfil", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, instance_name: instanceName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
