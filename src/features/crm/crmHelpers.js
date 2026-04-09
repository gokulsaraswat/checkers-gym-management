export const LEAD_STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial_scheduled', label: 'Trial scheduled' },
  { value: 'trial_completed', label: 'Trial completed' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dormant', label: 'Dormant' },
];

export const LEAD_SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'other', label: 'Other' },
];

export const LEAD_CONTACT_METHOD_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'instagram', label: 'Instagram' },
];

export const LEAD_INTERACTION_TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'visit', label: 'Visit' },
  { value: 'trial', label: 'Trial' },
];

export const LEAD_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All stages' },
  ...LEAD_STAGE_OPTIONS,
];

export const LEAD_SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All sources' },
  ...LEAD_SOURCE_OPTIONS,
];

export const createLeadFilters = () => ({
  query: '',
  stage: 'all',
  source: 'all',
  ownerId: 'all',
  dueOnly: false,
  includeArchived: false,
});

export const createLeadForm = (defaults = {}) => ({
  id: defaults.id || '',
  fullName: defaults.full_name || defaults.fullName || '',
  email: defaults.email || '',
  phone: defaults.phone || '',
  source: defaults.source || 'walk_in',
  stage: defaults.stage || 'new',
  assignedTo: defaults.assigned_to || defaults.assignedTo || '',
  preferredContactMethod: defaults.preferred_contact_method || defaults.preferredContactMethod || 'phone',
  interestedPlanId: defaults.interested_plan_id || defaults.interestedPlanId || '',
  interestedAddOnCodes: defaults.interested_add_on_codes || defaults.interestedAddOnCodes || [],
  estimatedValue: defaults.estimated_value || defaults.estimatedValue || '',
  branchName: defaults.branch_name || defaults.branchName || '',
  nextFollowUpAt: toDateTimeLocalValue(defaults.next_follow_up_at || defaults.nextFollowUpAt),
  trialScheduledAt: toDateTimeLocalValue(defaults.trial_scheduled_at || defaults.trialScheduledAt),
  expectedCloseDate: defaults.expected_close_date || defaults.expectedCloseDate || '',
  notes: defaults.notes || '',
  tags: Array.isArray(defaults.tags) ? defaults.tags.join(', ') : (defaults.tags || ''),
});

export const createInteractionForm = (leadId = '') => ({
  leadId,
  interactionType: 'note',
  summary: '',
  outcome: '',
  nextFollowUpAt: '',
});

export const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return String(value).slice(0, 10);
  }
};

export const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
};

