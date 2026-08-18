import { alpha } from '@mui/material/styles';

/**
 * Shared, theme-aware status colouring.
 *
 * Feature pages used to hardcode hex pairs (#edf7ed / #2e7d32 and friends), which
 * are unreadable in dark mode. Route every status chip through this helper instead.
 */
const STATUS_TONES = {
  success: [
    'achieved', 'active', 'allow', 'allowed', 'approved', 'attended', 'checked_in', 'complete',
    'completed', 'confirmed', 'delivered', 'granted', 'healthy', 'improving', 'online', 'paid',
    'present', 'published', 'reached', 'resolved', 'settled', 'success', 'up_to_date', 'won',
  ],
  error: [
    'absent', 'blocked', 'cancelled', 'canceled', 'critical', 'declined', 'deny', 'denied',
    'error', 'expired', 'failed', 'inactive', 'lost', 'no_show', 'offline', 'overdue',
    'rejected', 'suspended', 'unpaid', 'void', 'voided',
  ],
  warning: [
    'at_risk', 'awaiting', 'draft', 'due', 'in_progress', 'investigating', 'late', 'maintenance',
    'medium', 'on_hold', 'open', 'partial', 'partially_paid', 'pending', 'processing', 'review',
    'triage', 'warning',
  ],
  info: [
    'booked', 'contacted', 'info', 'low', 'new', 'planned', 'refunded', 'reserved', 'scheduled',
    'sent', 'upcoming',
  ],
};

const TONE_BY_STATUS = Object.entries(STATUS_TONES).reduce((accumulator, [tone, statuses]) => {
  statuses.forEach((status) => {
    accumulator[status] = tone;
  });

  return accumulator;
}, {});

const normalizeStatus = (status) => String(status ?? '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

/**
 * Resolve a status string to a MUI palette key, or `null` when it has no known tone.
 * Useful for `<Chip color={getStatusTone(status) || 'default'} />`.
 */
export const getStatusTone = (status) => TONE_BY_STATUS[normalizeStatus(status)] || null;

/**
 * Theme-aware `sx` for a status chip. Falls back to neutral text colours for
 * unknown statuses so nothing ever renders as dark-on-dark.
 */
export const getStatusChipSx = (theme, status) => {
  const tone = getStatusTone(status);
  const isDark = theme.palette.mode === 'dark';

  if (!tone) {
    return {
      fontWeight: 700,
      bgcolor: alpha(theme.palette.text.primary, isDark ? 0.16 : 0.08),
      color: theme.palette.text.secondary,
    };
  }

  return {
    fontWeight: 700,
    bgcolor: alpha(theme.palette[tone].main, isDark ? 0.2 : 0.12),
    color: theme.palette[tone][isDark ? 'light' : 'dark'],
  };
};

export default getStatusChipSx;
