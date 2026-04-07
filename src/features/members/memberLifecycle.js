
export const MEMBERSHIP_STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const MEMBERSHIP_STATUS_META = {
  trial: {
    label: 'Trial',
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  active: {
    label: 'Active',
    background: '#ecfdf3',
    color: '#047857',
  },
  suspended: {
    label: 'Suspended',
    background: '#fff7ed',
    color: '#c2410c',
  },
  expired: {
    label: 'Expired',
    background: '#fef2f2',
    color: '#b91c1c',
  },
  cancelled: {
    label: 'Cancelled',
    background: '#f8fafc',
    color: '#475569',
  },
};

export const CURRENT_LIABILITY_WAIVER_VERSION = 'liability-v1';

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const getMembershipStatusMeta = (status) => MEMBERSHIP_STATUS_META[status] || {
  label: 'Unknown',
  background: '#f8fafc',
  color: '#475569',
};

export const getMembershipStatusLabel = (status) => getMembershipStatusMeta(status).label;

export const getMembershipStatusChipSx = (status) => {
  const meta = getMembershipStatusMeta(status);

  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const getWaiverChipSx = (hasSignedWaiver) => ({
  bgcolor: hasSignedWaiver ? '#ecfdf3' : '#fff7ed',
  color: hasSignedWaiver ? '#047857' : '#c2410c',
  fontWeight: 700,
});

export const formatDateValue = (value, fallback = 'Not set') => {
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

export const formatDateTimeValue = (value, fallback = 'Not recorded') => {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleString();
};

export const isMembershipLive = (status) => ['trial', 'active'].includes(status);

export const buildMemberFormValues = (profile = {}) => ({
  fullName: profile.full_name || '',
  phone: profile.phone || '',
  dateOfBirth: profile.date_of_birth || '',
  address: profile.address || '',
  emergencyContactName: profile.emergency_contact_name || '',
  emergencyContactPhone: profile.emergency_contact_phone || '',
  fitnessGoal: profile.fitness_goal || '',
  role: profile.role || 'member',
  planId: profile.plan_id || '',
  isActive: Boolean(profile.is_active),
  membershipStatus: profile.membership_status || 'trial',
  membershipStartDate: profile.membership_start_date || '',
  membershipEndDate: profile.membership_end_date || '',
  nextBillingDate: profile.next_billing_date || '',
});

export const getWaiverStatusLabel = (profile) => (
  profile?.waiver_signed_at ? `Signed (${profile.current_waiver_version || 'version saved'})` : 'Waiver pending'
);