export const formatCurrency = (value, currency = 'INR') => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(0)}`;
  }
};

export const getLeadStageLabel = (value) => (
  LEAD_STAGE_OPTIONS.find((option) => option.value === value)?.label || 'Unknown'
);

export const getLeadSourceLabel = (value) => (
  LEAD_SOURCE_OPTIONS.find((option) => option.value === value)?.label || 'Other'
);

export const getInteractionTypeLabel = (value) => (
  LEAD_INTERACTION_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Update'
);

export const getLeadStageChipSx = (value) => {
  const palette = {
    new: { bgcolor: '#ecfeff', color: '#155e75' },
    contacted: { bgcolor: '#eff6ff', color: '#1d4ed8' },
    trial_scheduled: { bgcolor: '#f5f3ff', color: '#6d28d9' },
    trial_completed: { bgcolor: '#eef2ff', color: '#4338ca' },
    qualified: { bgcolor: '#fff7ed', color: '#c2410c' },
    won: { bgcolor: '#ecfdf5', color: '#047857' },
    lost: { bgcolor: '#fef2f2', color: '#b91c1c' },
    dormant: { bgcolor: '#f3f4f6', color: '#374151' },
  };

  return {
    fontWeight: 700,
    ...(palette[value] || palette.dormant),
  };
};

export const getFollowUpStatus = (lead) => {
  if (!lead?.next_follow_up_at) {
    return 'none';
  }

  const today = new Date();
  const followUp = new Date(lead.next_follow_up_at);
  if (Number.isNaN(followUp.getTime())) {
    return 'none';
  }

  if (followUp < today) {
    return 'overdue';
  }

  const distance = followUp.getTime() - today.getTime();
  if (distance <= 86400000) {
    return 'today';
  }

  return 'upcoming';
};

export const getFollowUpLabel = (lead) => {
  const status = getFollowUpStatus(lead);

  if (status === 'overdue') {
    return 'Overdue';
  }
  if (status === 'today') {
    return 'Due today';
  }
  if (status === 'upcoming') {
    return 'Scheduled';
  }
  return 'No follow-up';
};

export const getFollowUpChipSx = (lead) => {
  const status = getFollowUpStatus(lead);

  if (status === 'overdue') {
    return { bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700 };
  }
  if (status === 'today') {
    return { bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 };
  }
  if (status === 'upcoming') {
    return { bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 };
  }
  return { bgcolor: '#f3f4f6', color: '#374151', fontWeight: 700 };
};

export const filterLeads = (leads = [], filters = {}) => {
  const query = String(filters.query || '').trim().toLowerCase();

  return leads.filter((lead) => {
    if (!filters.includeArchived && lead.is_archived) {
      return false;
    }

    if (filters.stage && filters.stage !== 'all' && lead.stage !== filters.stage) {
      return false;
    }

    if (filters.source && filters.source !== 'all' && lead.source !== filters.source) {
      return false;
    }

    if (filters.ownerId && filters.ownerId !== 'all' && lead.assigned_to !== filters.ownerId) {
      return false;
    }

    if (filters.dueOnly) {
      const followUpStatus = getFollowUpStatus(lead);
      if (!['overdue', 'today'].includes(followUpStatus)) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const haystack = [
      lead.full_name,
      lead.email,
      lead.phone,
      lead.branch_name,
      lead.notes,
      lead.plan?.name,
      lead.assignee?.full_name,
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
};

export const sortLeads = (leads = []) => [...leads].sort((left, right) => {
  const leftFollowUp = left?.next_follow_up_at ? new Date(left.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY;
  const rightFollowUp = right?.next_follow_up_at ? new Date(right.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY;

  if (leftFollowUp !== rightFollowUp) {
    return leftFollowUp - rightFollowUp;
  }

  return String(right?.created_at || '').localeCompare(String(left?.created_at || ''));
});

export const sortInteractions = (interactions = []) => [...interactions].sort((left, right) => (
  String(right?.interaction_at || right?.created_at || '').localeCompare(String(left?.interaction_at || left?.created_at || ''))
));

export const buildCrmStats = ({ leads = [], interactions = [] }) => {
  const openLeads = leads.filter((lead) => !lead.is_archived && !['won', 'lost'].includes(lead.stage));
  const wonLeads = leads.filter((lead) => lead.stage === 'won');
  const overdueLeads = openLeads.filter((lead) => getFollowUpStatus(lead) === 'overdue');
  const todayLeads = openLeads.filter((lead) => getFollowUpStatus(lead) === 'today');
  const trialLeads = openLeads.filter((lead) => ['trial_scheduled', 'trial_completed'].includes(lead.stage));
  const pipelineValue = openLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const conversionRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const lastTouchAt = sortInteractions(interactions)[0]?.interaction_at || null;

  return {
    totalLeads: leads.length,
    openLeads: openLeads.length,
    overdueLeads: overdueLeads.length,
    dueTodayLeads: todayLeads.length,
    trialLeads: trialLeads.length,
    wonLeads: wonLeads.length,
    pipelineValue,
    conversionRate,
    lastTouchAt,
  };
};

export const addOnSelectionMap = (codes = []) => new Set(Array.isArray(codes) ? codes : []);

export const parseCommaTags = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
