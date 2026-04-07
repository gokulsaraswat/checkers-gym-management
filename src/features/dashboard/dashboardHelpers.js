import { PATHS } from '../../app/paths';

const DAY_MS = 24 * 60 * 60 * 1000;

export const createEmptyProgressForm = () => ({
  recorded_on: new Date().toISOString().slice(0, 10),
  weight_kg: '',
  body_fat_percent: '',
  skeletal_muscle_percent: '',
  resting_heart_rate: '',
  notes: '',
});

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const normalisedValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;

  const parsedDate = new Date(normalisedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDate = (value, options, fallback) => {
  const parsedDate = toDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleDateString(undefined, options);
};

const formatTime = (value, options, fallback) => {
  const parsedDate = toDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleTimeString(undefined, options);
};

export const formatDashboardDate = (value, fallback = 'Not set') => formatDate(
  value,
  { month: 'short', day: 'numeric', year: 'numeric' },
  fallback,
);

export const formatDashboardDateTime = (value, fallback = 'Not scheduled') => {
  const parsedDate = toDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatClassTimeRange = (session) => {
  if (!session?.starts_at) {
    return 'Schedule pending';
  }

  const dateLabel = formatDate(session.starts_at, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }, 'Schedule pending');

  const startTime = formatTime(session.starts_at, {
    hour: 'numeric',
    minute: '2-digit',
  }, '');

  const endTime = session.ends_at
    ? formatTime(session.ends_at, {
      hour: 'numeric',
      minute: '2-digit',
    }, '')
    : '';

  return `${dateLabel} • ${startTime}${endTime ? ` - ${endTime}` : ''}`;
};

const differenceInDays = (value, compareTo = new Date()) => {
  const parsedDate = toDate(value);

  if (!parsedDate) {
    return null;
  }

  return Math.ceil((parsedDate.getTime() - compareTo.getTime()) / DAY_MS);
};

const sortDescendingByDate = (items, primaryField, secondaryField = 'created_at') => (
  [...items].sort((left, right) => {
    const leftPrimary = toDate(left?.[primaryField])?.getTime() || 0;
    const rightPrimary = toDate(right?.[primaryField])?.getTime() || 0;

    if (rightPrimary !== leftPrimary) {
      return rightPrimary - leftPrimary;
    }

    const leftSecondary = toDate(left?.[secondaryField])?.getTime() || 0;
    const rightSecondary = toDate(right?.[secondaryField])?.getTime() || 0;
    return rightSecondary - leftSecondary;
  })
);

export const sortWorkoutRows = (workouts = []) => sortDescendingByDate(workouts, 'workout_date');
export const sortProgressRows = (checkpoints = []) => sortDescendingByDate(checkpoints, 'recorded_on');

const countDistinctExercises = (workouts = []) => {
  const exercises = new Set();

  workouts.forEach((workout) => {
    (workout.entries || []).forEach((entry) => {
      if (entry.exercise_name) {
        exercises.add(entry.exercise_name.trim().toLowerCase());
      }
    });
  });

  return exercises.size;
};

export const buildWorkoutStats = (workouts = []) => {
  const sortedWorkouts = sortWorkoutRows(workouts);
  const completedWorkouts = sortedWorkouts.filter((workout) => workout.status === 'completed');
  const plannedWorkouts = sortedWorkouts.filter((workout) => workout.status === 'planned');
  const recentThreshold = Date.now() - (7 * DAY_MS);

  return {
    totalWorkouts: sortedWorkouts.length,
    totalEntries: sortedWorkouts.reduce((sum, workout) => sum + (workout.entries?.length || 0), 0),
    completedWorkouts: completedWorkouts.length,
    plannedWorkouts: plannedWorkouts.length,
    recentWorkouts: sortedWorkouts.filter((workout) => (toDate(workout.workout_date)?.getTime() || 0) >= recentThreshold).length,
    distinctExercises: countDistinctExercises(sortedWorkouts),
    lastWorkout: sortedWorkouts[0] || null,
    lastCompletedWorkout: completedWorkouts[0] || null,
    nextPlannedWorkout: plannedWorkouts
      .filter((workout) => differenceInDays(workout.workout_date) !== null)
      .sort((left, right) => (toDate(left.workout_date)?.getTime() || 0) - (toDate(right.workout_date)?.getTime() || 0))[0] || null,
  };
};

export const buildWorkoutPlanSummary = (workouts = []) => {
  const stats = buildWorkoutStats(workouts);
  const recentCompleted = sortWorkoutRows(workouts).filter((workout) => workout.status === 'completed').slice(0, 6);
  const exerciseCounts = {};

  recentCompleted.forEach((workout) => {
    (workout.entries || []).forEach((entry) => {
      const key = entry.exercise_name?.trim();
      if (!key) {
        return;
      }

      exerciseCounts[key] = (exerciseCounts[key] || 0) + 1;
    });
  });

  const focusExercises = Object.entries(exerciseCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([exercise]) => exercise);

  const upcomingWorkouts = sortWorkoutRows(workouts)
    .filter((workout) => workout.status === 'planned')
    .sort((left, right) => (toDate(left.workout_date)?.getTime() || 0) - (toDate(right.workout_date)?.getTime() || 0))
    .slice(0, 3);

  return {
    ...stats,
    focusExercises,
    upcomingWorkouts,
  };
};

const toNumericDelta = (currentValue, previousValue) => {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
    return null;
  }

  return Number(currentValue) - Number(previousValue);
};

