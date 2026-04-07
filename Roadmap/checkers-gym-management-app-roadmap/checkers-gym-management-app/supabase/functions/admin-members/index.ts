import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase function secrets are missing.' }, 500);
    }

    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();

    if (authError || !authData.user) {
      return json({ error: authError?.message || 'Unauthorized request.' }, 401);
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', callerId)
      .maybeSingle();

    if (callerProfileError) {
      return json({ error: callerProfileError.message }, 500);
    }

    if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
      return json({ error: 'Admin access required.' }, 403);
    }

    const { action, payload } = await req.json();

    if (action === 'create-user') {
      const email = payload?.email?.trim?.();
      const password = payload?.password;
      const fullName = payload?.fullName?.trim?.() || '';
      const planId = payload?.planId || null;
      const role = payload?.role === 'admin' ? 'admin' : 'member';

      if (!email || !password) {
        return json({ error: 'Email and password are required.' }, 400);
      }

      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError || !createdUser.user) {
        return json({ error: createError?.message || 'Unable to create auth user.' }, 400);
      }

      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({
          email,
          full_name: fullName || email.split('@')[0],
          role,
          plan_id: planId,
          is_active: true,
        })
        .eq('id', createdUser.user.id);

      if (profileUpdateError) {
        return json({ error: profileUpdateError.message }, 500);
      }

      return json({
        success: true,
        userId: createdUser.user.id,
      });
    }

    if (action === 'delete-user') {
      const userId = payload?.userId;

      if (!userId) {
        return json({ error: 'userId is required.' }, 400);
      }

      if (userId === callerId) {
        return json({ error: 'You cannot delete your own admin account from the app.' }, 400);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId, false);

      if (deleteError) {
        return json({ error: deleteError.message }, 400);
      }

      return json({
        success: true,
        userId,
      });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected function error.' }, 500);
  }
});
