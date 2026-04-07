import { getMembershipStatusLabel } from '../members/memberLifecycle';

export const APP_ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

export const ACCESS_FILTER_OPTIONS = [
  { value: 'all', label: 'All access states' },
  { value: 'active', label: 'Access enabled' },
  { value: 'inactive', label: 'Access paused' },
];

export const MEMBER_SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'renewal', label: 'Renewal soonest' },
  { value: 'membership', label: 'Membership status' },
];

const ROLE_META = {
  member: {
    label: 'Member',
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  staff: {
    label: 'Staff',
    background: '#fef3c7',
    color: '#b45309',
  },
  admin: {
    label: 'Admin',
    background: '#fce7f3',
    color: '#be185d',
  },
};

const safeLower = (value) => String(value ?? '').trim().toLowerCase();

const dateToTimestamp = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getTime();
};

export const getRoleLabel = (role) => ROLE_META[role]?.label || 'Unknown';

export const getRoleChipSx = (role) => ({
  bgcolor: ROLE_META[role]?.background || '#f8fafc',
  color: ROLE_META[role]?.color || '#475569',
  fontWeight: 700,
});

export const filterMembers = (members = [], filters = {}) => {
  const query = safeLower(filters.query);
  const role = filters.role || 'all';
  const status = filters.status || 'all';
  const planId = filters.planId || 'all';
  const access = filters.access || 'all';
  const sort = filters.sort || 'recent';

  const filtered = members.filter((member) => {
    if (query) {
      const haystack = [
        member.full_name,
        member.email,
        member.phone,
        member.fitness_goal,
        member.plan?.name,
      ].map(safeLower).join(' ');

      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (role !== 'all' && member.role !== role) {
      return false;
    }

    if (status !== 'all' && member.membership_status !== status) {
      return false;
    }

    if (planId !== 'all' && (member.plan_id || '') !== planId) {
      return false;
    }

    if (access === 'active' && !member.is_active) {
      return false;
    }

    if (access === 'inactive' && member.is_active) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];

  sorted.sort((left, right) => {
    if (sort === 'name') {
      return String(left.full_name || left.email || '').localeCompare(String(right.full_name || right.email || ''));
    }

    if (sort === 'renewal') {
      return dateToTimestamp(left.membership_end_date, Number.MAX_SAFE_INTEGER)
        - dateToTimestamp(right.membership_end_date, Number.MAX_SAFE_INTEGER);
    }

    if (sort === 'membership') {
      return getMembershipStatusLabel(left.membership_status).localeCompare(getMembershipStatusLabel(right.membership_status));
    }

    return dateToTimestamp(right.created_at, 0) - dateToTimestamp(left.created_at, 0);
  });

  return sorted;
};

export const buildAdminStats = (members = [], plans = [], activity = []) => {
  const liveStatuses = new Set(['trial', 'active']);

  return {
    totalMembers: members.length,
    liveMembers: members.filter((member) => member.is_active && liveStatuses.has(member.membership_status)).length,
    staffCount: members.filter((member) => ['staff', 'admin'].includes(member.role)).length,
    attentionRequired: members.filter((member) => !member.is_active || ['suspended', 'expired', 'cancelled'].includes(member.membership_status)).length,
    pendingWaivers: members.filter((member) => !member.waiver_signed_at).length,
    activePlans: plans.filter((plan) => plan.is_active).length,
    recentActions: activity.length,
  };
};

export const formatAdminActivityTimestamp = (value, fallback = 'Unknown time') => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return parsed.toLocaleDateString();
};

export const describeAccessState = (member) => (
  member?.is_active ? 'Access enabled' : 'Access paused'
);
