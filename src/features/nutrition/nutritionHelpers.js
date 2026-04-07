const createClientKey = (prefix = 'nutrition') => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

export const NUTRITION_TEMPLATE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const NUTRITION_ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const MEAL_SLOT_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'post_workout', label: 'Post-workout' },
];

export const SCORE_OPTIONS = [
  { value: 1, label: '1 — Low' },
  { value: 2, label: '2' },
  { value: 3, label: '3 — Medium' },
  { value: 4, label: '4' },
  { value: 5, label: '5 — High' },
];

const TEMPLATE_STATUS_META = {
  draft: { label: 'Draft', background: '#eff6ff', color: '#1d4ed8' },
  active: { label: 'Active', background: '#ecfdf3', color: '#047857' },
  archived: { label: 'Archived', background: '#f8fafc', color: '#475569' },
};

const ASSIGNMENT_STATUS_META = {
  planned: { label: 'Planned', background: '#eff6ff', color: '#1d4ed8' },
  active: { label: 'Active', background: '#ecfdf3', color: '#047857' },
  paused: { label: 'Paused', background: '#fff7ed', color: '#c2410c' },
  completed: { label: 'Completed', background: '#eef2ff', color: '#4338ca' },
  cancelled: { label: 'Cancelled', background: '#fef2f2', color: '#b91c1c' },
};

const getMetaSx = (meta) => ({
  bgcolor: meta.background,
  color: meta.color,
  fontWeight: 700,
});

export const getNutritionTemplateStatusMeta = (status) => (
  TEMPLATE_STATUS_META[status] || TEMPLATE_STATUS_META.draft
);
export const getNutritionTemplateStatusChipSx = (status) => getMetaSx(getNutritionTemplateStatusMeta(status));

export const getNutritionAssignmentStatusMeta = (status) => (
  ASSIGNMENT_STATUS_META[status] || ASSIGNMENT_STATUS_META.planned
);
export const getNutritionAssignmentStatusChipSx = (status) => getMetaSx(getNutritionAssignmentStatusMeta(status));

