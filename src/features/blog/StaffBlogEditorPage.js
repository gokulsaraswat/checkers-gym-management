import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
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

const StaffBlogEditorPage = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [listQuery, setListQuery] = useState('');
  const [form, setForm] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const authorContext = useMemo(() => ({
    userId: user?.id || null,
    authorName: profile?.full_name || user?.email || 'Staff author',
    authorRole: profile?.role === 'admin' ? 'admin' : 'staff',
    email: user?.email || '',
  }), [profile?.full_name, profile?.role, user?.email, user?.id]);

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
        actorRole: authorContext.authorRole,
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
        message: error.message || 'Unable to load your blog workspace.',
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
      onlyPublished: false,
    }),
    [listQuery, posts],
  );

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
        message: error.message || 'Unable to save this blog draft.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPostId) {
      return;
    }

    if (!window.confirm('Delete this draft?')) {
      return;
    }

    try {
      setSaving(true);
      await deleteBlogPost(selectedPostId, {
        actorRole: authorContext.authorRole,
        actorUserId: authorContext.userId,
      });
      setFeedback({ type: 'success', message: 'Draft deleted.' });
      setSelectedPostId(null);
      setForm(blankForm);
      await refreshPosts(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to delete this draft.',
      });
    } finally {
      setSaving(false);
    }
  };

  const canDeleteCurrentPost = Boolean(selectedPostId && ['draft', 'rejected', 'archived'].includes(form?.status || 'draft'));

  if (loading && !form) {
    return (
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Typography color="text.secondary">Loading your publishing workspace...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3.5}>
        <Stack spacing={1.5}>
          <Typography color="primary.main" fontWeight={700}>
            Staff blog workspace
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
            Draft, preview, and submit public articles
          </Typography>
          <Typography color="text.secondary" maxWidth="920px">
            Staff can prepare articles in markdown, preview embedded video or social links,
            and submit content into the admin approval flow before it appears on the public blog.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button component={RouterLink} to={PATHS.blog} variant="contained" sx={{ alignSelf: 'flex-start' }}>
              Open public blog
            </Button>
            <Button component={RouterLink} to={PATHS.staff} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              Back to staff home
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
                  <Typography variant="h6" fontWeight={800}>
                    Your articles
                  </Typography>
                  <Button onClick={handleNewDraft} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
                    New draft
                  </Button>
                </Stack>

                <TextField
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder="Search your drafts"
                  fullWidth
                />

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
                                Updated {formatBlogDateTime(post.updated_at)}
                              </Typography>
                            </Box>
                            <BlogStatusChip status={post.status} />
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {post.tags.slice(0, 3).map((tag) => (
                              <Chip key={tag} size="small" label={tag} variant="outlined" />
                            ))}
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => handleSelectPost(post)}>
                              Edit
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
                        No drafts yet. Start a new article and save it to your workspace.
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
                onSave={() => persistPost('draft', 'Draft saved.')}
                onSubmit={() => persistPost('pending_review', 'Article submitted for review.')}
                onDelete={handleDelete}
                canDelete={canDeleteCurrentPost}
              />
            ) : null}
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default StaffBlogEditorPage;
