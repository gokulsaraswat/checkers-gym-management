import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import {
  extractBlogExcerpt,
  filterBlogPosts,
  normalizeBlogPost,
  parseBlogTagInput,
  sampleBlogPosts,
  slugifyBlogTitle,
} from './blogHelpers';

const STORAGE_KEY = 'checkers_gym_blog_posts_v1';
const TABLE_NAME = 'blog_posts';
const ALLOWED_STATUSES = ['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'];
const FALLBACK_PATTERNS = [
  'not configured',
  'does not exist',
  'relation',
  'blog_posts',
  'schema cache',
  'failed to fetch',
  'network',
  'permission denied',
];

const nowIso = () => new Date().toISOString();
const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const shouldUseFallback = (error) => {
  if (!hasSupabase()) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return FALLBACK_PATTERNS.some((pattern) => message.includes(pattern));
};

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const dedupeById = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

const readMockPosts = () => {
  if (!canUseLocalStorage()) {
    return sampleBlogPosts.map((post) => normalizeBlogPost(post));
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const seeded = sampleBlogPosts.map((post) => normalizeBlogPost(post));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return sampleBlogPosts.map((post) => normalizeBlogPost(post));
    }

    return dedupeById(parsed.map((post) => normalizeBlogPost(post)));
  } catch (error) {
    return sampleBlogPosts.map((post) => normalizeBlogPost(post));
  }
};

const writeMockPosts = (posts = []) => {
  const normalized = dedupeById(posts.map((post) => normalizeBlogPost(post)));

  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
};

