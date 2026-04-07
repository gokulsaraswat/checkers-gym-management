export const SESSION_TYPE_OPTIONS = [
  { value: 'group_class', label: 'Group class' },
  { value: 'personal_training', label: 'Personal training' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'event', label: 'Event' },
  { value: 'open_gym', label: 'Open gym block' },
];

export const SESSION_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export const SESSION_VISIBILITY_OPTIONS = [
  { value: 'members', label: 'Visible to members' },
  { value: 'staff_only', label: 'Staff only' },
];

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const addDaysIso = (value, days) => {
  const nextDate = new Date(`${value}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + Number(days || 0));
  return nextDate.toISOString().slice(0, 10);
};

export const createScheduleFilters = () => ({
  startDate: todayIsoDate(),
  endDate: addDaysIso(todayIsoDate(), 13),
  sessionType: 'all',
  status: 'scheduled',
  trainerId: 'all',
  roomName: 'all',
  includeInactive: false,
});

const pad = (value) => String(value).padStart(2, '0');

export const toDateTimeLocalInputValue = (value, minuteOffset = 0) => {
  const nextDate = value ? new Date(value) : new Date();

  if (!value && minuteOffset) {
    nextDate.setMinutes(nextDate.getMinutes() + minuteOffset);
  }

  if (Number.isNaN(nextDate.getTime())) {
    return '';
  }

  return `${[
    nextDate.getFullYear(),
    pad(nextDate.getMonth() + 1),
    pad(nextDate.getDate()),
  ].join('-')}T${pad(nextDate.getHours())}:${pad(nextDate.getMinutes())}`;
};

export const createEmptySessionForm = () => ({
  id: '',
  title: '',
  description: '',
  sessionType: 'group_class',
  trainerId: '',
  trainerName: '',
  roomName: '',
  branchName: 'Main branch',
  equipmentNotes: '',
  startsAt: toDateTimeLocalInputValue(null, 60),
  endsAt: toDateTimeLocalInputValue(null, 120),
  capacity: '20',
  visibility: 'members',
  scheduleStatus: 'scheduled',
  isActive: true,
  repeatWeeks: '0',
});

export const toSessionForm = (session = {}) => ({
  id: session.id || '',
  title: session.title || '',
  description: session.description || '',
  sessionType: session.session_type || 'group_class',
  trainerId: session.trainer_id || session.trainer?.id || '',
  trainerName: session.trainer_name || session.trainer?.full_name || session.coach_name || '',
  roomName: session.room_name || '',
  branchName: session.branch_name || 'Main branch',
  equipmentNotes: session.equipment_notes || '',
  startsAt: toDateTimeLocalInputValue(session.starts_at),
  endsAt: toDateTimeLocalInputValue(session.ends_at),
  capacity: String(session.capacity || 20),
  visibility: session.visibility || 'members',
  scheduleStatus: session.schedule_status || 'scheduled',
  isActive: Boolean(session.is_active),
  repeatWeeks: '0',
});

export const getSessionTypeLabel = (value) => (
  SESSION_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Class session'
);

export const getSessionStatusLabel = (value) => (
  SESSION_STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Scheduled'
);

export const getSessionStatusChipSx = (value) => {
  if (value === 'completed') {
    return { bgcolor: '#ecfdf3', color: '#027a48', fontWeight: 700 };
  }

  if (value === 'cancelled') {
    return { bgcolor: '#fef3f2', color: '#b42318', fontWeight: 700 };
  }

  return { bgcolor: '#fff7ed', color: '#b54708', fontWeight: 700 };
};

export const getVisibilityChipSx = (value) => (
  value === 'staff_only'
    ? { bgcolor: '#eff8ff', color: '#175cd3', fontWeight: 700 }
    : { bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }
);

export const getVisibilityLabel = (value) => (
  SESSION_VISIBILITY_OPTIONS.find((option) => option.value === value)?.label || 'Visible to members'
);

export const normaliseTrainerLabel = (session = {}) => (
  session.trainer?.full_name
    || session.trainer_name
    || session.coach_name
    || 'Unassigned'
);

export const formatSessionDate = (value) => {
  if (!value) {
    return 'Date TBD';
  }

  const nextDate = new Date(value);

  if (Number.isNaN(nextDate.getTime())) {
    return 'Date TBD';
  }

  return nextDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

export const formatSessionTimeRange = (startsAt, endsAt) => {
  if (!startsAt) {
    return 'Time TBD';
  }

  const startDate = new Date(startsAt);

  if (Number.isNaN(startDate.getTime())) {
    return 'Time TBD';
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!endsAt) {
    return formatter.format(startDate);
  }

  const endDate = new Date(endsAt);

  if (Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

export const buildClassScheduleStats = (sessions = []) => {
  const now = Date.now();

  const scheduled = sessions.filter((session) => session.schedule_status === 'scheduled');
  const today = sessions.filter((session) => {
    if (!session.starts_at) {
      return false;
    }

    return session.starts_at.slice(0, 10) === todayIsoDate();
  });

  const trainers = new Set(sessions.map((session) => normaliseTrainerLabel(session)).filter(Boolean));
  const rooms = new Set(sessions.map((session) => session.room_name).filter(Boolean));
  const upcoming = sessions.filter((session) => {
    if (!session.starts_at) {
      return false;
    }

    const startValue = new Date(session.starts_at).getTime();
    return !Number.isNaN(startValue) && startValue >= now && session.schedule_status === 'scheduled';
  });

  return {
    total: sessions.length,
    scheduled: scheduled.length,
    today: today.length,
    uniqueTrainers: trainers.size,
    roomsInUse: rooms.size,
    upcoming: upcoming.length,
    cancelled: sessions.filter((session) => session.schedule_status === 'cancelled').length,
  };
};

export const groupClassSessionsByDate = (sessions = []) => {
  const grouped = sessions.reduce((accumulator, session) => {
    const key = session.starts_at?.slice(0, 10) || 'unscheduled';
    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(session);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([dateKey, rows]) => ({
      dateKey,
      label: dateKey === 'unscheduled' ? 'Schedule TBD' : formatSessionDate(dateKey),
      rows: [...rows].sort((left, right) => String(left.starts_at || '').localeCompare(String(right.starts_at || ''))),
    }));
};

export const buildRoomOptions = (sessions = []) => (
  Array.from(new Set(sessions.map((session) => session.room_name).filter(Boolean))).sort((left, right) => left.localeCompare(right))
);

export const buildTrainerOptions = (sessions = [], trainers = []) => {
  const byId = new Map();

  trainers.forEach((trainer) => {
    byId.set(trainer.id, {
      value: trainer.id,
      label: trainer.full_name || trainer.email || 'Trainer',
    });
  });

  sessions.forEach((session) => {
    const trainerId = session.trainer_id || session.trainer?.id;
    const trainerLabel = normaliseTrainerLabel(session);

    if (!trainerId || byId.has(trainerId)) {
      return;
    }

    byId.set(trainerId, {
      value: trainerId,
      label: trainerLabel,
    });
  });

  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label));
};
