import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ALLOWED_APP_ROLES = new Set(['member', 'staff', 'admin']);
const ALLOWED_MEMBERSHIP_STATUSES = new Set(['trial', 'active', 'suspended', 'expired', 'cancelled']);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const safeTrim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const isIsoDateString = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const addDays = (dateValue: string, days: number) => {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const recordActivity = async (
  userClient: ReturnType<typeof createClient>,
  targetProfileId: string,
  actionType: string,
  actionSummary: string,
  metadata: Record<string, unknown> = {},
) => {
  try {
    await userClient.rpc('log_admin_activity', {
      p_target_profile_id: targetProfileId,
      p_action_type: actionType,
      p_action_summary: actionSummary,
      p_metadata: metadata,
    });
  } catch (error) {
    console.error('Unable to record admin activity', error);
  }
};

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
      .select('role, is_active, full_name, email')
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
      const email = safeTrim(payload?.email);
      const password = payload?.password;
      const fullName = safeTrim(payload?.fullName);
      const phone = safeTrim(payload?.phone);
      const planId = payload?.planId || null;
      const requestedRole = safeTrim(payload?.role);
      const role = ALLOWED_APP_ROLES.has(requestedRole) ? requestedRole : 'member';
      const isActive = payload?.isActive !== false;

      if (!email || !password) {
        return json({ error: 'Email and password are required.' }, 400);
      }

      let planDurationWeeks: number | null = null;

      if (planId) {
        const { data: planRow, error: planError } = await adminClient
          .from('membership_plans')
          .select('duration_weeks')
          .eq('id', planId)
          .maybeSingle();

        if (planError) {
          return json({ error: planError.message }, 500);
        }

        if (!planRow) {
          return json({ error: 'The selected membership plan was not found.' }, 400);
        }

        planDurationWeeks = Number(planRow.duration_weeks || 0) || 4;
      }

      const todayIso = getTodayIso();
      const requestedMembershipStatus = safeTrim(payload?.membershipStatus);
      const membershipStatus = ALLOWED_MEMBERSHIP_STATUSES.has(requestedMembershipStatus)
        ? requestedMembershipStatus
        : (planId ? 'active' : 'trial');
      const membershipStartDate = isIsoDateString(payload?.membershipStartDate)
        ? payload.membershipStartDate
        : todayIso;

      let membershipEndDate = isIsoDateString(payload?.membershipEndDate)
        ? payload.membershipEndDate
        : null;
      let nextBillingDate = isIsoDateString(payload?.nextBillingDate)
        ? payload.nextBillingDate
        : null;

      if (!membershipEndDate && planDurationWeeks) {
        membershipEndDate = addDays(membershipStartDate, planDurationWeeks * 7);
      }

      if (!membershipEndDate && membershipStatus === 'trial') {
        membershipEndDate = addDays(membershipStartDate, 7);
      }

      if (!nextBillingDate && planDurationWeeks) {
        nextBillingDate = membershipEndDate;
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
          phone: phone || null,
          role,
          plan_id: planId,
          is_active: isActive,
          membership_status: membershipStatus,
          membership_start_date: membershipStartDate,
          membership_end_date: membershipEndDate,
          next_billing_date: nextBillingDate,
        })
        .eq('id', createdUser.user.id);

      if (profileUpdateError) {
        return json({ error: profileUpdateError.message }, 500);
      }

      await recordActivity(
        userClient,
        createdUser.user.id,
        'member.created',
        `Created ${role} account`,
        {
          email,
          role,
          plan_id: planId,
          membership_status: membershipStatus,
          is_active: isActive,
        },
      );

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

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle();

      await recordActivity(
        userClient,
        userId,
        'member.deleted',
        `Deleted member account`,
        {
          email: targetProfile?.email || null,
          full_name: targetProfile?.full_name || null,
        },
      );

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId, false);

      if (deleteError) {
        return json({ error: deleteError.message }, 400);
      }

      return json({ success: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    }, 500);
  }
});