const ensureUniqueSlugInPosts = (desiredSlug, posts = [], currentId = null) => {
  const baseSlug = slugifyBlogTitle(desiredSlug);
  const takenSlugs = new Set(
    posts
      .filter((post) => post.id !== currentId)
      .map((post) => post.slug),
  );
  let candidate = baseSlug;
  let suffix = 2;

  while (takenSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const ensureUniqueSlug = async (desiredSlug, currentId = null) => {
  if (!hasSupabase()) {
    return ensureUniqueSlugInPosts(desiredSlug, readMockPosts(), currentId);
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, slug')
      .ilike('slug', `${slugifyBlogTitle(desiredSlug)}%`)
      .limit(100);

    if (error) {
      throw error;
    }

    return ensureUniqueSlugInPosts(desiredSlug, data || [], currentId);
  } catch (error) {
    if (shouldUseFallback(error)) {
      return ensureUniqueSlugInPosts(desiredSlug, readMockPosts(), currentId);
    }

    throw new Error(error.message || 'Unable to validate the blog slug.');
  }
};

const normalizeStatus = (value = 'draft') => {
  const candidate = String(value || 'draft').trim();
  return ALLOWED_STATUSES.includes(candidate) ? candidate : 'draft';
};

const buildPayload = (post = {}, actor = {}, slug, timestamp = nowIso()) => {
  const status = normalizeStatus(post.status);
  const contentMarkdown = String(post.content_markdown || '').trim();
  const title = String(post.title || '').trim() || 'Untitled post';
  let submittedAt = post.submitted_at || null;
  let approvedAt = post.approved_at || null;
  let approvedBy = post.approved_by || null;
  let publishedAt = post.published_at || null;

  if (status === 'pending_review') {
    submittedAt = submittedAt || timestamp;
    approvedAt = null;
    approvedBy = null;
    publishedAt = null;
  }

  if (status === 'approved') {
    submittedAt = submittedAt || timestamp;
    approvedAt = approvedAt || timestamp;
    approvedBy = approvedBy || actor.userId || null;
    publishedAt = null;
  }

  if (status === 'published') {
    submittedAt = submittedAt || timestamp;
    approvedAt = approvedAt || timestamp;
    approvedBy = approvedBy || actor.userId || null;
    publishedAt = publishedAt || timestamp;
  }

  if (status === 'rejected') {
    submittedAt = submittedAt || timestamp;
    approvedAt = null;
    approvedBy = null;
    publishedAt = null;
  }

  if (status === 'draft') {
    publishedAt = null;
  }

  if (status === 'archived') {
    publishedAt = null;
  }

  return {
    id: post.id || null,
    slug,
    title,
    summary: String(post.summary || '').trim() || extractBlogExcerpt(contentMarkdown, 220),
    cover_image_url: String(post.cover_image_url || '').trim() || null,
    content_markdown: contentMarkdown,
    tags: parseBlogTagInput(post.tags || post.tagsInput || ''),
    author_user_id: post.author_user_id || actor.userId || null,
    author_name: String(post.author_name || actor.authorName || actor.email || 'Checkers Gym Team').trim(),
    author_role: String(post.author_role || actor.authorRole || 'staff').trim() || 'staff',
    status,
    review_notes: String(post.review_notes || '').trim() || null,
    submitted_at: submittedAt,
    approved_at: approvedAt,
    approved_by: approvedBy,
    published_at: publishedAt,
    is_featured: Boolean(post.is_featured),
    updated_at: timestamp,
    created_at: post.created_at || timestamp,
  };
};

const canDeleteMockPost = (post, actor = {}) => {
  if (actor.actorRole === 'admin') {
    return true;
  }

  const isOwner = Boolean(actor.actorUserId && post.author_user_id === actor.actorUserId);
  return isOwner && ['draft', 'rejected', 'archived'].includes(post.status);
};

const saveMockPost = (payload = {}) => {
  const currentPosts = readMockPosts();
  const nextId = payload.id || `blog-${Date.now()}`;
  const normalized = normalizeBlogPost({
    ...payload,
    id: nextId,
  });

  const nextPosts = payload.id
    ? currentPosts.map((post) => (post.id === payload.id ? normalized : post))
    : [normalized, ...currentPosts];

  writeMockPosts(nextPosts);
  return normalized;
};

export const fetchPublicBlogPosts = async ({ query = '', limit = 24 } = {}) => {
  if (!hasSupabase()) {
    return filterBlogPosts(readMockPosts(), {
      query,
      onlyPublished: true,
    }).slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return filterBlogPosts(data || [], {
      query,
      onlyPublished: true,
    }).slice(0, limit);
  } catch (error) {
    if (shouldUseFallback(error)) {
      return filterBlogPosts(readMockPosts(), {
        query,
        onlyPublished: true,
      }).slice(0, limit);
    }

    throw new Error(error.message || 'Unable to load blog posts.');
  }
};

export const fetchBlogPostBySlug = async (
  slug,
  {
    actorRole = 'public',
    actorUserId = null,
  } = {},
) => {
  const allowPost = (post) => {
    if (!post) {
      return null;
    }

    if (post.status === 'published') {
      return post;
    }

    if (actorRole === 'admin') {
      return post;
    }

    if (actorRole === 'staff' && actorUserId && post.author_user_id === actorUserId) {
      return post;
    }

    return null;
  };

  if (!hasSupabase()) {
    return allowPost(readMockPosts().find((post) => post.slug === slug) || null);
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('slug', slug)
      .limit(1);

    if (error) {
      throw error;
    }

    const match = Array.isArray(data) ? data[0] || null : data || null;
    return allowPost(match ? normalizeBlogPost(match) : null);
  } catch (error) {
    if (shouldUseFallback(error)) {
      return allowPost(readMockPosts().find((post) => post.slug === slug) || null);
    }

    throw new Error(error.message || 'Unable to load the blog article.');
  }
};

export const fetchWorkspaceBlogPosts = async ({
  actorRole = 'staff',
  actorUserId = null,
  query = '',
  status = 'all',
} = {}) => {
  const workspaceFilter = (posts) => {
    const scopedPosts = actorRole === 'admin'
      ? posts
      : posts.filter((post) => !actorUserId || post.author_user_id === actorUserId);

    return filterBlogPosts(scopedPosts, {
      query,
      status,
      onlyPublished: false,
    });
  };

  if (!hasSupabase()) {
    return workspaceFilter(readMockPosts());
  }

  try {
    let request = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (actorRole !== 'admin' && actorUserId) {
      request = request.eq('author_user_id', actorUserId);
    }

    const { data, error } = await request;

    if (error) {
      throw error;
    }

    return workspaceFilter((data || []).map((post) => normalizeBlogPost(post)));
  } catch (error) {
    if (shouldUseFallback(error)) {
      return workspaceFilter(readMockPosts());
    }

    throw new Error(error.message || 'Unable to load the blog workspace.');
  }
};

export const saveBlogPost = async (post = {}, actor = {}) => {
  const timestamp = nowIso();
  const slug = await ensureUniqueSlug(post.slug || post.title || 'post', post.id || null);
  const payload = buildPayload(post, actor, slug, timestamp);

  if (!hasSupabase()) {
    return saveMockPost(payload);
  }

  try {
    if (payload.id) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          slug: payload.slug,
          title: payload.title,
          summary: payload.summary,
          cover_image_url: payload.cover_image_url,
          content_markdown: payload.content_markdown,
          tags: payload.tags,
          author_user_id: payload.author_user_id,
          author_name: payload.author_name,
          author_role: payload.author_role,
          status: payload.status,
          review_notes: payload.review_notes,
          submitted_at: payload.submitted_at,
          approved_at: payload.approved_at,
          approved_by: payload.approved_by,
          published_at: payload.published_at,
          is_featured: payload.is_featured,
          updated_at: payload.updated_at,
        })
        .eq('id', payload.id)
        .select('*')
        .limit(1);

      if (error) {
        throw error;
      }

      const saved = Array.isArray(data) ? data[0] || null : data || null;
      return normalizeBlogPost(saved || payload);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([{
        slug: payload.slug,
        title: payload.title,
        summary: payload.summary,
        cover_image_url: payload.cover_image_url,
        content_markdown: payload.content_markdown,
        tags: payload.tags,
        author_user_id: payload.author_user_id,
        author_name: payload.author_name,
        author_role: payload.author_role,
        status: payload.status,
        review_notes: payload.review_notes,
        submitted_at: payload.submitted_at,
        approved_at: payload.approved_at,
        approved_by: payload.approved_by,
        published_at: payload.published_at,
        is_featured: payload.is_featured,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      }])
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    const saved = Array.isArray(data) ? data[0] || null : data || null;
    return normalizeBlogPost(saved || payload);
  } catch (error) {
    if (shouldUseFallback(error)) {
      return saveMockPost(payload);
    }

    throw new Error(error.message || 'Unable to save the blog post.');
  }
};

