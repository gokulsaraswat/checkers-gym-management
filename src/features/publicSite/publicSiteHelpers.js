export const publicSectionCardSx = {
  height: '100%',
  borderRadius: { xs: 3, md: 4 },
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: 'none',
};

const PUBLIC_FEEDBACK_DRAFT_KEY = 'checkers-gym-public-feedback-draft-v1';

export const createInitialFeedbackDraft = () => ({
  name: '',
  email: '',
  phone: '',
  visitType: 'first-visit',
  topic: 'experience',
  rating: 4,
  message: '',
  improvementIdea: '',
  contactPermission: true,
});

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

export const loadFeedbackDraft = () => {
  if (typeof window === 'undefined') {
    return createInitialFeedbackDraft();
  }

  const rawDraft = window.localStorage.getItem(PUBLIC_FEEDBACK_DRAFT_KEY);

  if (!rawDraft) {
    return createInitialFeedbackDraft();
  }

  const parsedDraft = safeParseJson(rawDraft, {});

  return {
    ...createInitialFeedbackDraft(),
    ...parsedDraft,
  };
};

export const saveFeedbackDraft = (draft) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PUBLIC_FEEDBACK_DRAFT_KEY, JSON.stringify(draft));
};

export const clearFeedbackDraft = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PUBLIC_FEEDBACK_DRAFT_KEY);
};

const compactDateFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  day: 'numeric',
});

const detailedDateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export const formatEventDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Date to be announced';
  }

  if (start.toDateString() === end.toDateString()) {
    return detailedDateFormatter.format(start);
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${compactDateFormatter.format(start)} – ${detailedDateFormatter.format(end)}`;
  }

  return `${detailedDateFormatter.format(start)} – ${detailedDateFormatter.format(end)}`;
};

export const buildFeedbackSummary = (draft) => {
  const lines = [
    `Topic: ${draft.topic}`,
    `Visit type: ${draft.visitType}`,
    `Rating: ${draft.rating}/5`,
  ];

  if (draft.name) {
    lines.push(`Name: ${draft.name}`);
  }

  if (draft.email) {
    lines.push(`Email: ${draft.email}`);
  }

  if (draft.phone) {
    lines.push(`Phone: ${draft.phone}`);
  }

  if (draft.message) {
    lines.push('', 'Feedback:', draft.message);
  }

  if (draft.improvementIdea) {
    lines.push('', 'Suggested improvement:', draft.improvementIdea);
  }

  lines.push('', `Follow-up allowed: ${draft.contactPermission ? 'Yes' : 'No'}`);

  return lines.join('\n');
};
