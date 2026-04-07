
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { CURRENT_LIABILITY_WAIVER_VERSION } from '../features/members/memberLifecycle';

const missingConfigError = () => new Error('Supabase is not configured. Add your URL and publishable/anon key to .env first.');

const profileSelect = `
  id,
  email,
  full_name,
  phone,
  date_of_birth,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  fitness_goal,
  role,
  plan_id,
  is_active,
  member_since,
  membership_status,
  membership_start_date,
  membership_end_date,
  next_billing_date,
  current_waiver_version,
  waiver_signed_at,
  created_at,
  updated_at,
  plan:membership_plans (
    id,
    name,
    description,
    price,
    billing_cycle,
    duration_weeks,
    is_active
  )
`;

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw missingConfigError();
  }

  return supabase;
};

const unwrap = (error, fallbackMessage) => {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
};

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const pickFirstDefined = (value, keys) => keys.reduce((accumulator, key) => {
  if (accumulator !== undefined) {
    return accumulator;
  }

  if (hasOwn(value, key)) {
    return value[key];
  }

  return undefined;
}, undefined);

const normaliseOptionalText = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const nextValue = String(value ?? '').trim();
  return nextValue || null;
};

const normaliseOptionalDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return value || null;
};

const normaliseOptionalNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    throw new Error('Invalid numeric value.');
  }

  return numericValue;
};

const normaliseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const buildProfilePayload = (changes = {}, options = {}) => {
  const {
    includeAdminFields = false,
    requireFullName = false,
  } = options;

  const payload = {};

  const fullName = pickFirstDefined(changes, ['fullName', 'full_name']);

  if (fullName !== undefined) {
    const nextValue = String(fullName ?? '').trim();

    if (requireFullName && !nextValue) {
      throw new Error('Full name is required.');
    }

    payload.full_name = nextValue || null;
  } else if (requireFullName) {
    throw new Error('Full name is required.');
  }

  const textFieldMap = [
    ['phone', ['phone']],
    ['address', ['address']],
    ['emergency_contact_name', ['emergencyContactName', 'emergency_contact_name']],
    ['emergency_contact_phone', ['emergencyContactPhone', 'emergency_contact_phone']],
    ['fitness_goal', ['fitnessGoal', 'fitness_goal']],
  ];

  textFieldMap.forEach(([targetKey, sourceKeys]) => {
    const nextValue = normaliseOptionalText(pickFirstDefined(changes, sourceKeys));

    if (nextValue !== undefined) {
      payload[targetKey] = nextValue;
    }
  });

  const dateFieldMap = [
    ['date_of_birth', ['dateOfBirth', 'date_of_birth']],
    ['membership_start_date', ['membershipStartDate', 'membership_start_date']],
    ['membership_end_date', ['membershipEndDate', 'membership_end_date']],
    ['next_billing_date', ['nextBillingDate', 'next_billing_date']],
  ];

  dateFieldMap.forEach(([targetKey, sourceKeys]) => {
    const nextValue = normaliseOptionalDate(pickFirstDefined(changes, sourceKeys));

    if (nextValue !== undefined) {
      payload[targetKey] = nextValue;
    }
  });

  if (includeAdminFields) {
    const role = pickFirstDefined(changes, ['role']);
    const membershipStatus = pickFirstDefined(changes, ['membershipStatus', 'membership_status']);
    const planId = pickFirstDefined(changes, ['planId', 'plan_id']);
    const isActive = pickFirstDefined(changes, ['isActive', 'is_active']);

    if (role !== undefined) {
      payload.role = role;
    }

    if (membershipStatus !== undefined) {
      payload.membership_status = membershipStatus;
    }

    if (planId !== undefined) {
      payload.plan_id = planId || null;
    }

    if (isActive !== undefined) {
      payload.is_active = normaliseBoolean(isActive);
    }
  }

  return payload;
};

export const fetchProfile = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(profileSelect)
    .eq('id', userId)
    .maybeSingle();

  unwrap(error, 'Unable to load profile.');
  return data;
};

