export const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'info', label: 'General update' },
  { value: 'billing', label: 'Billing reminder' },
  { value: 'class', label: 'Class reminder' },
  { value: 'workout', label: 'Workout nudge' },
  { value: 'nutrition', label: 'Nutrition update' },
  { value: 'progress', label: 'Progress check-in' },
  { value: 'attendance', label: 'Attendance reminder' },
  { value: 'success', label: 'Success / achievement' },
  { value: 'warning', label: 'Important alert' },
  { value: 'error', label: 'Urgent issue' },
  { value: 'system', label: 'System message' },
  { value: 'marketing', label: 'Offer / promotion' },
];

export const NOTIFICATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All notifications' },
  { value: 'unread', label: 'Unread only' },
  { value: 'read', label: 'Read only' },
];

export const NOTIFICATION_AUDIENCE_OPTIONS = [
  { value: 'member', label: 'All members' },
  { value: 'staff', label: 'All staff' },
  { value: 'admin', label: 'All admins' },
  { value: 'all', label: 'Everyone' },
];

export const DELIVERY_CHANNEL_OPTIONS = [
  { value: 'in_app', label: 'In-app only' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
  { value: 'system', label: 'System generated' },
];

export const NOTIFICATION_TEMPLATE_OPTIONS = [
  {
    value: 'billing_due',
    label: 'Billing due reminder',
    payload: {
      notification_type: 'billing',
      title: 'Membership payment due',
      message: 'Your membership renewal is due soon. Please open the billing page to review your invoice and keep your access active.',
      action_label: 'Open billing',
      action_path: '/billing',
    },
  },
  {
    value: 'class_tomorrow',
    label: 'Class reminder',
    payload: {
      notification_type: 'class',
      title: 'Upcoming class reminder',
      message: 'You have an upcoming class on your schedule. Check the bookings page and arrive a few minutes early.',
      action_label: 'View bookings',
      action_path: '/bookings',
    },
  },
  {
    value: 'workout_nudge',
    label: 'Workout nudge',
    payload: {
      notification_type: 'workout',
      title: 'Workout plan check-in',
      message: 'Your next training block is ready. Open your workout plan and log today’s session after you finish.',
      action_label: 'Open workout plan',
      action_path: '/workout-plan',
    },
  },
  {
    value: 'progress_checkin',
    label: 'Progress check-in',
    payload: {
      notification_type: 'progress',
      title: 'Progress update requested',
      message: 'Please log your latest progress so your coach can review your recent changes and adjust your plan.',
      action_label: 'Open progress',
      action_path: '/progress',
    },
  },
];

export const REMINDER_TYPE_OPTIONS = [
  {
    value: 'billing_due',
    label: 'Billing due soon',
    description: 'Targets unpaid invoices due within the selected lead window.',
  },
  {
    value: 'class_booking',
    label: 'Upcoming class reminder',
    description: 'Targets members with a booked class that starts soon.',
  },
  {
    value: 'inactive_member',
    label: 'Inactive member nudge',
    description: 'Targets members who have not checked in for a while.',
  },
  {
    value: 'membership_expiry',
    label: 'Membership ending soon',
    description: 'Targets members whose current membership end date is approaching.',
  },
];

export const REMINDER_LEAD_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

export const REMINDER_TEMPLATE_PLACEHOLDERS = [
  { key: 'full_name', description: 'Recipient full name' },
  { key: 'email', description: 'Recipient email address' },
  { key: 'plan_name', description: 'Membership or plan label' },
  { key: 'invoice_number', description: 'Invoice number for billing reminders' },
  { key: 'due_date', description: 'Invoice or membership due date' },
  { key: 'balance_due', description: 'Outstanding balance' },
  { key: 'currency_code', description: 'Invoice currency code' },
  { key: 'session_title', description: 'Booked class title' },
  { key: 'starts_at', description: 'Class start time' },
  { key: 'branch_name', description: 'Branch or location label' },
  { key: 'coach_name', description: 'Coach or trainer name' },
  { key: 'membership_end_date', description: 'Current membership end date' },
  { key: 'days_since_visit', description: 'Number of days since the last recorded check-in' },
  { key: 'last_visit_at', description: 'Latest visit timestamp' },
  { key: 'source_label', description: 'Human-readable source label returned by the reminder preview' },
];

export const DEFAULT_REMINDER_RULES = [
  {
    rule_key: 'billing-due-3-days',
    title: 'Billing due · 3 days before',
    description: 'Remind members about unpaid invoices before access is interrupted.',
    reminder_type: 'billing_due',
    target_role: 'member',
    delivery_channel: 'in_app',
    action_label: 'Open billing',
    action_path: '/billing',
    title_template: 'Membership payment due soon',
    message_template: 'Hi {{full_name}}, your {{plan_name}} invoice {{invoice_number}} is due on {{due_date}}. Balance due: {{currency_code}} {{balance_due}}. Open billing to keep your access active.',
    lead_value: 3,
    lead_unit: 'days',
    cooldown_hours: 24,
    include_inactive: false,
    respect_preferences: true,
    enabled: true,
    metadata: {},
  },
  {
    rule_key: 'class-reminder-6-hours',
    title: 'Class reminder · 6 hours before',
    description: 'Give members time to confirm arrival details before class starts.',
    reminder_type: 'class_booking',
    target_role: 'member',
    delivery_channel: 'push',
    action_label: 'View bookings',
    action_path: '/bookings',
    title_template: 'Upcoming class reminder',
    message_template: 'Hi {{full_name}}, your class {{session_title}} starts at {{starts_at}}. Coach: {{coach_name}}. Open bookings if you need to review your slot or arrive a few minutes early.',
    lead_value: 6,
    lead_unit: 'hours',
    cooldown_hours: 6,
    include_inactive: false,
    respect_preferences: true,
    enabled: true,
    metadata: {},
  },
  {
    rule_key: 'inactive-member-7-days',
    title: 'Inactive member nudge · 7 days',
    description: 'Re-engage members who have been away from the gym for a week or more.',
    reminder_type: 'inactive_member',
    target_role: 'member',
    delivery_channel: 'in_app',
    action_label: 'Open workout plan',
    action_path: '/workout-plan',
    title_template: 'We miss you at Checkers Gym',
    message_template: 'Hi {{full_name}}, it has been {{days_since_visit}} days since your last visit. Your next workout block is ready whenever you are. Open your plan to get back on track.',
    lead_value: 7,
    lead_unit: 'days',
    cooldown_hours: 72,
    include_inactive: false,
    respect_preferences: true,
    enabled: true,
    metadata: {},
  },
  {
    rule_key: 'membership-expiry-5-days',
    title: 'Membership expiry · 5 days before',
    description: 'Warn active members before their membership end date arrives.',
    reminder_type: 'membership_expiry',
    target_role: 'member',
    delivery_channel: 'email',
    action_label: 'Review membership',
    action_path: '/membership',
    title_template: 'Membership ending soon',
    message_template: 'Hi {{full_name}}, your membership ends on {{membership_end_date}}. Open your membership page to review your plan and renew before your access is interrupted.',
    lead_value: 5,
    lead_unit: 'days',
    cooldown_hours: 24,
    include_inactive: false,
    respect_preferences: true,
    enabled: true,
    metadata: {},
  },
];

const notificationTypeMeta = {
  info: { label: 'Info', background: '#eff6ff', color: '#1d4ed8' },
  billing: { label: 'Billing', background: '#fff7ed', color: '#c2410c' },
  class: { label: 'Class', background: '#ecfeff', color: '#0f766e' },
  workout: { label: 'Workout', background: '#f5f3ff', color: '#6d28d9' },
  nutrition: { label: 'Nutrition', background: '#ecfdf3', color: '#047857' },
  progress: { label: 'Progress', background: '#eef2ff', color: '#4338ca' },
  attendance: { label: 'Attendance', background: '#fef3c7', color: '#92400e' },
  success: { label: 'Success', background: '#ecfdf3', color: '#047857' },
  warning: { label: 'Warning', background: '#fff7ed', color: '#c2410c' },
  error: { label: 'Urgent', background: '#fef2f2', color: '#b91c1c' },
  system: { label: 'System', background: '#f8fafc', color: '#475569' },
  marketing: { label: 'Offer', background: '#fdf2f8', color: '#be185d' },
};

const mergeReminderRuleDefaults = (current = {}) => {
  const seeded = DEFAULT_REMINDER_RULES.find((rule) => (
    rule.rule_key === current.rule_key || rule.reminder_type === current.reminder_type
  ));

  return {
    id: current.id ?? '',
    rule_key: current.rule_key ?? seeded?.rule_key ?? '',
    title: current.title ?? seeded?.title ?? '',
    description: current.description ?? seeded?.description ?? '',
    reminder_type: current.reminder_type ?? seeded?.reminder_type ?? 'billing_due',
    target_role: current.target_role ?? seeded?.target_role ?? 'member',
    delivery_channel: current.delivery_channel ?? seeded?.delivery_channel ?? 'in_app',
    action_label: current.action_label ?? seeded?.action_label ?? '',
    action_path: current.action_path ?? seeded?.action_path ?? '',
    title_template: current.title_template ?? seeded?.title_template ?? '',
    message_template: current.message_template ?? seeded?.message_template ?? '',
    lead_value: Number(current.lead_value ?? seeded?.lead_value ?? 1),
    lead_unit: current.lead_unit ?? seeded?.lead_unit ?? 'days',
    cooldown_hours: Number(current.cooldown_hours ?? seeded?.cooldown_hours ?? 24),
    include_inactive: Boolean(current.include_inactive ?? seeded?.include_inactive ?? false),
    respect_preferences: Boolean(current.respect_preferences ?? seeded?.respect_preferences ?? true),
    enabled: Boolean(current.enabled ?? seeded?.enabled ?? true),
    metadata: current.metadata ?? seeded?.metadata ?? {},
    last_run_at: current.last_run_at ?? null,
    last_previewed_at: current.last_previewed_at ?? null,
    created_at: current.created_at ?? null,
    updated_at: current.updated_at ?? null,
  };
};

export const getNotificationTypeMeta = (type) => notificationTypeMeta[type] || notificationTypeMeta.info;

export const getNotificationTypeLabel = (type) => getNotificationTypeMeta(type).label;

export const getNotificationTypeChipSx = (type) => {
  const meta = getNotificationTypeMeta(type);
  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const formatNotificationDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const sortNotificationsNewestFirst = (rows = []) => (
  [...rows].sort((left, right) => {
    const leftTime = new Date(left?.created_at || 0).getTime();
    const rightTime = new Date(right?.created_at || 0).getTime();
    return rightTime - leftTime;
  })
);

export const buildNotificationSummary = (rows = []) => {
  const sorted = sortNotificationsNewestFirst(rows);
  const unread = sorted.filter((row) => !row?.is_read);
  const actionable = sorted.filter((row) => row?.action_path);

  return {
    total: sorted.length,
    unreadCount: unread.length,
    readCount: sorted.length - unread.length,
    actionableCount: actionable.length,
    latest: sorted[0] || null,
    latestUnread: unread[0] || null,
    latestThree: sorted.slice(0, 3),
  };
};

export const createDefaultNotificationPreferences = (current = {}) => ({
  email_enabled: current.email_enabled ?? true,
  sms_enabled: current.sms_enabled ?? false,
  whatsapp_enabled: current.whatsapp_enabled ?? false,
  push_enabled: current.push_enabled ?? true,
  class_reminders_enabled: current.class_reminders_enabled ?? true,
  billing_reminders_enabled: current.billing_reminders_enabled ?? true,
  workout_reminders_enabled: current.workout_reminders_enabled ?? true,
  marketing_enabled: current.marketing_enabled ?? false,
  quiet_hours_start: current.quiet_hours_start ?? '',
  quiet_hours_end: current.quiet_hours_end ?? '',
});

export const createEmptyNotificationComposer = () => ({
  target_mode: 'role',
  target_user_id: '',
  target_role: 'member',
  include_inactive: false,
  notification_type: 'info',
  title: '',
  message: '',
  action_label: '',
  action_path: '',
  delivery_channel: 'in_app',
});

export const createDefaultReminderRule = (current = {}) => mergeReminderRuleDefaults(current);

export const sortReminderRules = (rules = []) => (
  [...rules]
    .map((rule) => mergeReminderRuleDefaults(rule))
    .sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    })
);

