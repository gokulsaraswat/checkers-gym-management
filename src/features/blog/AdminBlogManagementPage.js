import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS, getBlogPostPath } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import BlogEditorForm from './BlogEditorForm';
import BlogStatusChip from './BlogStatusChip';
import { deleteBlogPost, fetchWorkspaceBlogPosts, saveBlogPost } from './blogClient';
import {
  BLOG_STATUS_OPTIONS,
  buildBlogDraft,
  filterBlogPosts,
  formatBlogDateTime,
  formatBlogTagInput,
  parseBlogTagInput,
} from './blogHelpers';

const toEditorForm = (post, authorContext) => ({
  ...buildBlogDraft({
    name: authorContext.authorName,
    role: authorContext.authorRole,
  }),
  ...post,
  slug: post?.slug || '',
  cover_image_url: post?.cover_image_url || '',
  review_notes: post?.review_notes || '',
  tagsInput: formatBlogTagInput(post?.tags || []),
});

const fromEditorForm = (form, nextStatus) => ({
  ...form,
  status: nextStatus,
  tags: parseBlogTagInput(form.tagsInput || ''),
});

const AdminBlogManagementPage = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [listQuery, setListQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const authorContext = useMemo(() => ({
    userId: user?.id || null,
    authorName: profile?.full_name || user?.email || 'Admin editor',
    authorRole: 'admin',
    email: user?.email || '',
  }), [profile?.full_name, user?.email, user?.id]);

  const blankForm = useMemo(
    () => toEditorForm(buildBlogDraft({
      name: authorContext.authorName,
      role: authorContext.authorRole,
    }), authorContext),
    [authorContext],
  );

  const refreshPosts = useCallback(async (preferredId = null) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const rows = await fetchWorkspaceBlogPosts({
        actorRole: 'admin',
        actorUserId: user.id,
      });

      setPosts(rows);

      const targetId = preferredId || selectedPostId || rows[0]?.id || null;
      const targetPost = targetId ? rows.find((item) => item.id === targetId) : null;

      if (targetPost) {
        setSelectedPostId(targetPost.id);
        setForm(toEditorForm(targetPost, authorContext));
      } else {
        setSelectedPostId(null);
        setForm(blankForm);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the blog moderation workspace.',
      });
    } finally {
      setLoading(false);
    }
  }, [authorContext, blankForm, selectedPostId, user]);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  const visiblePosts = useMemo(
    () => filterBlogPosts(posts, {
      query: listQuery,
      status: statusFilter,
      onlyPublished: false,
    }),
    [listQuery, posts, statusFilter],
  );

  const stats = useMemo(() => ({
    total: posts.length,
    pending: posts.filter((post) => post.status === 'pending_review').length,
    published: posts.filter((post) => post.status === 'published').length,
    featured: posts.filter((post) => post.is_featured).length,
  }), [posts]);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...(current || blankForm),
      [field]: value,
    }));
  };

  const handleSelectPost = (post) => {
    setSelectedPostId(post.id);
    setForm(toEditorForm(post, authorContext));
  };

  const handleNewDraft = () => {
    setSelectedPostId(null);
    setForm(blankForm);
    setFeedback({ type: '', message: '' });
  };

  const persistPost = async (nextStatus, successMessage) => {
    if (!form) {
      return;
    }

    try {
      setSaving(true);
      const saved = await saveBlogPost(
        fromEditorForm(form, nextStatus),
        authorContext,
      );
      setFeedback({ type: 'success', message: successMessage });
      await refreshPosts(saved.id);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save this article.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPostId) {
      return;
    }

    if (!window.confirm('Delete this article?')) {
      return;
    }

    try {
      setSaving(true);
      await deleteBlogPost(selectedPostId, {
        actorRole: 'admin',
        actorUserId: authorContext.userId,
      });
      setFeedback({ type: 'success', message: 'Article deleted.' });
      setSelectedPostId(null);
      setForm(blankForm);
      await refreshPosts(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to delete this article.',
      });
    } finally {
      setSaving(false);
    }
  };

  const moderationActions = form ? (
    <>
      {form.status !== 'approved' && form.status !== 'published' ? (
        <Button disabled={saving} variant="outlined" onClick={() => persistPost('approved', 'Article approved and ready to publish.')}>
          Approve
        </Button>
      ) : null}
      {form.status !== 'published' ? (
        <Button disabled={saving} variant="outlined" onClick={() => persistPost('published', 'Article published to the public blog.')}>
          Publish now
        </Button>
      ) : (
        <Button disabled={saving} variant="outlined" onClick={() => persistPost('approved', 'Article removed from public view and kept approved.')}>
          Unpublish
        </Button>
      )}
      {form.status !== 'rejected' ? (
        <Button disabled={saving} color="warning" variant="outlined" onClick={() => persistPost('rejected', 'Article rejected with review notes.')}>
          Reject
        </Button>
      ) : null}
      {form.status !== 'archived' ? (
        <Button disabled={saving} color="inherit" variant="text" onClick={() => persistPost('archived', 'Article archived.')}>
          Archive
        </Button>
      ) : null}
    </>
  ) : null;

  if (loading && !form) {
    return (
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Typography color="text.secondary">Loading the blog moderation workspace...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3.5}>
        <Stack spacing={1.5}>
          <Typography color="primary.main" fontWeight={700}>
            Admin blog moderation
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
            Review, approve, and publish public content
          </Typography>
          <Typography color="text.secondary" maxWidth="920px">
            This workspace handles the approval flow for staff submissions, direct admin publishing,
            featured article selection, and public blog quality checks before content goes live.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button component={RouterLink} to={PATHS.blog} variant="contained" sx={{ alignSelf: 'flex-start' }}>
              Open public blog
            </Button>
            <Button component={RouterLink} to={PATHS.admin} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              Back to admin
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography variant="overline" color="text.secondary">Total</Typography>
              <Typography variant="h4" fontWeight={800}>{stats.total}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography variant="overline" color="text.secondary">Pending review</Typography>
              <Typography variant="h4" fontWeight={800}>{stats.pending}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography variant="overline" color="text.secondary">Published</Typography>
              <Typography variant="h4" fontWeight={800}>{stats.published}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography variant="overline" color="text.secondary">Featured</Typography>
              <Typography variant="h4" fontWeight={800}>{stats.featured}</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
                  <Typography variant="h6" fontWeight={800}>
                    Editorial queue
                  </Typography>
                  <Button onClick={handleNewDraft} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
                    New article
                  </Button>
                </Stack>

                <TextField
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder="Search title, tag, or author"
                  fullWidth
                />

                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="all">All statuses</MenuItem>
                  {BLOG_STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>

                <Stack spacing={1.25}>
                  {visiblePosts.length ? visiblePosts.map((post) => {
                    const isSelected = post.id === selectedPostId;
                    return (
                      <Paper
                        key={post.id}
                        variant={isSelected ? 'elevation' : 'outlined'}
                        elevation={isSelected ? 3 : 0}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>
                                {post.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {post.author_name} • {formatBlogDateTime(post.updated_at)}
                              </Typography>
                            </Box>
                            <BlogStatusChip status={post.status} />
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {post.tags.slice(0, 3).map((tag) => (
                              <Chip key={tag} size="small" label={tag} variant="outlined" />
                            ))}
                            {post.is_featured ? <Chip size="small" color="primary" label="Featured" /> : null}
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => handleSelectPost(post)}>
                              Open
                            </Button>
                            {post.status === 'published' ? (
                              <Button
                                size="small"
                                variant="text"
                                component={RouterLink}
                                to={getBlogPostPath(post.slug)}
                              >
                                View live
                              </Button>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  }) : (
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                      <Typography color="text.secondary">
                        Nothing matches the current editorial filters.
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            {form ? (
              <BlogEditorForm
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
                onSave={() => persistPost(form.status || 'draft', 'Article saved.')}
                onSubmit={() => persistPost('pending_review', 'Article moved into review.')}
                onDelete={handleDelete}
                canDelete
                showFeaturedToggle
                showReviewNotes
                saveLabel="Save changes"
                extraActions={moderationActions}
              />
            ) : null}
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default AdminBlogManagementPage;
