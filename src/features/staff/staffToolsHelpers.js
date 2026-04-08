export const STAFF_ASSIGNMENT_ROLE_OPTIONS = [
  { value: 'coach', label: 'Coach' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'nutritionist', label: 'Nutritionist' },
  { value: 'account_manager', label: 'Account manager' },
  { value: 'front_desk', label: 'Front desk' },
  { value: 'support', label: 'Support' },
];

export const STAFF_ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STAFF_SHIFT_TYPE_OPTIONS = [
  { value: 'general', label: 'General shift' },
  { value: 'opening', label: 'Opening shift' },
  { value: 'mid', label: 'Mid shift' },
  { value: 'closing', label: 'Closing shift' },
  { value: 'personal_training', label: 'Personal training' },
  { value: 'group_classes', label: 'Group classes' },
  { value: 'front_desk', label: 'Front desk' },
];

export const STAFF_COMMISSION_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export const STAFF_COMMISSION_SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'membership', label: 'Membership' },
  { value: 'billing', label: 'Billing' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'class', label: 'Class coaching' },
  { value: 'workout', label: 'Workout programming' },
  { value: 'nutrition', label: 'Nutrition coaching' },
  { value: 'lead', label: 'Lead conversion' },
];

export const STAFF_PAYOUT_CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual' },
];

const ASSIGNMENT_STATUS_META = {
  active: { label: 'Active', background: '#ecfdf3', color: '#047857' },
  paused: { label: 'Paused', background: '#fef3c7', color: '#92400e' },
  completed: { label: 'Completed', background: '#eff6ff', color: '#1d4ed8' },
  cancelled: { label: 'Cancelled', background: '#fef2f2', color: '#b91c1c' },
};

const COMMISSION_STATUS_META = {
  pending: { label: 'Pending', background: '#eff6ff', color: '#1d4ed8' },
  approved: { label: 'Approved', background: '#fef3c7', color: '#92400e' },
  paid: { label: 'Paid', background: '#ecfdf3', color: '#047857' },
  void: { label: 'Void', background: '#f8fafc', color: '#475569' },
};

const SHIFT_TYPE_LABELS = {
  general: 'General shift',
  opening: 'Opening shift',
  mid: 'Mid shift',
  closing: 'Closing shift',
  personal_training: 'Personal training',
  group_classes: 'Group classes',
  front_desk: 'Front desk',
};

const assignmentStatusMeta = (value) => ASSIGNMENT_STATUS_META[value] || {
  label: value || 'Unknown',
  background: '#f8fafc',
  color: '#334155',
};

const commissionStatusMeta = (value) => COMMISSION_STATUS_META[value] || {
  label: value || 'Unknown',
  background: '#f8fafc',
  color: '#334155',
};

export const getAssignmentStatusLabel = (value) => assignmentStatusMeta(value).label;

export const getAssignmentStatusChipSx = (value) => {
  const meta = assignmentStatusMeta(value);
  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const getCommissionStatusLabel = (value) => commissionStatusMeta(value).label;

export const getCommissionStatusChipSx = (value) => {
  const meta = commissionStatusMeta(value);
  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const getShiftTypeLabel = (value) => SHIFT_TYPE_LABELS[value] || 'Shift';

export const formatStaffDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatStaffDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatCurrency = (value, currencyCode = 'INR') => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: currencyCode || 'INR',
  maximumFractionDigits: 2,
}).format(Number(value || 0));

export const formatHours = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return '—';
  }

  return `${numericValue.toFixed(1)} hrs`;
};

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const createEmptyAssignmentForm = (staffId = '') => ({
  id: '',
  staff_id: staffId,
  member_id: '',
  assignment_role: 'coach',
  focus_area: '',
  status: 'active',
  starts_on: todayIsoDate(),
  ends_on: '',
  notes: '',
});

export const createEmptyShiftReportForm = (staffId = '') => ({
  id: '',
  staff_id: staffId,
  shift_date: todayIsoDate(),
  shift_type: 'general',
  hours_worked: '',
  member_check_ins: 0,
  pt_sessions_completed: 0,
  classes_coached: 0,
  lead_follow_ups: 0,
  summary: '',
  follow_up: '',
  energy_score: 7,
  needs_manager_review: false,
});

export const createEmptyCompensationForm = (staffId = '') => ({
  staff_id: staffId,
  monthly_retainer: 0,
  commission_rate_membership: 0,
  commission_rate_pt: 0,
  per_session_bonus: 0,
  payout_cycle: 'monthly',
  is_active: true,
  notes: '',
});

export const createEmptyCommissionEntryForm = (staffId = '') => ({
  id: '',
  staff_id: staffId,
  source_module: 'manual',
  source_reference: '',
  description: '',
  amount: '',
  currency_code: 'INR',
  status: 'pending',
  earned_on: todayIsoDate(),
  payout_due_on: '',
  paid_on: '',
  notes: '',
});

export const sortAssignments = (assignments = []) => [...assignments].sort((left, right) => {
  const statusOrder = {
    active: 0,
    paused: 1,
    completed: 2,
    cancelled: 3,
  };

  const leftOrder = statusOrder[left?.status] ?? 9;
  const rightOrder = statusOrder[right?.status] ?? 9;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftDate = left?.starts_on || '';
  const rightDate = right?.starts_on || '';

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  return String(left?.member?.full_name || left?.member?.email || '').localeCompare(
    String(right?.member?.full_name || right?.member?.email || ''),
  );
});

export const sortShiftReports = (reports = []) => [...reports].sort((left, right) => {
  const leftDate = `${left?.shift_date || ''}${left?.created_at || ''}`;
  const rightDate = `${right?.shift_date || ''}${right?.created_at || ''}`;
  return rightDate.localeCompare(leftDate);
});

export const sortCommissionEntries = (entries = []) => [...entries].sort((left, right) => {
  const statusOrder = {
    pending: 0,
    approved: 1,
    paid: 2,
    void: 3,
  };

  const leftOrder = statusOrder[left?.status] ?? 9;
  const rightOrder = statusOrder[right?.status] ?? 9;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftDate = `${left?.earned_on || ''}${left?.created_at || ''}`;
  const rightDate = `${right?.earned_on || ''}${right?.created_at || ''}`;
  return rightDate.localeCompare(leftDate);
});

export const normaliseCompensationForm = (profile = null, staffId = '') => ({
  ...createEmptyCompensationForm(staffId),
  ...(profile || {}),
  staff_id: profile?.staff_id || staffId,
});

export const buildStaffToolsStats = ({
  assignments = [],
  commissionEntries = [],
  upcomingSessions = [],
  shiftReports = [],
} = {}) => {
  const activeAssignments = assignments.filter((item) => item.status === 'active').length;
  const pendingCommissionTotal = commissionEntries
    .filter((item) => item.status === 'pending' || item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidThisMonth = commissionEntries
    .filter((item) => item.status === 'paid' && String(item.paid_on || '').slice(0, 7) === todayIsoDate().slice(0, 7))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const flaggedShiftReports = shiftReports.filter((item) => item.needs_manager_review).length;

  return {
    activeAssignments,
    upcomingSessions: upcomingSessions.length,
    pendingCommissionTotal,
    paidThisMonth,
    flaggedShiftReports,
  };
};