export const getReminderTypeOption = (value) => (
  REMINDER_TYPE_OPTIONS.find((option) => option.value === value) || REMINDER_TYPE_OPTIONS[0]
);

export const getReminderTypeLabel = (value) => getReminderTypeOption(value).label;

export const getDeliveryChannelLabel = (value) => (
  DELIVERY_CHANNEL_OPTIONS.find((option) => option.value === value)?.label || 'In-app only'
);

export const formatReminderLeadLabel = (value, unit) => {
  const numericValue = Number(value || 0);
  const unitOption = REMINDER_LEAD_UNIT_OPTIONS.find((option) => option.value === unit);

  if (!numericValue) {
    return `0 ${unitOption?.label?.toLowerCase() || 'days'}`;
  }

  const baseLabel = unitOption?.label?.toLowerCase() || 'days';
  const suffix = numericValue === 1 ? baseLabel.replace(/s$/, '') : baseLabel;
  return `${numericValue} ${suffix}`;
};

export const formatReminderLastRun = (value) => formatNotificationDate(value);

export const renderReminderTemplate = (template = '', context = {}) => {
  if (!template) {
    return '';
  }

  const safeContext = context || {};

  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const rawValue = safeContext[key];

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return '—';
    }

    return String(rawValue);
  });
};

export const buildReminderSummary = (rules = [], previewRows = []) => {
  const hydratedRules = sortReminderRules(rules);
  const enabledRules = hydratedRules.filter((rule) => rule.enabled);
  const latestRun = hydratedRules
    .map((rule) => rule.last_run_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;

  return {
    totalRules: hydratedRules.length,
    enabledRules: enabledRules.length,
    disabledRules: hydratedRules.length - enabledRules.length,
    previewCount: previewRows.length,
    latestRun,
  };
};

export const buildReminderPreviewSummary = (rows = []) => ({
  total: rows.length,
  latestDueAt: rows
    .map((row) => row?.due_at)
    .filter(Boolean)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] || null,
  byChannel: rows.reduce((accumulator, row) => {
    const key = row?.delivery_channel || 'in_app';
    return {
      ...accumulator,
      [key]: (accumulator[key] || 0) + 1,
    };
  }, {}),
});

export const applyNotificationTemplate = (form, templateValue) => {
  const template = NOTIFICATION_TEMPLATE_OPTIONS.find((option) => option.value === templateValue);

  if (!template) {
    return form;
  }

  return {
    ...form,
    ...template.payload,
  };
};

export const buildNotificationAudienceLabel = (form = {}, targetMember = null) => {
  if (form.target_mode === 'single') {
    return targetMember?.full_name || targetMember?.email || 'Selected member';
  }

  return NOTIFICATION_AUDIENCE_OPTIONS.find((option) => option.value === form.target_role)?.label || 'Selected group';
};

export const getNotificationReadLabel = (notification = {}) => (
  notification?.is_read ? 'Read' : 'Unread'
);

export const getNotificationReadChipSx = (notification = {}) => (
  notification?.is_read
    ? { bgcolor: '#f8fafc', color: '#475569', fontWeight: 700 }
    : { bgcolor: '#fff1f2', color: '#be123c', fontWeight: 700 }
);