export const buildProgressSummary = (checkpoints = []) => {
  const sortedCheckpoints = sortProgressRows(checkpoints);
  const latest = sortedCheckpoints[0] || null;
  const previous = sortedCheckpoints[1] || null;

  return {
    latest,
    previous,
    entryCount: sortedCheckpoints.length,
    weightDelta: toNumericDelta(latest?.weight_kg, previous?.weight_kg),
    bodyFatDelta: toNumericDelta(latest?.body_fat_percent, previous?.body_fat_percent),
    muscleDelta: toNumericDelta(latest?.skeletal_muscle_percent, previous?.skeletal_muscle_percent),
    latestRecordedOn: latest?.recorded_on || null,
    history: sortedCheckpoints.slice(0, 5),
  };
};

export const buildUpcomingClassSummary = (bookings = []) => {
  const upcoming = [...bookings]
    .filter((booking) => {
      const startsAt = booking?.class_session?.starts_at;
      const bookingDate = toDate(startsAt);
      return bookingDate && bookingDate.getTime() >= Date.now() && booking.booking_status !== 'cancelled';
    })
    .sort((left, right) => (toDate(left?.class_session?.starts_at)?.getTime() || 0) - (toDate(right?.class_session?.starts_at)?.getTime() || 0));

  return {
    upcoming,
    nextClass: upcoming[0] || null,
    upcomingCount: upcoming.filter((booking) => booking.booking_status === 'booked').length,
    waitlistCount: upcoming.filter((booking) => booking.booking_status === 'waitlist').length,
  };
};

const buildAlert = (alert) => alert;

export const getProfileCompleteness = (profile = {}) => {
  const fields = [
    profile.full_name,
    profile.phone,
    profile.date_of_birth,
    profile.address,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
    profile.fitness_goal,
    profile.plan_id,
    profile.waiver_signed_at,
  ];

  const completedFields = fields.filter((value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return Boolean(value);
  }).length;

  return Math.round((completedFields / fields.length) * 100);
};