export const getMealSlotLabel = (slot) => (
  MEAL_SLOT_OPTIONS.find((option) => option.value === slot)?.label || 'Meal'
);

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatShortDate = (value) => {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatNutritionDate = (value) => formatShortDate(value);

export const formatAssignmentDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return 'Flexible schedule';
  }

  if (startDate && endDate) {
    return `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;
  }

  if (startDate) {
    return `Starts ${formatShortDate(startDate)}`;
  }

  return `Until ${formatShortDate(endDate)}`;
};

export const formatMacroNumber = (value, unit = 'g', digits = 0) => {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return '—';
  }

  return `${numericValue.toFixed(digits)} ${unit}`;
};

export const formatMacroTargets = (targets = {}) => {
  const segments = [];

  if (toFiniteNumber(targets.calories) !== null) {
    segments.push(`${Math.round(Number(targets.calories))} kcal`);
  }

  if (toFiniteNumber(targets.protein_g) !== null) {
    segments.push(`${Math.round(Number(targets.protein_g))}g protein`);
  }

  if (toFiniteNumber(targets.carbs_g) !== null) {
    segments.push(`${Math.round(Number(targets.carbs_g))}g carbs`);
  }

  if (toFiniteNumber(targets.fat_g) !== null) {
    segments.push(`${Math.round(Number(targets.fat_g))}g fat`);
  }

  if (toFiniteNumber(targets.fiber_g) !== null) {
    segments.push(`${Math.round(Number(targets.fiber_g))}g fiber`);
  }

  if (toFiniteNumber(targets.hydration_liters) !== null) {
    segments.push(`${Number(targets.hydration_liters).toFixed(1)}L water`);
  }

  return segments.length ? segments.join(' • ') : 'Targets not set yet';
};

export const createEmptyNutritionTemplateDay = (dayIndex = 1) => ({
  client_id: createClientKey('nutrition-day'),
  id: '',
  day_index: dayIndex,
  title: `Day ${dayIndex}`,
  meal_guidance: '',
  calorie_target: '',
  protein_target_g: '',
  carbs_target_g: '',
  fat_target_g: '',
  fiber_target_g: '',
  hydration_target_liters: '',
});

export const createEmptyNutritionTemplate = () => ({
  id: '',
  name: '',
  description: '',
  goal: '',
  status: 'draft',
  default_calories: '',
  default_protein_g: '',
  default_carbs_g: '',
  default_fat_g: '',
  default_fiber_g: '',
  hydration_target_liters: '',
  days: [createEmptyNutritionTemplateDay(1)],
});

export const createEmptyNutritionAssignment = () => ({
  id: '',
  member_id: '',
  template_id: '',
  assignment_status: 'active',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  goal_note: '',
  coach_notes: '',
  calorie_target_override: '',
  protein_target_override: '',
  carbs_target_override: '',
  fat_target_override: '',
  fiber_target_override: '',
  hydration_target_override: '',
});

export const createEmptyMealLog = () => ({
  id: '',
  assignment_id: '',
  template_day_id: '',
  logged_on: new Date().toISOString().slice(0, 10),
  meal_slot: 'breakfast',
  meal_title: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  fiber_g: '',
  water_liters: '',
  adherence_score: '',
  hunger_score: '',
  energy_score: '',
  notes: '',
});

export const createEmptyNutritionCheckin = () => ({
  id: '',
  assignment_id: '',
  checked_in_on: new Date().toISOString().slice(0, 10),
  body_weight: '',
  adherence_score: '',
  hunger_score: '',
  energy_score: '',
  digestion_notes: '',
  coach_feedback: '',
  next_focus: '',
  notes: '',
});

export const sortNutritionTemplateDays = (days = []) => [...days].sort((left, right) => {
  const dayDifference = Number(left?.day_index || 0) - Number(right?.day_index || 0);

  if (dayDifference !== 0) {
    return dayDifference;
  }

  return String(left?.title || '').localeCompare(String(right?.title || ''));
});

export const sortNutritionTemplates = (rows = []) => [...rows].sort((left, right) => (
  new Date(right?.updated_at || right?.created_at || 0).getTime()
  - new Date(left?.updated_at || left?.created_at || 0).getTime()
));

export const sortNutritionAssignments = (rows = []) => [...rows].sort((left, right) => (
  new Date(right?.start_date || right?.created_at || 0).getTime()
  - new Date(left?.start_date || left?.created_at || 0).getTime()
));

export const sortMealLogs = (rows = []) => [...rows].sort((left, right) => (
  new Date(right?.logged_at || right?.created_at || right?.logged_on || 0).getTime()
  - new Date(left?.logged_at || left?.created_at || left?.logged_on || 0).getTime()
));

export const sortNutritionCheckins = (rows = []) => [...rows].sort((left, right) => (
  new Date(right?.checked_in_on || right?.created_at || 0).getTime()
  - new Date(left?.checked_in_on || left?.created_at || 0).getTime()
));

export const normaliseNutritionTemplateForForm = (template = {}) => ({
  id: template.id || '',
  name: template.name || '',
  description: template.description || '',
  goal: template.goal || '',
  status: template.status || 'draft',
  default_calories: template.default_calories ?? '',
  default_protein_g: template.default_protein_g ?? '',
  default_carbs_g: template.default_carbs_g ?? '',
  default_fat_g: template.default_fat_g ?? '',
  default_fiber_g: template.default_fiber_g ?? '',
  hydration_target_liters: template.hydration_target_liters ?? '',
  days: sortNutritionTemplateDays(template.days || []).map((day, index) => ({
    client_id: createClientKey('nutrition-day'),
    id: day.id || '',
    day_index: Number(day.day_index || index + 1),
    title: day.title || `Day ${index + 1}`,
    meal_guidance: day.meal_guidance || '',
    calorie_target: day.calorie_target ?? '',
    protein_target_g: day.protein_target_g ?? '',
    carbs_target_g: day.carbs_target_g ?? '',
    fat_target_g: day.fat_target_g ?? '',
    fiber_target_g: day.fiber_target_g ?? '',
    hydration_target_liters: day.hydration_target_liters ?? '',
  })),
});

export const normaliseNutritionAssignmentForForm = (assignment = {}) => ({
  id: assignment.id || '',
  member_id: assignment.member_id || '',
  template_id: assignment.template_id || '',
  assignment_status: assignment.assignment_status || 'active',
  start_date: assignment.start_date || new Date().toISOString().slice(0, 10),
  end_date: assignment.end_date || '',
  goal_note: assignment.goal_note || '',
  coach_notes: assignment.coach_notes || '',
  calorie_target_override: assignment.calorie_target_override ?? '',
  protein_target_override: assignment.protein_target_override ?? '',
  carbs_target_override: assignment.carbs_target_override ?? '',
  fat_target_override: assignment.fat_target_override ?? '',
  fiber_target_override: assignment.fiber_target_override ?? '',
  hydration_target_override: assignment.hydration_target_override ?? '',
});

export const normaliseMealLogForForm = (entry = {}) => ({
  id: entry.id || '',
  assignment_id: entry.assignment_id || '',
  template_day_id: entry.template_day_id || '',
  logged_on: entry.logged_on || new Date().toISOString().slice(0, 10),
  meal_slot: entry.meal_slot || 'breakfast',
  meal_title: entry.meal_title || '',
  calories: entry.calories ?? '',
  protein_g: entry.protein_g ?? '',
  carbs_g: entry.carbs_g ?? '',
  fat_g: entry.fat_g ?? '',
  fiber_g: entry.fiber_g ?? '',
  water_liters: entry.water_liters ?? '',
  adherence_score: entry.adherence_score ?? '',
  hunger_score: entry.hunger_score ?? '',
  energy_score: entry.energy_score ?? '',
  notes: entry.notes || '',
});

export const normaliseNutritionCheckinForForm = (entry = {}) => ({
  id: entry.id || '',
  assignment_id: entry.assignment_id || '',
  checked_in_on: entry.checked_in_on || new Date().toISOString().slice(0, 10),
  body_weight: entry.body_weight ?? '',
  adherence_score: entry.adherence_score ?? '',
  hunger_score: entry.hunger_score ?? '',
  energy_score: entry.energy_score ?? '',
  digestion_notes: entry.digestion_notes || '',
  coach_feedback: entry.coach_feedback || '',
  next_focus: entry.next_focus || '',
  notes: entry.notes || '',
});

export const getEffectiveNutritionTargets = (assignment = {}) => {
  const template = assignment?.template || {};

  return {
    calories: assignment?.calorie_target_override ?? template.default_calories ?? null,
    protein_g: assignment?.protein_target_override ?? template.default_protein_g ?? null,
    carbs_g: assignment?.carbs_target_override ?? template.default_carbs_g ?? null,
    fat_g: assignment?.fat_target_override ?? template.default_fat_g ?? null,
    fiber_g: assignment?.fiber_target_override ?? template.default_fiber_g ?? null,
    hydration_liters: assignment?.hydration_target_override ?? template.hydration_target_liters ?? null,
  };
};

export const buildNutritionAssignmentSummary = (assignment = null, mealLogs = [], checkins = []) => {
  const assignmentId = assignment?.id || null;
  const filteredLogs = assignmentId
    ? mealLogs.filter((log) => log.assignment_id === assignmentId)
    : [...mealLogs];

  const filteredCheckins = assignmentId
    ? checkins.filter((checkin) => checkin.assignment_id === assignmentId)
    : [...checkins];

  const today = new Date().toISOString().slice(0, 10);
  const weekBoundary = new Date();
  weekBoundary.setDate(weekBoundary.getDate() - 6);
  const weekBoundaryIso = weekBoundary.toISOString().slice(0, 10);

  const logsToday = filteredLogs.filter((log) => log.logged_on === today);
  const logsThisWeek = filteredLogs.filter((log) => String(log.logged_on || '') >= weekBoundaryIso);

  const averageScore = (rows, key) => {
    const values = rows
      .map((row) => toFiniteNumber(row?.[key]))
      .filter((value) => value !== null);

    if (!values.length) {
      return null;
    }

    return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
  };

  const macroTotals = filteredLogs.reduce((totals, log) => ({
    calories: totals.calories + Number(log.calories || 0),
    protein_g: totals.protein_g + Number(log.protein_g || 0),
    carbs_g: totals.carbs_g + Number(log.carbs_g || 0),
    fat_g: totals.fat_g + Number(log.fat_g || 0),
    fiber_g: totals.fiber_g + Number(log.fiber_g || 0),
    water_liters: totals.water_liters + Number(log.water_liters || 0),
  }), {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    water_liters: 0,
  });

  return {
    assignment,
    targets: getEffectiveNutritionTargets(assignment),
    logsTodayCount: logsToday.length,
    logsThisWeekCount: logsThisWeek.length,
    recentLogsCount: filteredLogs.slice(0, 7).length,
    averageAdherence: averageScore(logsThisWeek, 'adherence_score'),
    averageEnergy: averageScore(logsThisWeek, 'energy_score'),
    averageHunger: averageScore(logsThisWeek, 'hunger_score'),
    lastCheckin: filteredCheckins[0] || null,
    lastMealLog: filteredLogs[0] || null,
    macroTotals,
    activeDayCount: assignment?.template?.days?.length || 0,
  };
};
