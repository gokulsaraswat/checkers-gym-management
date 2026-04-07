
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

const classSessionSelect = `
  id,
  title,
  description,
  session_type,
  coach_name,
  trainer_id,
  trainer_name,
  room_name,
  branch_name,
  equipment_notes,
  starts_at,
  ends_at,
  capacity,
  is_active,
  visibility,
  schedule_status,
  recurrence_group_id,
  recurrence_rule,
  created_at,
  updated_at
`;

const memberClassBookingSelect = `
  id,
  class_session_id,
  user_id,
  booking_status,
  waitlist_position,
  booking_source,
  notes,
  cancel_reason,
  cancelled_at,
  status_changed_at,
  created_at,
  updated_at,
  class_session:class_sessions (
    id,
    title,
    description,
    session_type,
    coach_name,
    trainer_name,
    room_name,
    branch_name,
    equipment_notes,
    starts_at,
    ends_at,
    capacity,
    is_active,
    visibility,
    schedule_status
  )
`;

const exerciseLibrarySelect = `
  id,
  name,
  muscle_group,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  video_url,
  is_active,
  created_at,
  updated_at
`;

const workoutProgramSelect = `
  id,
  name,
  description,
  goal,
  difficulty,
  duration_weeks,
  sessions_per_week,
  status,
  created_by,
  created_at,
  updated_at,
  days:workout_program_days (
    id,
    program_id,
    day_index,
    title,
    focus_area,
    notes,
    target_duration_minutes,
    created_at,
    updated_at,
    exercises:workout_program_day_exercises (
      id,
      program_day_id,
      exercise_library_id,
      order_index,
      exercise_name,
      prescribed_sets,
      prescribed_reps,
      prescribed_weight,
      rest_seconds,
      tempo,
      trainer_notes,
      is_optional,
      created_at,
      updated_at,
      library_exercise:exercise_library (
        id,
        name,
        muscle_group,
        equipment,
        movement_pattern,
        difficulty
      )
    )
  )
`;

const workoutAssignmentSelect = `
  id,
  member_id,
  program_id,
  assigned_by,
  assignment_status,
  start_date,
  end_date,
  focus_goal,
  notes,
  created_at,
  updated_at,
  member:profiles!member_workout_assignments_member_id_fkey (
    id,
    email,
    full_name,
    phone,
    membership_status,
    is_active,
    role
  ),
  program:workout_programs (
    id,
    name,
    description,
    goal,
    difficulty,
    duration_weeks,
    sessions_per_week,
    status,
    created_at,
    updated_at,
    days:workout_program_days (
      id,
      program_id,
      day_index,
      title,
      focus_area,
      notes,
      target_duration_minutes,
      created_at,
      updated_at,
      exercises:workout_program_day_exercises (
        id,
        program_day_id,
        exercise_library_id,
        order_index,
        exercise_name,
        prescribed_sets,
        prescribed_reps,
        prescribed_weight,
        rest_seconds,
        tempo,
        trainer_notes,
        is_optional,
        created_at,
        updated_at,
        library_exercise:exercise_library (
          id,
          name,
          muscle_group,
          equipment,
          movement_pattern,
          difficulty
        )
      )
    )
  )
`;

const nutritionTemplateSelect = `
  id,
  name,
  description,
  goal,
  status,
  default_calories,
  default_protein_g,
  default_carbs_g,
  default_fat_g,
  default_fiber_g,
  hydration_target_liters,
  created_by,
  created_at,
  updated_at,
  days:nutrition_template_days (
    id,
    template_id,
    day_index,
    title,
    meal_guidance,
    calorie_target,
    protein_target_g,
    carbs_target_g,
    fat_target_g,
    fiber_target_g,
    hydration_target_liters,
    created_at,
    updated_at
  )
`;

