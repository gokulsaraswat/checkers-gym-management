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
