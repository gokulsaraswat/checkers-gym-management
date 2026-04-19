const BLOG_STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending review',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const BLOG_STATUS_OPTIONS = Object.entries(BLOG_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const MARKDOWN_EMBED_HELP = 'Use @[embed](https://...) on its own line to render hosted video or safe social link cards.';

const dayOffsetIso = (daysAgo = 0) => {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  return value.toISOString();
};

const seedPosts = [
  {
    id: 'blog-seed-1',
    slug: 'mobility-reset-before-every-session',
    title: 'Mobility reset before every session',
    summary: 'A simple 8-minute warm-up our coaches use to help members move better before strength work.',
    cover_image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    content_markdown: `# Mobility reset before every session

A smoother workout starts before the first working set. This short reset is what our coaches use when the floor is busy and we need members warm, focused, and ready.

## 1. Breathe and brace

Start with one minute of deep nasal breathing while standing tall. Focus on expanding your ribs and stacking your torso.

## 2. Open the ankles and hips

- 10 ankle rocks each side
- 8 squat-to-stand reps
- 8 controlled hip openers each side

## 3. Prime the upper body

- 10 band pull-aparts
- 8 scap push-ups
- 30 seconds of light carries

## What this improves

- Faster first working sets
- Better squat depth
- Cleaner pressing positions
- Less time wasted between machines

@[embed](https://www.youtube.com/watch?v=ml6cT4AZdqI)

Finish by doing your first warm-up set with a slower tempo than usual.`,
    tags: ['mobility', 'warm-up', 'coaching'],
    author_user_id: null,
    author_name: 'Coach Nisha',
    author_role: 'staff',
    status: 'published',
    review_notes: 'Evergreen coaching article approved for public publishing.',
    submitted_at: dayOffsetIso(12),
    approved_at: dayOffsetIso(11),
    approved_by: null,
    published_at: dayOffsetIso(10),
    is_featured: true,
    created_at: dayOffsetIso(14),
    updated_at: dayOffsetIso(10),
  },
  {
    id: 'blog-seed-2',
    slug: 'interclub-weekend-recap',
    title: 'Interclub weekend recap',
    summary: 'A quick look at the lifts, community energy, and recovery work from our most recent in-house event.',
    cover_image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80',
    content_markdown: `# Interclub weekend recap

This weekend felt exactly like a community event should feel: busy racks, loud support, and strong finishes.

## What stood out

1. Members paced attempts better than last month.
2. Recovery corners stayed active all day.
3. Staff volunteers kept the event flow clean even during peak check-ins.

## Coach notes

The biggest win was consistency. Lifters who respected warm-ups and rest periods were able to finish stronger.

@[embed](https://vimeo.com/76979871)

We will publish the next event calendar after the coaching review meeting.`,
    tags: ['events', 'community', 'lifting'],
    author_user_id: null,
    author_name: 'Checkers Gym Team',
    author_role: 'admin',
    status: 'published',
    review_notes: 'Approved with event highlights and video recap.',
    submitted_at: dayOffsetIso(9),
    approved_at: dayOffsetIso(8),
    approved_by: null,
    published_at: dayOffsetIso(7),
    is_featured: false,
    created_at: dayOffsetIso(9),
    updated_at: dayOffsetIso(7),
  },
  {
    id: 'blog-seed-3',
    slug: 'desk-flow-qr-checkin-notes',
    title: 'Desk flow notes after the QR check-in rollout',
    summary: 'Operational observations from the staff desk after moving more members to QR-based entry.',
    cover_image_url: '',
    content_markdown: `# Desk flow notes after the QR check-in rollout

The first week of QR-led entry reduced front desk congestion during the evening rush.

## What improved

- Fewer manual lookups at the desk
- Faster member verification during class peaks
- Cleaner records for access review

## What still needs attention

- Backup flow for dead phone batteries
- More signage near the scanner lane
- Better staff prompts for first-time visitors

@[embed](https://x.com/fitstatus/status/1780000000000000000)

This article is waiting for admin review before it goes public.`,
    tags: ['operations', 'access', 'front-desk'],
    author_user_id: 'staff-seed-1',
    author_name: 'Front Desk Team',
    author_role: 'staff',
    status: 'pending_review',
    review_notes: '',
    submitted_at: dayOffsetIso(2),
    approved_at: null,
    approved_by: null,
    published_at: null,
    is_featured: false,
    created_at: dayOffsetIso(3),
    updated_at: dayOffsetIso(2),
  },
  {
    id: 'blog-seed-4',
    slug: 'member-spotlight-draft',
    title: 'Member spotlight draft',
    summary: 'Draft outline for an upcoming member transformation story.',
    cover_image_url: '',
    content_markdown: `# Member spotlight draft

Add the interview transcript, before-and-after milestones, and coach commentary here.

## Draft structure

- Member background
- Training timeline
- Nutrition changes
- Recovery habits
- Advice for new joiners`,
    tags: ['member-story', 'draft'],
    author_user_id: 'staff-seed-1',
    author_name: 'Coach Arjun',
    author_role: 'staff',
    status: 'draft',
    review_notes: '',
    submitted_at: null,
    approved_at: null,
    approved_by: null,
    published_at: null,
    is_featured: false,
    created_at: dayOffsetIso(1),
    updated_at: dayOffsetIso(1),
  },
];

export const slugifyBlogTitle = (value = '') => {
  const cleaned = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return cleaned || 'post';
};

export const parseBlogTagInput = (value = '') => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
};