const nutritionAssignmentSelect = `
  id,
  member_id,
  template_id,
  assigned_by,
  assignment_status,
  start_date,
  end_date,
  goal_note,
  coach_notes,
  calorie_target_override,
  protein_target_override,
  carbs_target_override,
  fat_target_override,
  fiber_target_override,
  hydration_target_override,
  created_at,
  updated_at,
  member:profiles!member_nutrition_assignments_member_id_fkey (
    id,
    email,
    full_name,
    phone,
    membership_status,
    is_active,
    role
  ),
  template:nutrition_templates (
    id,
    name,
    description,
    goal,
    status,
    default_calories,
    default_protein_g,
    default_carbs_g,
    default_fat_g,
    default_fiber_g,
    hydration_target_liters,
    created_at,
    updated_at,
    days:nutrition_template_days (
      id,
      template_id,
      day_index,
      title,
      meal_guidance,
      calorie_target,
      protein_target_g,
      carbs_target_g,
      fat_target_g,
      fiber_target_g,
      hydration_target_liters,
      created_at,
      updated_at
    )
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

const normaliseOptionalTimestamp = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value) {
    return null;
  }

  const nextValue = new Date(value);

  if (Number.isNaN(nextValue.getTime())) {
    throw new Error('Invalid date/time value.');
  }

  return nextValue.toISOString();
};

const addDaysToIsoTimestamp = (value, days) => {
  if (!value) {
    return value;
  }

  const nextValue = new Date(value);

  if (Number.isNaN(nextValue.getTime())) {
    return value;
  }

  nextValue.setDate(nextValue.getDate() + Number(days || 0));
  return nextValue.toISOString();
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

const normaliseOptionalInteger = (value) => {
  const numericValue = normaliseOptionalNumber(value);

  if (numericValue === undefined || numericValue === null) {
    return numericValue;
  }

  return Math.round(numericValue);
};

const normaliseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const sortNestedWorkoutProgram = (program = {}) => ({
  ...program,
  days: [...(program.days || [])]
    .sort((left, right) => Number(left?.day_index || 0) - Number(right?.day_index || 0))
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises || [])]
        .sort((left, right) => Number(left?.order_index || 0) - Number(right?.order_index || 0)),
    })),
});

const sortNestedWorkoutAssignment = (assignment = {}) => ({
  ...assignment,
  program: assignment.program ? sortNestedWorkoutProgram(assignment.program) : assignment.program,
});

const sortNestedNutritionTemplate = (template = {}) => ({
  ...template,
  days: [...(template.days || [])]
    .sort((left, right) => Number(left?.day_index || 0) - Number(right?.day_index || 0)),
});

const sortNestedNutritionAssignment = (assignment = {}) => ({
  ...assignment,
  template: assignment.template ? sortNestedNutritionTemplate(assignment.template) : assignment.template,
});

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
    program_assignment_id: workout.program_assignment_id || null,
    program_day_id: workout.program_day_id || null,
    completed_by_trainer: Boolean(workout.completed_by_trainer),
    entries: (workout.entries || []).map((entry) => ({
      exercise_name: entry.exercise_name?.trim(),
      sets: entry.sets === '' || entry.sets === null || entry.sets === undefined ? null : Number(entry.sets),
      reps: entry.reps === '' || entry.reps === null || entry.reps === undefined ? null : String(entry.reps),
      weight: entry.weight === '' || entry.weight === null || entry.weight === undefined ? null : String(entry.weight),
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

export const fetchExerciseLibrary = async ({ includeInactive = true } = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('exercise_library')
    .select(exerciseLibrarySelect)
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load the exercise library.');
  return data ?? [];
};

export const saveExerciseLibraryItem = async (item = {}) => {
  const client = ensureSupabase();

  const payload = {
    name: String(item.name ?? '').trim(),
    muscle_group: normaliseOptionalText(item.muscle_group),
    equipment: normaliseOptionalText(item.equipment),
    movement_pattern: normaliseOptionalText(item.movement_pattern),
    difficulty: item.difficulty || 'all_levels',
    instructions: normaliseOptionalText(item.instructions),
    video_url: normaliseOptionalText(item.video_url),
    is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
  };

  if (!payload.name) {
    throw new Error('Exercise name is required.');
  }

  if (item.id) {
    const { data, error } = await client
      .from('exercise_library')
      .update(payload)
      .eq('id', item.id)
      .select(exerciseLibrarySelect)
      .single();

    unwrap(error, 'Unable to update the exercise library item.');
    return data;
  }

  const { data, error } = await client
    .from('exercise_library')
    .insert([payload])
    .select(exerciseLibrarySelect)
    .single();

  unwrap(error, 'Unable to create the exercise library item.');
  return data;
};

export const fetchWorkoutPrograms = async ({
  includeArchived = true,
  status = 'all',
  limit = 60,
} = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('workout_programs')
    .select(workoutProgramSelect)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load workout programs.');
  return (data ?? []).map(sortNestedWorkoutProgram);
};

export const fetchWorkoutAssignments = async ({
  memberId = null,
  status = 'all',
  limit = 80,
} = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('member_workout_assignments')
    .select(workoutAssignmentSelect)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  if (status && status !== 'all') {
    query = query.eq('assignment_status', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load workout assignments.');
  return (data ?? []).map(sortNestedWorkoutAssignment);
};

export const saveWorkoutProgram = async (program = {}, actorId = null) => {
  const client = ensureSupabase();

  const payload = {
    name: String(program.name ?? '').trim(),
    description: normaliseOptionalText(program.description),
    goal: normaliseOptionalText(program.goal),
    difficulty: program.difficulty || 'all_levels',
    duration_weeks: Math.max(1, normaliseOptionalInteger(program.duration_weeks) || 4),
    sessions_per_week: Math.max(1, normaliseOptionalInteger(program.sessions_per_week) || 3),
    status: program.status || 'draft',
  };

  if (!payload.name) {
    throw new Error('Program name is required.');
  }

  const programDays = (program.days || []).map((day, dayIndex) => {
    const title = String(day.title ?? '').trim();

    if (!title) {
      throw new Error(`Day ${dayIndex + 1} needs a title.`);
    }

    const exercises = (day.exercises || []).map((exercise, exerciseIndex) => {
      const exerciseName = String(exercise.exercise_name ?? '').trim();

      if (!exerciseName) {
        throw new Error(`Day ${dayIndex + 1}, exercise ${exerciseIndex + 1} needs a name.`);
      }

      return {
        exercise_library_id: exercise.exercise_library_id || null,
        order_index: exerciseIndex + 1,
        exercise_name: exerciseName,
        prescribed_sets: normaliseOptionalInteger(exercise.prescribed_sets),
        prescribed_reps: normaliseOptionalText(exercise.prescribed_reps),
        prescribed_weight: normaliseOptionalText(exercise.prescribed_weight),
        rest_seconds: normaliseOptionalInteger(exercise.rest_seconds),
        tempo: normaliseOptionalText(exercise.tempo),
        trainer_notes: normaliseOptionalText(exercise.trainer_notes),
        is_optional: Boolean(exercise.is_optional),
      };
    });

    if (!exercises.length) {
      throw new Error(`Day ${dayIndex + 1} needs at least one exercise prescription.`);
    }

    return {
      day_index: dayIndex + 1,
      title,
      focus_area: normaliseOptionalText(day.focus_area),
      notes: normaliseOptionalText(day.notes),
      target_duration_minutes: normaliseOptionalInteger(day.target_duration_minutes),
      exercises,
    };
  });

  if (!programDays.length) {
    throw new Error('Add at least one program day before saving.');
  }

  let programId = program.id || '';
  let programRow = null;

  if (programId) {
    const { data, error } = await client
      .from('workout_programs')
      .update(payload)
      .eq('id', programId)
      .select(workoutProgramSelect)
      .single();

    unwrap(error, 'Unable to update the workout program.');
    programRow = data;
  } else {
    const { data, error } = await client
      .from('workout_programs')
      .insert([{
        ...payload,
        created_by: actorId || null,
      }])
      .select(workoutProgramSelect)
      .single();

    unwrap(error, 'Unable to create the workout program.');
    programRow = data;
    programId = data.id;
  }

  const { error: deleteDaysError } = await client
    .from('workout_program_days')
    .delete()
    .eq('program_id', programId);

  unwrap(deleteDaysError, 'Unable to refresh the workout program days.');

  const dayRows = await Promise.all(programDays.map(async (day) => {
    const { data: dayRow, error: dayError } = await client
      .from('workout_program_days')
      .insert([{
        program_id: programId,
        day_index: day.day_index,
        title: day.title,
        focus_area: day.focus_area,
        notes: day.notes,
        target_duration_minutes: day.target_duration_minutes,
      }])
      .select('*')
      .single();

    unwrap(dayError, 'Unable to save one of the workout program days.');
    return { day, dayRow };
  }));

  await Promise.all(dayRows.map(async ({ day, dayRow }) => {
    const exerciseRows = day.exercises.map((exercise) => ({
      ...exercise,
      program_day_id: dayRow.id,
    }));

    const { error: exerciseError } = await client
      .from('workout_program_day_exercises')
      .insert(exerciseRows);

    unwrap(exerciseError, 'Unable to save the exercise prescriptions for this day.');
  }));

  const { data: refreshedProgram, error: refreshedProgramError } = await client
    .from('workout_programs')
    .select(workoutProgramSelect)
    .eq('id', programId)
    .single();

  unwrap(refreshedProgramError, 'Unable to reload the saved workout program.');
  return sortNestedWorkoutProgram(refreshedProgram || programRow);
};

export const saveWorkoutAssignment = async (assignment = {}, actorId = null) => {
  const client = ensureSupabase();

  const payload = {
    member_id: assignment.member_id || null,
    program_id: assignment.program_id || null,
    assignment_status: assignment.assignment_status || 'active',
    start_date: assignment.start_date || todayIsoDate(),
    end_date: assignment.end_date || null,
    focus_goal: normaliseOptionalText(assignment.focus_goal),
    notes: normaliseOptionalText(assignment.notes),
  };

  if (!payload.member_id) {
    throw new Error('Choose a member before saving the assignment.');
  }

  if (!payload.program_id) {
    throw new Error('Choose a workout program before saving the assignment.');
  }

  let data = null;
  let error = null;

  if (assignment.id) {
    ({ data, error } = await client
      .from('member_workout_assignments')
      .update(payload)
      .eq('id', assignment.id)
      .select(workoutAssignmentSelect)
      .single());
  } else {
    ({ data, error } = await client
      .from('member_workout_assignments')
      .insert([{
        ...payload,
        assigned_by: actorId || null,
      }])
      .select(workoutAssignmentSelect)
      .single());
  }

  unwrap(error, 'Unable to save the workout assignment.');
  return sortNestedWorkoutAssignment(data);
};

export const fetchNutritionTemplates = async ({
  includeArchived = true,
  status = 'all',
  limit = 60,
} = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('nutrition_templates')
    .select(nutritionTemplateSelect)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load nutrition templates.');
  return (data ?? []).map(sortNestedNutritionTemplate);
};

export const fetchNutritionAssignments = async ({
  memberId = null,
  status = 'all',
  limit = 80,
} = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('member_nutrition_assignments')
    .select(nutritionAssignmentSelect)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  if (status && status !== 'all') {
    query = query.eq('assignment_status', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load nutrition assignments.');
  return (data ?? []).map(sortNestedNutritionAssignment);
};

export const saveNutritionTemplate = async (template = {}, actorId = null) => {
  const client = ensureSupabase();

  const payload = {
    name: String(template.name ?? '').trim(),
    description: normaliseOptionalText(template.description),
    goal: normaliseOptionalText(template.goal),
    status: template.status || 'draft',
    default_calories: normaliseOptionalInteger(template.default_calories),
    default_protein_g: normaliseOptionalNumber(template.default_protein_g),
    default_carbs_g: normaliseOptionalNumber(template.default_carbs_g),
    default_fat_g: normaliseOptionalNumber(template.default_fat_g),
    default_fiber_g: normaliseOptionalNumber(template.default_fiber_g),
    hydration_target_liters: normaliseOptionalNumber(template.hydration_target_liters),
  };

  if (!payload.name) {
    throw new Error('Template name is required.');
  }

  const templateDays = (template.days || []).map((day, index) => {
    const title = String(day.title ?? '').trim();

    if (!title) {
      throw new Error(`Day ${index + 1} needs a title.`);
    }

    return {
      day_index: index + 1,
      title,
      meal_guidance: normaliseOptionalText(day.meal_guidance),
      calorie_target: normaliseOptionalInteger(day.calorie_target),
      protein_target_g: normaliseOptionalNumber(day.protein_target_g),
      carbs_target_g: normaliseOptionalNumber(day.carbs_target_g),
      fat_target_g: normaliseOptionalNumber(day.fat_target_g),
      fiber_target_g: normaliseOptionalNumber(day.fiber_target_g),
      hydration_target_liters: normaliseOptionalNumber(day.hydration_target_liters),
    };
  });

  if (!templateDays.length) {
    throw new Error('Add at least one day to the nutrition template.');
  }

  let templateId = template.id || '';
  let templateRow = null;

  if (templateId) {
    const { data, error } = await client
      .from('nutrition_templates')
      .update(payload)
      .eq('id', templateId)
      .select()
      .single();

    unwrap(error, 'Unable to update the nutrition template.');
    templateRow = data;
  } else {
    const { data, error } = await client
      .from('nutrition_templates')
      .insert([{
        ...payload,
        created_by: actorId || null,
      }])
      .select()
      .single();

    unwrap(error, 'Unable to create the nutrition template.');
    templateRow = data;
    templateId = data.id;
  }

  const { error: deleteDaysError } = await client
    .from('nutrition_template_days')
    .delete()
    .eq('template_id', templateId);

  unwrap(deleteDaysError, 'Unable to replace nutrition day rows.');

  const { error: insertDaysError } = await client
    .from('nutrition_template_days')
    .insert(templateDays.map((day) => ({
      ...day,
      template_id: templateId,
    })));

  unwrap(insertDaysError, 'Unable to save nutrition day rows.');

  const { data, error } = await client
    .from('nutrition_templates')
    .select(nutritionTemplateSelect)
    .eq('id', templateId)
    .single();

  unwrap(error, 'Unable to reload the nutrition template.');
  return sortNestedNutritionTemplate(data || templateRow);
};

export const saveNutritionAssignment = async (assignment = {}, actorId = null) => {
  const client = ensureSupabase();

  const payload = {
    member_id: assignment.member_id || null,
    template_id: assignment.template_id || null,
    assignment_status: assignment.assignment_status || 'active',
    start_date: assignment.start_date || todayIsoDate(),
    end_date: assignment.end_date || null,
    goal_note: normaliseOptionalText(assignment.goal_note),
    coach_notes: normaliseOptionalText(assignment.coach_notes),
    calorie_target_override: normaliseOptionalInteger(assignment.calorie_target_override),
    protein_target_override: normaliseOptionalNumber(assignment.protein_target_override),
    carbs_target_override: normaliseOptionalNumber(assignment.carbs_target_override),
    fat_target_override: normaliseOptionalNumber(assignment.fat_target_override),
    fiber_target_override: normaliseOptionalNumber(assignment.fiber_target_override),
    hydration_target_override: normaliseOptionalNumber(assignment.hydration_target_override),
  };

  if (!payload.member_id) {
    throw new Error('Choose a member before saving the nutrition assignment.');
  }

  if (!payload.template_id) {
    throw new Error('Choose a nutrition template before saving the assignment.');
  }

  let data = null;
  let error = null;

  if (assignment.id) {
    ({ data, error } = await client
      .from('member_nutrition_assignments')
      .update(payload)
      .eq('id', assignment.id)
      .select(nutritionAssignmentSelect)
      .single());
  } else {
    ({ data, error } = await client
      .from('member_nutrition_assignments')
      .insert([{
        ...payload,
        assigned_by: actorId || null,
      }])
      .select(nutritionAssignmentSelect)
      .single());
  }

  unwrap(error, 'Unable to save the nutrition assignment.');
  return sortNestedNutritionAssignment(data);
};

export const fetchMealLogs = async (userId, { assignmentId = null, limit = 60 } = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (assignmentId) {
    query = query.eq('assignment_id', assignmentId);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load meal logs.');
  return data ?? [];
};

export const saveMealLog = async (userId, entry = {}, options = {}) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    assignment_id: entry.assignment_id || null,
    template_day_id: entry.template_day_id || null,
    logged_on: entry.logged_on || todayIsoDate(),
    meal_slot: entry.meal_slot || 'breakfast',
    meal_title: normaliseOptionalText(entry.meal_title) ?? null,
    calories: normaliseOptionalInteger(entry.calories),
    protein_g: normaliseOptionalNumber(entry.protein_g),
    carbs_g: normaliseOptionalNumber(entry.carbs_g),
    fat_g: normaliseOptionalNumber(entry.fat_g),
    fiber_g: normaliseOptionalNumber(entry.fiber_g),
    water_liters: normaliseOptionalNumber(entry.water_liters),
    adherence_score: normaliseOptionalInteger(entry.adherence_score),
    hunger_score: normaliseOptionalInteger(entry.hunger_score),
    energy_score: normaliseOptionalInteger(entry.energy_score),
    notes: normaliseOptionalText(entry.notes) ?? null,
    logged_at: normaliseOptionalTimestamp(entry.logged_at) ?? null,
    recorded_by: options.recordedBy || null,
    entry_source: options.entrySource || 'member_app',
  };

  if (!payload.meal_title) {
    payload.meal_title = payload.meal_slot.replaceAll('_', ' ');
  }

  if (entry.id) {
    const { data, error } = await client
      .from('meal_logs')
      .update(payload)
      .eq('id', entry.id)
      .select()
      .single();

    unwrap(error, 'Unable to update the meal log.');
    return data;
  }

  const { data, error } = await client
    .from('meal_logs')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to save the meal log.');
  return data;
};

export const deleteMealLog = async (entryId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('meal_logs')
    .delete()
    .eq('id', entryId);

  unwrap(error, 'Unable to delete the meal log.');
};

export const fetchNutritionCheckins = async (userId, limit = 20) => {
  const client = ensureSupabase();
  let query = client
    .from('nutrition_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checked_in_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load nutrition check-ins.');
  return data ?? [];
};

export const saveNutritionCheckin = async (userId, entry = {}, options = {}) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    assignment_id: entry.assignment_id || null,
    checked_in_on: entry.checked_in_on || todayIsoDate(),
    body_weight: normaliseOptionalNumber(entry.body_weight),
    adherence_score: normaliseOptionalInteger(entry.adherence_score),
    hunger_score: normaliseOptionalInteger(entry.hunger_score),
    energy_score: normaliseOptionalInteger(entry.energy_score),
    digestion_notes: normaliseOptionalText(entry.digestion_notes) ?? null,
    coach_feedback: normaliseOptionalText(entry.coach_feedback) ?? null,
    next_focus: normaliseOptionalText(entry.next_focus) ?? null,
    notes: normaliseOptionalText(entry.notes) ?? null,
    recorded_by: options.recordedBy || null,
    entry_source: options.entrySource || 'member_app',
  };

  if (entry.id) {
    const { data, error } = await client
      .from('nutrition_checkins')
      .update(payload)
      .eq('id', entry.id)
      .select()
      .single();

    unwrap(error, 'Unable to update the nutrition check-in.');
    return data;
  }

  const { data, error } = await client
    .from('nutrition_checkins')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to save the nutrition check-in.');
  return data;
};

export const deleteNutritionCheckin = async (entryId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('nutrition_checkins')
    .delete()
    .eq('id', entryId);

  unwrap(error, 'Unable to delete the nutrition check-in.');
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

export const saveProgressCheckpoint = async (userId, checkpoint = {}, options = {}) => {
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
    recorded_by: options.recordedBy || null,
    entry_source: options.entrySource || 'member_app',
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

export const fetchBodyMeasurements = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_on', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load body measurements.');
  return data ?? [];
};

export const saveBodyMeasurement = async (userId, measurement = {}, options = {}) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    recorded_on: measurement.recorded_on || todayIsoDate(),
    height_cm: normaliseOptionalNumber(measurement.height_cm),
    chest_cm: normaliseOptionalNumber(measurement.chest_cm),
    waist_cm: normaliseOptionalNumber(measurement.waist_cm),
    hips_cm: normaliseOptionalNumber(measurement.hips_cm),
    left_arm_cm: normaliseOptionalNumber(measurement.left_arm_cm),
    right_arm_cm: normaliseOptionalNumber(measurement.right_arm_cm),
    left_thigh_cm: normaliseOptionalNumber(measurement.left_thigh_cm),
    right_thigh_cm: normaliseOptionalNumber(measurement.right_thigh_cm),
    notes: normaliseOptionalText(measurement.notes) ?? null,
    recorded_by: options.recordedBy || null,
    entry_source: options.entrySource || 'member_app',
  };

  const hasUsefulValue = [
    payload.height_cm,
    payload.chest_cm,
    payload.waist_cm,
    payload.hips_cm,
    payload.left_arm_cm,
    payload.right_arm_cm,
    payload.left_thigh_cm,
    payload.right_thigh_cm,
    payload.notes,
  ].some((value) => value !== null && value !== undefined);

  if (!hasUsefulValue) {
    throw new Error('Add at least one body measurement or note before saving.');
  }

  if (measurement.id) {
    const { data, error } = await client
      .from('body_measurements')
      .update(payload)
      .eq('id', measurement.id)
      .select()
      .single();

    unwrap(error, 'Unable to update the body measurement.');
    return data;
  }

  const { data, error } = await client
    .from('body_measurements')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to save the body measurement.');
  return data;
};

export const deleteBodyMeasurement = async (measurementId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('body_measurements')
    .delete()
    .eq('id', measurementId);

  unwrap(error, 'Unable to delete the body measurement.');
};

export const fetchPersonalRecords = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_on', { ascending: false })
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load personal records.');
  return data ?? [];
};

export const savePersonalRecord = async (userId, record = {}, options = {}) => {
  const client = ensureSupabase();

  const payload = {
    user_id: userId,
    exercise_name: String(record.exercise_name ?? '').trim(),
    record_type: record.record_type || 'weight',
    record_value: normaliseOptionalNumber(record.record_value),
    unit: normaliseOptionalText(record.unit) ?? 'units',
    achieved_on: record.achieved_on || todayIsoDate(),
    notes: normaliseOptionalText(record.notes) ?? null,
    related_workout_id: record.related_workout_id || null,
    recorded_by: options.recordedBy || null,
    entry_source: options.entrySource || 'member_app',
  };

  if (!payload.exercise_name) {
    throw new Error('Exercise or event name is required.');
  }

  if (payload.record_value === null || payload.record_value === undefined) {
    throw new Error('A numeric record value is required.');
  }

  if (record.id) {
    const { data, error } = await client
      .from('personal_records')
      .update(payload)
      .eq('id', record.id)
      .select()
      .single();

    unwrap(error, 'Unable to update the personal record.');
    return data;
  }

  const { data, error } = await client
    .from('personal_records')
    .insert([payload])
    .select()
    .single();

  unwrap(error, 'Unable to save the personal record.');
  return data;
};

export const deletePersonalRecord = async (recordId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('personal_records')
    .delete()
    .eq('id', recordId);

  unwrap(error, 'Unable to delete the personal record.');
};

export const fetchMemberClassBookings = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('class_bookings')
    .select(memberClassBookingSelect)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  unwrap(error, 'Unable to load class bookings.');
  return (data ?? []).filter((booking) => booking?.class_session);
};

export const fetchUpcomingClassBookings = async (userId) => fetchMemberClassBookings(userId);

export const fetchScheduleTrainers = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_schedule_trainers');

  unwrap(error, 'Unable to load the trainer roster.');
  return data ?? [];
};

export const fetchBookableClassSessions = async ({
  startDate = todayIsoDate(),
  endDate = null,
  sessionType = 'all',
  trainerId = 'all',
  roomName = 'all',
  status = 'scheduled',
  visibility = 'members',
  includeInactive = false,
  limit = 120,
} = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_bookable_class_sessions', {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_session_type: sessionType && sessionType !== 'all' ? sessionType : null,
    p_trainer_id: trainerId && trainerId !== 'all' ? trainerId : null,
    p_room_name: roomName && roomName !== 'all' ? roomName : null,
    p_status: status && status !== 'all' ? status : null,
    p_visibility: visibility && visibility !== 'all' ? visibility : null,
    p_include_inactive: Boolean(includeInactive),
    p_limit: Number(limit || 120),
  });

  unwrap(error, 'Unable to load bookable class sessions.');
  return data ?? [];
};

export const fetchClassSessions = async ({
  startDate = todayIsoDate(),
  endDate = null,
  sessionType = 'all',
  trainerId = 'all',
  roomName = 'all',
  status = 'scheduled',
  visibility = 'all',
  includeInactive = false,
  limit = 120,
} = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('class_sessions')
    .select(classSessionSelect)
    .order('starts_at', { ascending: true });

  if (startDate) {
    query = query.gte('starts_at', `${startDate}T00:00:00`);
  }

  if (endDate) {
    query = query.lte('starts_at', `${endDate}T23:59:59.999`);
  }

  if (sessionType && sessionType !== 'all') {
    query = query.eq('session_type', sessionType);
  }

  if (trainerId && trainerId !== 'all') {
    query = query.eq('trainer_id', trainerId);
  }

  if (roomName && roomName !== 'all') {
    query = query.eq('room_name', roomName);
  }

  if (status && status !== 'all') {
    query = query.eq('schedule_status', status);
  }

  if (visibility && visibility !== 'all') {
    query = query.eq('visibility', visibility);
  }

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  unwrap(error, 'Unable to load class sessions.');
  return data ?? [];
};

export const saveClassSession = async (session = {}) => {
  const client = ensureSupabase();
  const startsAt = normaliseOptionalTimestamp(pickFirstDefined(session, ['startsAt', 'starts_at']));
  const endsAt = normaliseOptionalTimestamp(pickFirstDefined(session, ['endsAt', 'ends_at']));
  const capacity = normaliseOptionalNumber(pickFirstDefined(session, ['capacity']));
  const title = String(pickFirstDefined(session, ['title']) ?? '').trim();
  const sessionType = pickFirstDefined(session, ['sessionType', 'session_type']) || 'group_class';
  const scheduleStatus = pickFirstDefined(session, ['scheduleStatus', 'schedule_status']) || 'scheduled';
  const visibility = pickFirstDefined(session, ['visibility']) || 'members';
  const repeatWeeksValue = pickFirstDefined(session, ['repeatWeeks']);
  const repeatWeeks = Math.max(0, Math.min(Number(repeatWeeksValue || 0), 12));

  if (!title) {
    throw new Error('Session title is required.');
  }

  if (!startsAt) {
    throw new Error('Start date and time are required.');
  }

  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('End time must be after the start time.');
  }

  if (!capacity || capacity < 1) {
    throw new Error('Capacity must be at least 1.');
  }

  const trainerName = normaliseOptionalText(pickFirstDefined(session, ['trainerName', 'trainer_name']));

  const payload = {
    title,
    description: normaliseOptionalText(pickFirstDefined(session, ['description'])),
    session_type: sessionType,
    trainer_id: pickFirstDefined(session, ['trainerId', 'trainer_id']) || null,
    trainer_name: trainerName,
    coach_name: trainerName || null,
    room_name: normaliseOptionalText(pickFirstDefined(session, ['roomName', 'room_name'])),
    branch_name: normaliseOptionalText(pickFirstDefined(session, ['branchName', 'branch_name'])) || 'Main branch',
    equipment_notes: normaliseOptionalText(pickFirstDefined(session, ['equipmentNotes', 'equipment_notes'])),
    starts_at: startsAt,
    ends_at: endsAt,
    capacity,
    visibility,
    schedule_status: scheduleStatus,
    is_active: normaliseBoolean(pickFirstDefined(session, ['isActive', 'is_active'])) ?? true,
  };

  if (session.id) {
    const { data, error } = await client
      .from('class_sessions')
      .update(payload)
      .eq('id', session.id)
      .select(classSessionSelect)
      .single();

    unwrap(error, 'Unable to update the class session.');
    return data ? [data] : [];
  }

  const occurrenceCount = repeatWeeks > 0 ? repeatWeeks + 1 : 1;
  const recurrenceGroupId = occurrenceCount > 1 && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : null;

  const rows = Array.from({ length: occurrenceCount }, (_, index) => ({
    ...payload,
    starts_at: addDaysToIsoTimestamp(payload.starts_at, index * 7),
    ends_at: addDaysToIsoTimestamp(payload.ends_at, index * 7),
    recurrence_rule: occurrenceCount > 1 ? 'weekly' : null,
    recurrence_group_id: recurrenceGroupId,
  }));

  const { data, error } = await client
    .from('class_sessions')
    .insert(rows)
    .select(classSessionSelect);

  unwrap(error, 'Unable to create the class session.');
  return data ?? [];
};

export const updateClassSessionStatus = async (sessionId, changes = {}) => {
  const client = ensureSupabase();
  const payload = {};

  const nextStatus = pickFirstDefined(changes, ['scheduleStatus', 'schedule_status']);
  const nextActive = pickFirstDefined(changes, ['isActive', 'is_active']);

  if (nextStatus !== undefined) {
    payload.schedule_status = nextStatus;
  }

  if (nextActive !== undefined) {
    payload.is_active = normaliseBoolean(nextActive);
  }

  if (!Object.keys(payload).length) {
    throw new Error('No class session changes were provided.');
  }

  const { data, error } = await client
    .from('class_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select(classSessionSelect)
    .single();

  unwrap(error, 'Unable to update class session status.');
  return data;
};

export const bookClassSession = async (sessionId, options = {}) => {
  const client = ensureSupabase();

  const { data, error } = await client.rpc('book_class_session', {
    p_session_id: sessionId,
    p_notes: normaliseOptionalText(options.notes) ?? null,
    p_source: options.source || 'member_app',
  });

  unwrap(error, 'Unable to book the class session.');
  return data;
};

export const cancelClassBooking = async (sessionId, options = {}) => {
  const client = ensureSupabase();

  const { data, error } = await client.rpc('cancel_class_booking', {
    p_session_id: sessionId,
    p_reason: normaliseOptionalText(options.reason) ?? null,
    p_promote_waitlist: options.promoteWaitlist !== undefined ? Boolean(options.promoteWaitlist) : true,
  });

  unwrap(error, 'Unable to cancel the class booking.');
  return data;
};

export const fetchSessionBookingRoster = async (sessionId) => {
  const client = ensureSupabase();

  const { data, error } = await client.rpc('list_session_booking_roster', {
    p_session_id: sessionId,
  });

  unwrap(error, 'Unable to load the class roster.');
  return data ?? [];
};

export const staffPromoteNextWaitlistedBooking = async (sessionId) => {
  const client = ensureSupabase();

  const { data, error } = await client.rpc('staff_promote_next_waitlisted_booking', {
    p_session_id: sessionId,
  });

  unwrap(error, 'Unable to promote the next waitlisted booking.');
  return data;
};

export const staffUpdateClassBooking = async (bookingId, changes = {}) => {
  const client = ensureSupabase();

  const { data, error } = await client.rpc('staff_update_class_booking', {
    p_booking_id: bookingId,
    p_booking_status: changes.bookingStatus || changes.booking_status,
    p_notes: normaliseOptionalText(changes.notes) ?? null,
    p_cancel_reason: normaliseOptionalText(changes.cancelReason || changes.cancel_reason) ?? null,
  });

  unwrap(error, 'Unable to update the class booking.');
  return data;
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