export const buildDashboardAlerts = ({
  profile,
  workouts = [],
  checkpoints = [],
  classBookings = [],
}) => {
  if (!profile) {
    return [];
  }

  const alerts = [];
  const workoutStats = buildWorkoutStats(workouts);
  const progressSummary = buildProgressSummary(checkpoints);
  const classSummary = buildUpcomingClassSummary(classBookings);
  const today = new Date();

  if (!profile.is_active) {
    alerts.push(buildAlert({
      id: 'account-disabled',
      severity: 'error',
      priority: 100,
      title: 'Account access is currently disabled',
      description: 'Ask an admin to reactivate your membership access before your next visit.',
      actionLabel: profile.role === 'admin' ? 'Open admin panel' : 'Open membership',
      actionTo: profile.role === 'admin' ? PATHS.admin : PATHS.membership,
    }));
  }

  if (profile.membership_status && !['trial', 'active'].includes(profile.membership_status)) {
    alerts.push(buildAlert({
      id: 'membership-status',
      severity: 'warning',
      priority: 95,
      title: `Membership is ${profile.membership_status}`,
      description: 'Review your plan and lifecycle dates so renewals or account access are not blocked.',
      actionLabel: 'Open membership',
      actionTo: PATHS.membership,
    }));
  }

  const daysUntilMembershipEnd = differenceInDays(profile.membership_end_date, today);
  if (daysUntilMembershipEnd !== null && daysUntilMembershipEnd >= 0 && daysUntilMembershipEnd <= 7) {
    alerts.push(buildAlert({
      id: 'membership-ending',
      severity: 'warning',
      priority: 90,
      title: 'Membership renewal is coming up soon',
      description: `Your current membership ends in ${daysUntilMembershipEnd} day${daysUntilMembershipEnd === 1 ? '' : 's'}.`,
      actionLabel: 'Review membership',
      actionTo: PATHS.membership,
    }));
  }

  const daysUntilBilling = differenceInDays(profile.next_billing_date, today);
  if (daysUntilBilling !== null && daysUntilBilling >= 0 && daysUntilBilling <= 5) {
    alerts.push(buildAlert({
      id: 'billing-due',
      severity: 'info',
      priority: 80,
      title: 'Billing date is near',
      description: `Your next billing date is ${formatDashboardDate(profile.next_billing_date)}.`,
      actionLabel: 'Open membership',
      actionTo: PATHS.membership,
    }));
  }

  if (!profile.plan_id) {
    alerts.push(buildAlert({
      id: 'missing-plan',
      severity: 'info',
      priority: 70,
      title: 'No plan has been assigned yet',
      description: 'Ask the gym team to attach the right membership plan to your profile.',
      actionLabel: 'Open membership',
      actionTo: PATHS.membership,
    }));
  }

  if (!profile.waiver_signed_at) {
    alerts.push(buildAlert({
      id: 'waiver',
      severity: 'info',
      priority: 68,
      title: 'Liability waiver is still pending',
      description: 'Sign the current waiver from your membership page so staff can verify it quickly.',
      actionLabel: 'Sign waiver',
      actionTo: PATHS.membership,
    }));
  }

  if (!profile.emergency_contact_name || !profile.emergency_contact_phone) {
    alerts.push(buildAlert({
      id: 'emergency-contact',
      severity: 'info',
      priority: 60,
      title: 'Emergency contact details are incomplete',
      description: 'Complete those fields so staff can respond faster during onsite incidents.',
      actionLabel: 'Update profile',
      actionTo: PATHS.membership,
    }));
  }

  const lastActivityDate = workoutStats.lastWorkout?.workout_date;
  const daysSinceLastWorkout = differenceInDays(lastActivityDate, today);
  if (!workouts.length || (daysSinceLastWorkout !== null && daysSinceLastWorkout < -7)) {
    alerts.push(buildAlert({
      id: 'training-gap',
      severity: 'warning',
      priority: 58,
      title: workouts.length ? 'No recent training activity was logged' : 'No workouts logged yet',
      description: workouts.length
        ? `Your last workout was on ${formatDashboardDate(lastActivityDate)}.`
        : 'Log your first workout to start building a training history.',
      actionLabel: 'Open tracker',
      actionTo: `${PATHS.dashboard}#workout-tracker`,
    }));
  }

  if (!progressSummary.entryCount) {
    alerts.push(buildAlert({
      id: 'progress',
      severity: 'info',
      priority: 50,
      title: 'No progress snapshot recorded yet',
      description: 'Add a quick body metric entry so you can start measuring changes over time.',
      actionLabel: 'Log snapshot',
      actionTo: `${PATHS.dashboard}#progress-snapshot`,
    }));
  }

  if (classSummary.nextClass) {
    const hoursUntilClass = Math.ceil(((toDate(classSummary.nextClass.class_session?.starts_at)?.getTime() || 0) - Date.now()) / (60 * 60 * 1000));

    if (hoursUntilClass >= 0 && hoursUntilClass <= 24) {
      alerts.push(buildAlert({
        id: 'next-class',
        severity: 'success',
        priority: 45,
        title: 'Upcoming class reminder',
        description: `${classSummary.nextClass.class_session?.title || 'Your next class'} starts ${hoursUntilClass <= 1 ? 'within the next hour' : `in about ${hoursUntilClass} hours`}.`,
        actionLabel: 'View classes',
        actionTo: `${PATHS.dashboard}#upcoming-classes`,
      }));
    }
  }

  return alerts
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 6);
};

const BOOKING_STATUS_META = {
  booked: {
    label: 'Booked',
    background: '#ecfdf3',
    color: '#047857',
  },
  waitlist: {
    label: 'Waitlist',
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  attended: {
    label: 'Attended',
    background: '#fef3c7',
    color: '#92400e',
  },
  missed: {
    label: 'Missed',
    background: '#fef2f2',
    color: '#b91c1c',
  },
  cancelled: {
    label: 'Cancelled',
    background: '#f8fafc',
    color: '#475569',
  },
};

export const getBookingStatusMeta = (status) => BOOKING_STATUS_META[status] || {
  label: 'Scheduled',
  background: '#f8fafc',
  color: '#475569',
};

export const getBookingStatusChipSx = (status) => {
  const meta = getBookingStatusMeta(status);

  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const formatNumericChange = (value, suffix = '') => {
  if (value === null || value === undefined) {
    return '—';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${Number(value).toFixed(1)}${suffix}`;
};
