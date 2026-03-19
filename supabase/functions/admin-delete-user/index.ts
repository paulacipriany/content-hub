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
    console.log("admin-delete-user: Request received");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    console.log("vars check:", { 
      hasUrl: !!supabaseUrl, 
      hasAnonKey: !!supabaseAnonKey, 
      hasServiceRole: !!supabaseServiceRole 
    });

    if (!supabaseServiceRole) {
      throw new Error("Missing service role key in environment");
    }

    // Verify caller is admin
    const supabaseUser = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    console.log("admin-delete-user: Verifying user...");
    const { data: { user: caller }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      throw userError;
    }
    if (!caller) throw new Error("Unauthorized");

    console.log("admin-delete-user: Caller ID:", caller.id);

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRole
    );

    // Check caller is admin
    console.log("admin-delete-user: Checking admin role...");
    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    
    if (roleError) {
      console.error("RPC error:", roleError);
      throw roleError;
    }
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    console.log("admin-delete-user: Authorised. Proceeding to delete user:", user_id);

    // Manually delete public schema references first to avoid foreign key violations
    // if ON DELETE CASCADE is not set.
    console.log("admin-delete-user: Deleting public relations...");
    await adminClient.from('project_members').delete().eq('user_id', user_id);
    await adminClient.from('user_roles').delete().eq('user_id', user_id);
    await adminClient.from('profiles').delete().eq('user_id', user_id);

    // Now delete the user from auth.users
    console.log("admin-delete-user: Deleting auth user...");
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    
    if (error) {
      console.error("Delete user error:", error);
      throw error;
    }

    console.log("admin-delete-user: Deletion successful.");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-delete-user: CAUGHT ERROR:", e);
    return new Response(JSON.stringify({ error: e.stack || e.message || String(e) }), {
      status: 200, // Returning 200 so the frontend gets the JSON instead of masking with 500
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