export const fetchMemberById = async (memberId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(profileSelect)
    .eq('id', memberId)
    .maybeSingle();

  unwrap(error, 'Unable to load member.');
  return data;
};

export const updateOwnProfile = async (userId, changes) => {
  const client = ensureSupabase();
  const payload = buildProfilePayload(changes, { requireFullName: true });

  const hasExtendedFields = [
    'phone',
    'address',
    'emergency_contact_name',
    'emergency_contact_phone',
    'fitness_goal',
    'date_of_birth',
  ].some((field) => payload[field] !== undefined);

  if (hasExtendedFields) {
    const { error } = await client.rpc('update_my_member_profile', {
      p_full_name: payload.full_name,
      p_phone: payload.phone ?? null,
      p_date_of_birth: payload.date_of_birth ?? null,
      p_address: payload.address ?? null,
      p_emergency_contact_name: payload.emergency_contact_name ?? null,
      p_emergency_contact_phone: payload.emergency_contact_phone ?? null,
      p_fitness_goal: payload.fitness_goal ?? null,
    });

    unwrap(error, 'Unable to update your membership profile.');
    return fetchProfile(userId);
  }

  const { error } = await client.rpc('update_my_profile', {
    p_full_name: payload.full_name,
  });

  unwrap(error, 'Unable to update your profile.');
  return fetchProfile(userId);
};

export const fetchAvailablePlans = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('membership_plans')
    .select('*')
    .order('price', { ascending: true });

  unwrap(error, 'Unable to load membership plans.');
  return data ?? [];
};

export const fetchMembers = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(profileSelect)
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load members.');
  return data ?? [];
};

export const fetchMembershipStatusHistory = async (memberId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('membership_status_history')
    .select('*')
    .eq('profile_id', memberId)
    .order('effective_on', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load membership history.');
  return data ?? [];
};

export const fetchMemberWaivers = async (memberId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('member_waivers')
    .select('*')
    .eq('profile_id', memberId)
    .order('accepted_at', { ascending: false });

  unwrap(error, 'Unable to load member waivers.');
  return data ?? [];
};

export const signCurrentLiabilityWaiver = async (version = CURRENT_LIABILITY_WAIVER_VERSION) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('sign_current_liability_waiver', {
    p_version: version,
  });

  unwrap(error, 'Unable to record your waiver acknowledgement.');
  return data;
};

export const recordMemberWaiver = async (memberId, waiver = {}) => {
  const client = ensureSupabase();

  const payload = {
    profile_id: memberId,
    waiver_type: waiver.waiverType || 'liability',
    version: String(waiver.version || CURRENT_LIABILITY_WAIVER_VERSION).trim(),
    recorded_source: waiver.recordedSource || 'admin_panel',
    notes: normaliseOptionalText(waiver.notes) ?? null,
  };

  if (!payload.version) {
    throw new Error('Waiver version is required.');
  }

  if (waiver.acceptedAt) {
    payload.accepted_at = waiver.acceptedAt;
  }

  const { data, error } = await client
    .from('member_waivers')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to record waiver acknowledgement.');
  return data;
};

export const createOrUpdatePlan = async (plan) => {
  const client = ensureSupabase();

  const payload = {
    name: plan.name?.trim(),
    description: plan.description?.trim() || '',
    price: Number(plan.price || 0),
    billing_cycle: plan.billing_cycle,
    duration_weeks: Number(plan.duration_weeks || 4),
    is_active: Boolean(plan.is_active),
  };

  if (!payload.name) {
    throw new Error('Plan name is required.');
  }

  if (plan.id) {
    const { data, error } = await client
      .from('membership_plans')
      .update(payload)
      .eq('id', plan.id)
      .select()
      .single();

    unwrap(error, 'Unable to update plan.');
    return data;
  }

  const { data, error } = await client
    .from('membership_plans')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to create plan.');
  return data;
};

export const deletePlan = async (planId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('membership_plans')
    .delete()
    .eq('id', planId);

  unwrap(error, 'Unable to delete plan.');
};

