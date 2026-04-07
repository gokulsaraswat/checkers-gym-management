import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const missingConfigError = () => new Error('Supabase is not configured. Add your URL and publishable/anon key to .env first.');

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

export const fetchProfile = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      plan_id,
      is_active,
      member_since,
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
    `)
    .eq('id', userId)
    .maybeSingle();

  unwrap(error, 'Unable to load profile.');
  return data;
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
    .select(`
      id,
      email,
      full_name,
      role,
      plan_id,
      is_active,
      member_since,
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
    `)
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load members.');
  return data ?? [];
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

export const updateMember = async (memberId, changes) => {
  const client = ensureSupabase();

  const payload = {
    ...changes,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'plan_id') && payload.plan_id === '') {
    payload.plan_id = null;
  }

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', memberId)
    .select(`
      id,
      email,
      full_name,
      role,
      plan_id,
      is_active,
      member_since,
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
    `)
    .single();

  unwrap(error, 'Unable to update member.');
  return data;
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