export const deleteBlogPost = async (postId, { actorRole = 'staff', actorUserId = null } = {}) => {
  if (!hasSupabase()) {
    const currentPosts = readMockPosts();
    const targetPost = currentPosts.find((post) => post.id === postId);

    if (!targetPost) {
      return;
    }

    if (!canDeleteMockPost(targetPost, { actorRole, actorUserId })) {
      throw new Error('Only admins or the original author can delete this draft.');
    }

    writeMockPosts(currentPosts.filter((post) => post.id !== postId));
    return;
  }

  try {
    let request = supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', postId);

    if (actorRole !== 'admin' && actorUserId) {
      request = request.eq('author_user_id', actorUserId);
    }

    const { error } = await request;

    if (error) {
      throw error;
    }
  } catch (error) {
    if (shouldUseFallback(error)) {
      const currentPosts = readMockPosts();
      const targetPost = currentPosts.find((post) => post.id === postId);

      if (!targetPost) {
        return;
      }

      if (!canDeleteMockPost(targetPost, { actorRole, actorUserId })) {
        throw new Error('Only admins or the original author can delete this draft.');
      }

      writeMockPosts(currentPosts.filter((post) => post.id !== postId));
      return;
    }

    throw new Error(error.message || 'Unable to delete the blog post.');
  }
};