export const updateMember = async (memberId, changes, options = {}) => {
  const client = ensureSupabase();
  const payload = buildProfilePayload(changes, { includeAdminFields: true });
  const changeReason = normaliseOptionalText(
    options.changeReason ?? changes.changeReason ?? null,
  ) ?? null;

  const { error } = await client.rpc('admin_update_member_record', {
    p_member_id: memberId,
    p_changes: payload,
    p_change_reason: changeReason,
  });

  unwrap(error, 'Unable to update member.');
  return fetchMemberById(memberId);
};

export const fetchWorkouts = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load workouts.');
  return data ?? [];
};

export const saveWorkout = async (userId, workout) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    title: workout.title?.trim(),
    workout_date: workout.workout_date,
    status: workout.status || 'completed',
    notes: workout.notes?.trim() || '',
    entries: (workout.entries || []).map((entry) => ({
      exercise_name: entry.exercise_name?.trim(),
      sets: entry.sets === '' || entry.sets === null || entry.sets === undefined ? null : Number(entry.sets),
      reps: entry.reps === '' || entry.reps === null || entry.reps === undefined ? null : Number(entry.reps),
      weight: entry.weight === '' || entry.weight === null || entry.weight === undefined ? null : Number(entry.weight),
    })).filter((entry) => entry.exercise_name),
  };

  if (!payload.title) {
    throw new Error('Workout title is required.');
  }

  if (!payload.workout_date) {
    throw new Error('Workout date is required.');
  }

  if (!payload.entries.length) {
    throw new Error('Add at least one exercise entry to the workout.');
  }

  if (workout.id) {
    const { data, error } = await client
      .from('workouts')
      .update(payload)
      .eq('id', workout.id)
      .select()
      .single();

    unwrap(error, 'Unable to update workout.');
    return data;
  }

  const { data, error } = await client
    .from('workouts')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to create workout.');
  return data;
};

export const deleteWorkout = async (workoutId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('workouts')
    .delete()
    .eq('id', workoutId);

  unwrap(error, 'Unable to delete workout.');
};

export const fetchProgressCheckpoints = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('progress_checkpoints')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_on', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load progress snapshots.');
  return data ?? [];
};

export const saveProgressCheckpoint = async (userId, checkpoint = {}) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    recorded_on: checkpoint.recorded_on || new Date().toISOString().slice(0, 10),
    weight_kg: normaliseOptionalNumber(checkpoint.weight_kg),
    body_fat_percent: normaliseOptionalNumber(checkpoint.body_fat_percent),
    skeletal_muscle_percent: normaliseOptionalNumber(checkpoint.skeletal_muscle_percent),
    resting_heart_rate: (() => {
      const value = normaliseOptionalNumber(checkpoint.resting_heart_rate);
      return value === null || value === undefined ? value : Math.round(value);
    })(),
    notes: normaliseOptionalText(checkpoint.notes) ?? null,
  };

  const hasUsefulValue = [
    payload.weight_kg,
    payload.body_fat_percent,
    payload.skeletal_muscle_percent,
    payload.resting_heart_rate,
    payload.notes,
  ].some((value) => value !== null && value !== undefined);

  if (!hasUsefulValue) {
    throw new Error('Add at least one metric or note to save a progress snapshot.');
  }

  if (checkpoint.id) {
    const { data, error } = await client
      .from('progress_checkpoints')
      .update(payload)
      .eq('id', checkpoint.id)
      .select()
      .single();

    unwrap(error, 'Unable to update progress snapshot.');
    return data;
  }

  const { data, error } = await client
    .from('progress_checkpoints')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to save progress snapshot.');
  return data;
};

export const deleteProgressCheckpoint = async (checkpointId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('progress_checkpoints')
    .delete()
    .eq('id', checkpointId);

  unwrap(error, 'Unable to delete progress snapshot.');
};