export const formatBlogTagInput = (tags = []) => parseBlogTagInput(tags).join(', ');

export const estimateReadingTime = (markdown = '') => {
  const wordCount = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/@\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(wordCount / 220));
};

export const extractBlogExcerpt = (markdown = '', maxLength = 180) => {
  const plainText = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/@\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}…`;
};

const normalizeIso = (value, fallbackValue = null) => {
  if (!value) {
    return fallbackValue;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallbackValue;
  }

  return parsed.toISOString();
};

export const normalizeBlogPost = (post = {}) => {
  const title = String(post.title || '').trim() || 'Untitled post';
  const contentMarkdown = String(post.content_markdown || post.contentMarkdown || '').trim();
  const tags = parseBlogTagInput(post.tags || post.tag_list || post.tagList || '');
  const createdAt = normalizeIso(post.created_at || post.createdAt, dayOffsetIso(0));
  const updatedAt = normalizeIso(post.updated_at || post.updatedAt, createdAt);
  const publishedAt = normalizeIso(post.published_at || post.publishedAt, null);
  const submittedAt = normalizeIso(post.submitted_at || post.submittedAt, null);
  const approvedAt = normalizeIso(post.approved_at || post.approvedAt, null);
  const status = String(post.status || (publishedAt ? 'published' : 'draft')).trim() || 'draft';

  return {
    id: post.id || `blog-${slugifyBlogTitle(title)}`,
    slug: post.slug || slugifyBlogTitle(title),
    title,
    summary: String(post.summary || '').trim() || extractBlogExcerpt(contentMarkdown, 220),
    cover_image_url: String(post.cover_image_url || post.coverImageUrl || '').trim(),
    content_markdown: contentMarkdown,
    tags,
    author_user_id: post.author_user_id || post.authorUserId || null,
    author_name: String(post.author_name || post.authorName || post.author?.full_name || post.author?.email || 'Checkers Gym Team').trim(),
    author_role: String(post.author_role || post.authorRole || 'staff').trim() || 'staff',
    status,
    review_notes: String(post.review_notes || post.reviewNotes || '').trim(),
    submitted_at: submittedAt,
    approved_at: approvedAt,
    approved_by: post.approved_by || post.approvedBy || null,
    published_at: publishedAt,
    is_featured: Boolean(post.is_featured || post.isFeatured),
    created_at: createdAt,
    updated_at: updatedAt,
    reading_time_minutes: Number(post.reading_time_minutes || post.readingTimeMinutes || estimateReadingTime(contentMarkdown)),
  };
};

export const sampleBlogPosts = seedPosts.map((post) => normalizeBlogPost(post));

export const buildBlogDraft = ({ name = 'Checkers Gym Team', role = 'staff' } = {}) => ({
  title: '',
  slug: '',
  summary: '',
  cover_image_url: '',
  content_markdown: '# New article\n\nWrite your draft here.\n\n## Key points\n\n- Add a clear headline\n- Keep paragraphs short\n- Use @[embed](https://...) for hosted video or social links\n',
  tags: [],
  review_notes: '',
  is_featured: false,
  author_name: name,
  author_role: role,
  status: 'draft',
});

export const getBlogStatusLabel = (status = 'draft') => BLOG_STATUS_LABELS[status] || BLOG_STATUS_LABELS.draft;

export const getBlogStatusChipSx = (status = 'draft') => {
  switch (status) {
    case 'published':
      return { bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 };
    case 'approved':
      return { bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700 };
    case 'pending_review':
      return { bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 };
    case 'rejected':
      return { bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700 };
    case 'archived':
      return { bgcolor: '#e5e7eb', color: '#374151', fontWeight: 700 };
    default:
      return { bgcolor: '#f3f4f6', color: '#374151', fontWeight: 700 };
  }
};

export const formatBlogDate = (value) => {
  if (!value) {
    return 'Not scheduled';
  }

  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

export const formatBlogDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const scorePostDate = (post) => {
  const candidate = post.published_at || post.updated_at || post.created_at;
  return new Date(candidate).getTime() || 0;
};

export const sortBlogPosts = (posts = []) => [...posts]
  .map((post) => normalizeBlogPost(post))
  .sort((left, right) => {
    if (left.is_featured !== right.is_featured) {
      return Number(right.is_featured) - Number(left.is_featured);
    }

    return scorePostDate(right) - scorePostDate(left);
  });

export const filterBlogPosts = (
  posts = [],
  {
    query = '',
    status = 'all',
    onlyPublished = false,
    authorId = null,
  } = {},
) => {
  const searchValue = String(query || '').trim().toLowerCase();

  return sortBlogPosts(posts).filter((post) => {
    const normalized = normalizeBlogPost(post);
    const searchable = [
      normalized.title,
      normalized.summary,
      normalized.content_markdown,
      normalized.author_name,
      normalized.tags.join(' '),
    ].join(' ').toLowerCase();

    if (onlyPublished && normalized.status !== 'published') {
      return false;
    }

    if (status !== 'all' && normalized.status !== status) {
      return false;
    }

    if (authorId && normalized.author_user_id && normalized.author_user_id !== authorId) {
      return false;
    }

    if (searchValue && !searchable.includes(searchValue)) {
      return false;
    }

    return true;
  });
};
