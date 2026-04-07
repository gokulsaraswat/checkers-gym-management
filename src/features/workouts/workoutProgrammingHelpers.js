import { PATHS } from '../../app/paths';

const createClientKey = (prefix = 'item') => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

export const WORKOUT_PROGRAM_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const WORKOUT_ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EXERCISE_DIFFICULTY_OPTIONS = [
  { value: 'all_levels', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const PROGRAM_STATUS_META = {
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

const DIFFICULTY_META = {
  all_levels: { label: 'All levels', background: '#f8fafc', color: '#475569' },
  beginner: { label: 'Beginner', background: '#ecfdf3', color: '#047857' },
  intermediate: { label: 'Intermediate', background: '#fff7ed', color: '#c2410c' },
  advanced: { label: 'Advanced', background: '#fef2f2', color: '#b91c1c' },
};

const getMetaSx = (meta) => ({
  bgcolor: meta.background,
  color: meta.color,
  fontWeight: 700,
});

export const getWorkoutProgramStatusMeta = (status) => PROGRAM_STATUS_META[status] || PROGRAM_STATUS_META.draft;
export const getWorkoutProgramStatusChipSx = (status) => getMetaSx(getWorkoutProgramStatusMeta(status));

export const getWorkoutAssignmentStatusMeta = (status) => (
  ASSIGNMENT_STATUS_META[status] || ASSIGNMENT_STATUS_META.planned
);
export const getWorkoutAssignmentStatusChipSx = (status) => getMetaSx(getWorkoutAssignmentStatusMeta(status));

export const getExerciseDifficultyMeta = (difficulty) => (
  DIFFICULTY_META[difficulty] || DIFFICULTY_META.all_levels
);
export const getExerciseDifficultyChipSx = (difficulty) => getMetaSx(getExerciseDifficultyMeta(difficulty));

export const createEmptyProgramExercise = () => ({
  client_id: createClientKey('exercise'),
  id: '',
  exercise_library_id: '',
  exercise_name: '',
  prescribed_sets: '',
  prescribed_reps: '',
  prescribed_weight: '',
  rest_seconds: '',
  tempo: '',
  trainer_notes: '',
  is_optional: false,
});

export const createEmptyProgramDay = (dayIndex = 1) => ({
  client_id: createClientKey('day'),
  id: '',
  day_index: dayIndex,
  title: `Day ${dayIndex}`,
  focus_area: '',
  notes: '',
  target_duration_minutes: '',
  exercises: [createEmptyProgramExercise()],
});

export const createEmptyProgram = () => ({
  id: '',
  name: '',
  description: '',
  goal: '',
  difficulty: 'all_levels',
  duration_weeks: 4,
  sessions_per_week: 3,
  status: 'draft',
  days: [createEmptyProgramDay(1)],
});

export const createEmptyExerciseLibraryForm = () => ({
  id: '',
  name: '',
  muscle_group: '',
  equipment: '',
  movement_pattern: '',
  difficulty: 'all_levels',
  instructions: '',
  video_url: '',
  is_active: true,
});

export const createEmptyAssignment = () => ({
  id: '',
  member_id: '',
  program_id: '',
  assignment_status: 'active',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  focus_goal: '',
  notes: '',
});

export const sortProgramDays = (days = []) => [...days].sort((left, right) => {
  const dayDifference = Number(left?.day_index || 0) - Number(right?.day_index || 0);

  if (dayDifference !== 0) {
    return dayDifference;
  }

  return String(left?.title || '').localeCompare(String(right?.title || ''));
});

export const sortProgramExercises = (rows = []) => [...rows].sort((left, right) => (
  Number(left?.order_index || 0) - Number(right?.order_index || 0)
));

export const normaliseProgramForForm = (program = {}) => ({
  id: program.id || '',
  name: program.name || '',
  description: program.description || '',
  goal: program.goal || '',
  difficulty: program.difficulty || 'all_levels',
  duration_weeks: program.duration_weeks || 4,
  sessions_per_week: program.sessions_per_week || 3,
  status: program.status || 'draft',
  days: sortProgramDays(program.days || []).map((day, index) => ({
    client_id: createClientKey('day'),
    id: day.id || '',
    day_index: Number(day.day_index || index + 1),
    title: day.title || `Day ${index + 1}`,
    focus_area: day.focus_area || '',
    notes: day.notes || '',
    target_duration_minutes: day.target_duration_minutes ?? '',
    exercises: sortProgramExercises(day.exercises || []).map((exercise) => ({
      client_id: createClientKey('exercise'),
      id: exercise.id || '',
      exercise_library_id: exercise.exercise_library_id || '',
      exercise_name: exercise.exercise_name || exercise.library_exercise?.name || '',
      prescribed_sets: exercise.prescribed_sets ?? '',
      prescribed_reps: exercise.prescribed_reps || '',
      prescribed_weight: exercise.prescribed_weight || '',
      rest_seconds: exercise.rest_seconds ?? '',
      tempo: exercise.tempo || '',
      trainer_notes: exercise.trainer_notes || '',
      is_optional: Boolean(exercise.is_optional),
    })),
  })),
});

export const normaliseExerciseLibraryForm = (item = {}) => ({
  id: item.id || '',
  name: item.name || '',
  muscle_group: item.muscle_group || '',
  equipment: item.equipment || '',
  movement_pattern: item.movement_pattern || '',
  difficulty: item.difficulty || 'all_levels',
  instructions: item.instructions || '',
  video_url: item.video_url || '',
  is_active: item.is_active !== false,
});

export const normaliseAssignmentForForm = (assignment = {}) => ({
  id: assignment.id || '',
  member_id: assignment.member_id || assignment.member?.id || '',
  program_id: assignment.program_id || assignment.program?.id || '',
  assignment_status: assignment.assignment_status || 'active',
  start_date: assignment.start_date || new Date().toISOString().slice(0, 10),
  end_date: assignment.end_date || '',
  focus_goal: assignment.focus_goal || '',
  notes: assignment.notes || '',
});

export const formatProgramDate = (value, fallback = 'Not scheduled') => {
  if (!value) {
    return fallback;
  }

  const normalisedValue = value.includes('T') ? value : `${value}T00:00:00`;
  const parsedDate = new Date(normalisedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleDateString();
};

export const formatProgramDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return 'No schedule set';
  }

  if (startDate && !endDate) {
    return `Starts ${formatProgramDate(startDate)}`;
  }

  if (!startDate && endDate) {
    return `Until ${formatProgramDate(endDate)}`;
  }

  return `${formatProgramDate(startDate)} – ${formatProgramDate(endDate)}`;
};

export const sortWorkoutPrograms = (programs = []) => [...programs]
  .map((program) => ({
    ...program,
    days: sortProgramDays(program.days || []).map((day) => ({
      ...day,
      exercises: sortProgramExercises(day.exercises || []),
    })),
  }))
  .sort((left, right) => {
    const getPriority = (status) => {
      if (status === 'active') return 0;
      if (status === 'draft') return 1;
      return 2;
    };

    const leftPriority = getPriority(left.status);
    const rightPriority = getPriority(right.status);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return String(left.name || '').localeCompare(String(right.name || ''));
  });

export const sortWorkoutAssignments = (assignments = []) => [...assignments]
  .map((assignment) => ({
    ...assignment,
    program: assignment.program ? {
      ...assignment.program,
      days: sortProgramDays(assignment.program.days || []).map((day) => ({
        ...day,
        exercises: sortProgramExercises(day.exercises || []),
      })),
    } : assignment.program,
  }))
  .sort((left, right) => {
    const leftPriority = ['active', 'planned', 'paused', 'completed', 'cancelled'].indexOf(left.assignment_status);
    const rightPriority = ['active', 'planned', 'paused', 'completed', 'cancelled'].indexOf(right.assignment_status);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return String(right.start_date || '').localeCompare(String(left.start_date || ''));
  });

export const getMemberWorkoutHomePath = () => PATHS.workoutPlan;

export const buildWorkoutProgrammingStats = ({
  programs = [],
  assignments = [],
  libraryItems = [],
} = {}) => {
  const activePrograms = programs.filter((program) => program.status === 'active').length;
  const activeAssignments = assignments.filter((assignment) => (
    assignment.assignment_status === 'active' || assignment.assignment_status === 'planned'
  ));
  const assignedMembers = new Set(activeAssignments.map((assignment) => assignment.member_id).filter(Boolean));

  return {
    activePrograms,
    programTemplates: programs.length,
    libraryCount: libraryItems.length,
    activeAssignments: activeAssignments.length,
    assignedMembers: assignedMembers.size,
  };
};
