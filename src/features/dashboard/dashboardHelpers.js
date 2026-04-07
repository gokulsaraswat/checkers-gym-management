import { PATHS } from '../../app/paths';

const normaliseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const nextValue = value.includes?.('T') ? value : `${value}T00:00:00`;
  const parsedValue = new Date(nextValue);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
};

export const formatDashboardDate = (value, fallback = 'Not set') => {
  const parsedValue = normaliseDateValue(value);

  if (!parsedValue) {
    return fallback;
  }

  return parsedValue.toLocaleDateString();
};

export const formatClassTimeRange = (session = {}) => {
  const startsAt = normaliseDateValue(session.starts_at);
  const endsAt = normaliseDateValue(session.ends_at);

  if (!startsAt) {
    return 'Schedule pending';
  }

  const dayLabel = startsAt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const startLabel = startsAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!endsAt) {
    return `${dayLabel} • ${startLabel}`;
  }

  const endLabel = endsAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dayLabel} • ${startLabel} – ${endLabel}`;
};

export const sortWorkoutRows = (rows = []) => [...rows].sort((left, right) => {
  const leftKey = `${left?.workout_date || ''}${left?.created_at || ''}`;
  const rightKey = `${right?.workout_date || ''}${right?.created_at || ''}`;
  return rightKey.localeCompare(leftKey);
});

export const sortProgressRows = (rows = []) => [...rows].sort((left, right) => {
  const leftKey = `${left?.recorded_on || ''}${left?.created_at || ''}`;
  const rightKey = `${right?.recorded_on || ''}${right?.created_at || ''}`;
  return rightKey.localeCompare(leftKey);
});

export const createEmptyProgressForm = () => ({
  id: '',
  recorded_on: new Date().toISOString().slice(0, 10),
  weight_kg: '',
  body_fat_percent: '',
  skeletal_muscle_percent: '',
  resting_heart_rate: '',
  notes: '',
});

export const getProfileCompleteness = (profile = {}) => {
  const trackedFields = [
    profile.full_name,
    profile.phone,
    profile.date_of_birth,
    profile.address,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
    profile.fitness_goal,
    profile.waiver_signed_at,
    profile.plan_id,
  ];

  const completed = trackedFields.filter((value) => Boolean(value)).length;
  return Math.round((completed / trackedFields.length) * 100);
};

export const buildWorkoutStats = (workouts = []) => {
  const lastWeekThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const recentWorkouts = workouts.filter((workout) => {
    const parsedWorkoutDate = normaliseDateValue(workout.workout_date);
    return parsedWorkoutDate && parsedWorkoutDate.getTime() >= lastWeekThreshold;
  }).length;

  return {
    totalWorkouts: workouts.length,
    recentWorkouts,
  };
};

export const buildWorkoutPlanSummary = (workouts = [], assignments = []) => {
  const activeAssignment = assignments.find((assignment) => (
    assignment.assignment_status === 'active' || assignment.assignment_status === 'planned'
  )) || assignments[0] || null;
  const activeDays = activeAssignment?.program?.days || [];
  const completedByDay = workouts.reduce((accumulator, workout) => {
    if (!workout.program_day_id) {
      return accumulator;
    }

    accumulator[workout.program_day_id] = (accumulator[workout.program_day_id] || 0) + 1;
    return accumulator;
  }, {});

  const completedPlanSessions = workouts.filter((workout) => workout.program_assignment_id).length;
  const plannedWorkoutLogs = workouts.filter((workout) => workout.status === 'planned').length;

  return {
    activeAssignment,
    activeProgramName: activeAssignment?.program?.name || '',
    activeDayCount: activeDays.length,
    activeExerciseCount: activeDays.reduce((count, day) => count + (day.exercises?.length || 0), 0),
    completedPlanSessions,
    plannedWorkouts: activeDays.length || plannedWorkoutLogs,
    nextPlannedWorkout: activeAssignment
      ? { workout_date: activeAssignment.start_date || new Date().toISOString().slice(0, 10) }
      : workouts.find((workout) => workout.status === 'planned') || null,
    linkedWorkoutCount: workouts.filter((workout) => workout.program_assignment_id === activeAssignment?.id).length,
    completedDayCount: activeDays.filter((day) => completedByDay[day.id]).length,
  };
};

export const buildProgressSummary = (checkpoints = []) => {
  const latest = checkpoints[0] || null;
  const previous = checkpoints[1] || null;

  return {
    latest,
    previous,
    totalSnapshots: checkpoints.length,
    weightDelta: latest?.weight_kg != null && previous?.weight_kg != null
      ? Number(latest.weight_kg) - Number(previous.weight_kg)
      : null,
  };
};

export const buildUpcomingClassSummary = (bookings = []) => {
  const sorted = [...bookings].sort((left, right) => {
    const leftDate = normaliseDateValue(left?.class_session?.starts_at)?.getTime() || 0;
    const rightDate = normaliseDateValue(right?.class_session?.starts_at)?.getTime() || 0;
    return leftDate - rightDate;
  });

  return {
    upcoming: sorted,
    upcomingCount: sorted.filter((booking) => booking.booking_status === 'booked').length,
    waitlistCount: sorted.filter((booking) => booking.booking_status === 'waitlist').length,
  };
};

const alertTemplate = (overrides = {}) => ({
  id: `${overrides.title || 'alert'}-${overrides.description || ''}`,
  severity: 'info',
  title: '',
  description: '',
  actionLabel: '',
  actionTo: '',
  ...overrides,
});

export const buildDashboardAlerts = ({
  profile,
  workouts = [],
  checkpoints = [],
  classBookings = [],
  assignments = [],
} = {}) => {
  const alerts = [];

  if (profile && !profile.waiver_signed_at) {
    alerts.push(alertTemplate({
      id: 'waiver',
      severity: 'warning',
      title: 'Liability waiver still pending',
      description: 'Open your membership page and sign the current waiver before your next visit.',
      actionLabel: 'Open membership',
      actionTo: PATHS.membership,
    }));
  }

  if (profile && profile.membership_end_date) {
    const membershipEnd = normaliseDateValue(profile.membership_end_date);

    if (membershipEnd) {
      const diffDays = Math.ceil((membershipEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      if (diffDays <= 14) {
        alerts.push(alertTemplate({
          id: 'membership-ending',
          severity: diffDays < 0 ? 'error' : 'warning',
          title: diffDays < 0 ? 'Membership has expired' : 'Membership renewal coming up',
          description: diffDays < 0
            ? 'Renew or update your membership status to continue booking classes and logging workouts.'
            : `Your current membership ends in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
          actionLabel: 'Review membership',
          actionTo: PATHS.membership,
        }));
      }
    }
  }

  if (!assignments.length) {
    alerts.push(alertTemplate({
      id: 'no-program',
      title: 'No trainer program assigned yet',
      description: 'Ask a coach or staff member to assign a structured workout plan so your dashboard can track compliance.',
      actionLabel: 'Open account',
      actionTo: PATHS.account,
    }));
  }

  if (!workouts.length) {
    alerts.push(alertTemplate({
      id: 'no-workouts',
      title: 'Log your first workout',
      description: 'Use the workout tracker below or open your workout plan to start recording completed sessions.',
      actionLabel: 'Open workout plan',
      actionTo: PATHS.workoutPlan,
    }));
  }

  if (!checkpoints.length) {
    alerts.push(alertTemplate({
      id: 'no-progress',
      title: 'Capture a progress snapshot',
      description: 'Save weight, body fat, or notes weekly so both you and your trainer can see momentum.',
      actionLabel: 'Stay on dashboard',
      actionTo: PATHS.dashboard,
    }));
  }

  if (classBookings.some((booking) => booking.booking_status === 'waitlist')) {
    alerts.push(alertTemplate({
      id: 'waitlist',
      severity: 'info',
      title: 'One or more classes are still on the waitlist',
      description: 'Keep an eye on your bookings page for automatic promotions when a spot opens up.',
      actionLabel: 'Open bookings',
      actionTo: PATHS.bookings,
    }));
  }

  return alerts.slice(0, 5);
};

const BOOKING_STATUS_META = {
  booked: { label: 'Booked', background: '#ecfdf3', color: '#047857' },
  waitlist: { label: 'Waitlist', background: '#fff7ed', color: '#c2410c' },
  cancelled: { label: 'Cancelled', background: '#fef2f2', color: '#b91c1c' },
  attended: { label: 'Attended', background: '#eef2ff', color: '#4338ca' },
  missed: { label: 'Missed', background: '#f8fafc', color: '#475569' },
};

export const getBookingStatusMeta = (status) => BOOKING_STATUS_META[status] || BOOKING_STATUS_META.booked;

export const getBookingStatusChipSx = (status) => {
  const meta = getBookingStatusMeta(status);

  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};