export const fetchUpcomingClassBookings = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('class_bookings')
    .select(`
      id,
      booking_status,
      notes,
      created_at,
      class_session:class_sessions (
        id,
        title,
        description,
        coach_name,
        room_name,
        starts_at,
        ends_at,
        capacity,
        is_active
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load upcoming class bookings.');
  return (data ?? []).filter((booking) => booking?.class_session);
};

export const fetchMemberNotes = async (memberId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('member_notes')
    .select('*')
    .eq('profile_id', memberId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load member notes.');
  return data ?? [];
};

export const createMemberNote = async (memberId, note, options = {}) => {
  const client = ensureSupabase();
  const trimmedNote = String(note ?? '').trim();

  if (!trimmedNote) {
    throw new Error('Note cannot be empty.');
  }

  const { data, error } = await client.rpc('add_member_note', {
    p_member_id: memberId,
    p_note: trimmedNote,
    p_is_pinned: Boolean(options.isPinned),
    p_visibility: options.visibility || 'staff',
  });

  unwrap(error, 'Unable to save member note.');
  return data;
};

export const deleteMemberNote = async (noteId) => {
  const client = ensureSupabase();
  const { error } = await client.rpc('delete_member_note', {
    p_note_id: noteId,
  });

  unwrap(error, 'Unable to delete member note.');
};

export const fetchMemberAttendanceVisits = async (memberId, limit = 20) => {
  const client = ensureSupabase();
  let query = client
    .from('attendance_visits')
    .select('*')
    .eq('profile_id', memberId)
    .order('checked_in_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load attendance history.');
  return data ?? [];
};

export const recordSelfCheckIn = async (options = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('record_self_check_in', {
    p_location_label: normaliseOptionalText(options.locationLabel) ?? null,
    p_notes: normaliseOptionalText(options.notes) ?? null,
  });

  unwrap(error, 'Unable to check in.');
  return data;
};

export const recordSelfCheckOut = async (options = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('record_self_check_out', {
    p_notes: normaliseOptionalText(options.notes) ?? null,
  });

  unwrap(error, 'Unable to check out.');
  return data;
};

export const searchMembersForAttendance = async (query, limit = 25) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('search_members_for_attendance', {
    p_query: normaliseOptionalText(query) ?? null,
    p_limit: limit,
  });

  unwrap(error, 'Unable to search the member roster.');
  return data ?? [];
};

export const fetchStaffAttendanceVisits = async ({
  visitDate = todayIsoDate(),
  openOnly = false,
  limit = 50,
  memberId = null,
} = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_staff_attendance_visits', {
    p_visit_date: visitDate || null,
    p_open_only: openOnly,
    p_limit: limit,
    p_member_id: memberId,
  });

  unwrap(error, 'Unable to load attendance activity.');
  return data ?? [];
};

export const recordStaffCheckIn = async (memberId, options = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('record_staff_check_in', {
    p_member_id: memberId,
    p_location_label: normaliseOptionalText(options.locationLabel) ?? null,
    p_notes: normaliseOptionalText(options.notes) ?? null,
    p_source: options.source || 'staff_desk',
  });

  unwrap(error, 'Unable to check this member in.');
  return data;
};

export const recordStaffCheckOut = async (memberId, options = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('record_staff_check_out', {
    p_member_id: memberId,
    p_visit_id: options.visitId || null,
    p_notes: normaliseOptionalText(options.notes) ?? null,
    p_source: options.source || 'staff_desk',
  });

  unwrap(error, 'Unable to check this member out.');
  return data;
};

export const fetchAdminActivity = async ({ memberId = null, limit = 12 } = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (memberId) {
    query = query.eq('target_profile_id', memberId);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load admin activity.');
  return data ?? [];
};

const parseFunctionError = async (error) => {
  if (!error) {
    return null;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  try {
    const context = await error.context?.json?.();
    return context?.error || context?.message || 'The admin function returned an error.';
  } catch (contextError) {
    return 'The admin function returned an error.';
  }
};

export const invokeAdminMemberAction = async (action, payload) => {
  const client = ensureSupabase();

  const { data, error } = await client.functions.invoke('admin-members', {
    body: {
      action,
      payload,
    },
  });

  if (error) {
    const parsedError = await parseFunctionError(error);
    throw new Error(parsedError || 'Unable to complete the admin action.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};
