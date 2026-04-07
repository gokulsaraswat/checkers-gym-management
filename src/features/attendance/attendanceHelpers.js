const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
};

const isEligibleByRoleAndStatus = (role, isActive, membershipStatus) => {
  if (!isActive) {
    return false;
  }

  if (role === 'staff' || role === 'admin') {
    return true;
  }

  return membershipStatus === 'active' || membershipStatus === 'trial';
};

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const formatAttendanceDate = (value) => {
  const date = toDate(value);

  if (!date) {
    return '—';
  }

  return dateFormatter.format(date);
};

export const formatAttendanceDateTime = (value) => {
  const date = toDate(value);

  if (!date) {
    return '—';
  }

  return dateTimeFormatter.format(date);
};

export const getAttendanceStatusLabel = (status) => {
  if (status === 'checked_in') {
    return 'Checked in';
  }

  if (status === 'missed_checkout') {
    return 'Missing checkout';
  }

  return 'Checked out';
};

export const getAttendanceStatusChipSx = (status) => {
  if (status === 'checked_in') {
    return {
      bgcolor: '#e8f5e9',
      color: '#1b5e20',
      fontWeight: 700,
    };
  }

  if (status === 'missed_checkout') {
    return {
      bgcolor: '#fff7e6',
      color: '#9a6700',
      fontWeight: 700,
    };
  }

  return {
    bgcolor: '#edf2f7',
    color: '#1f2937',
    fontWeight: 700,
  };
};

export const getAttendanceSourceLabel = (source) => {
  if (source === 'self_service') {
    return 'Self service';
  }

  if (source === 'admin_panel') {
    return 'Admin desk';
  }

  if (source === 'staff_desk') {
    return 'Front desk';
  }

  if (source === 'manual_import') {
    return 'Manual import';
  }

  return 'System';
};

export const calculateVisitDurationMinutes = (visit, now = new Date()) => {
  const checkedInAt = toDate(visit?.checked_in_at);
  const checkedOutAt = toDate(visit?.checked_out_at) || now;

  if (!checkedInAt || !checkedOutAt) {
    return 0;
  }

  const durationMs = checkedOutAt.getTime() - checkedInAt.getTime();

  if (durationMs <= 0) {
    return 0;
  }

  return Math.round(durationMs / 60000);
};

export const formatVisitDuration = (visit, now = new Date()) => {
  const minutes = calculateVisitDurationMinutes(visit, now);

  if (!minutes) {
    return visit?.checked_out_at ? '0m' : 'Just now';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}m`;
  }

  if (!remainingMinutes) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const isAttendanceEligibleProfile = (profile) => (
  isEligibleByRoleAndStatus(profile?.role, Boolean(profile?.is_active), profile?.membership_status)
);

export const getAttendanceEligibilityMessage = (profile) => {
  if (!profile?.is_active) {
    return 'Your account access is paused. Ask staff to reactivate you before checking in.';
  }

  if (profile?.role === 'staff' || profile?.role === 'admin') {
    return 'Staff and admin accounts can use the same attendance flow.';
  }

  if (profile?.membership_status === 'active') {
    return 'Your membership is active and ready for check-in.';
  }

  if (profile?.membership_status === 'trial') {
    return 'Your trial access is active and you can check in.';
  }

  if (profile?.membership_status === 'expired') {
    return 'Your membership has expired. Renew or see the front desk to regain access.';
  }

  if (profile?.membership_status === 'suspended') {
    return 'Your membership is suspended. Please speak with the gym team before checking in.';
  }

  return 'Your profile is not yet eligible for self-service check-in.';
};

export const buildAttendanceSummary = (visits = []) => {
  const orderedVisits = [...visits].sort((left, right) => (
    new Date(right.checked_in_at).getTime() - new Date(left.checked_in_at).getTime()
  ));
  const today = todayIsoDate();
  const now = new Date();
  const openVisit = orderedVisits.find((visit) => !visit.checked_out_at) || null;
  const lastCompletedVisit = orderedVisits.find((visit) => Boolean(visit.checked_out_at)) || null;

  const thisMonthVisits = orderedVisits.filter((visit) => {
    const date = toDate(visit.checked_in_at);

    return Boolean(
      date
      && date.getUTCFullYear() === now.getUTCFullYear()
      && date.getUTCMonth() === now.getUTCMonth(),
    );
  });

  const totalMinutesThisMonth = thisMonthVisits.reduce(
    (sum, visit) => sum + calculateVisitDurationMinutes(visit, now),
    0,
  );

  return {
    orderedVisits,
    openVisit,
    lastCompletedVisit,
    totalVisits: orderedVisits.length,
    todayVisits: orderedVisits.filter((visit) => visit.visit_date === today).length,
    thisMonthVisits: thisMonthVisits.length,
    totalMinutesThisMonth,
    totalHoursThisMonth: (totalMinutesThisMonth / 60).toFixed(1),
  };
};

export const buildStaffAttendanceStats = (todayVisits = [], openVisits = []) => {
  const uniqueMembers = new Set(todayVisits.map((visit) => visit.profile_id));

  return {
    totalVisitsToday: todayVisits.length,
    uniqueMembersToday: uniqueMembers.size,
    openVisitsNow: openVisits.length,
    completedVisitsToday: todayVisits.filter((visit) => Boolean(visit.checked_out_at)).length,
    selfServiceCount: todayVisits.filter((visit) => visit.check_in_source === 'self_service').length,
    deskAssistedCount: todayVisits.filter((visit) => ['staff_desk', 'admin_panel'].includes(visit.check_in_source)).length,
  };
};

export const isDeskEligibleMember = (member) => (
  isEligibleByRoleAndStatus(member?.role, Boolean(member?.is_active), member?.membership_status)
);

export const getDeskEligibilityLabel = (member) => {
  if (!member?.is_active) {
    return 'Access paused';
  }

  if (member?.role === 'staff' || member?.role === 'admin') {
    return 'Operational account';
  }

  if (member?.membership_status === 'active') {
    return 'Ready';
  }

  if (member?.membership_status === 'trial') {
    return 'Trial access';
  }

  if (member?.membership_status === 'expired') {
    return 'Expired';
  }

  if (member?.membership_status === 'suspended') {
    return 'Suspended';
  }

  return 'Needs review';
};
