import React from 'react';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import BlogStatusChip from './BlogStatusChip';
import MarkdownRenderer from './MarkdownRenderer';
import { MARKDOWN_EMBED_HELP, formatBlogTagInput } from './blogHelpers';

const BlogEditorForm = ({
  form,
  saving = false,
  title = 'Compose article',
  description = 'Write, preview, and package blog content for the public site.',
  onFieldChange,
  onSave,
  onSubmit = null,
  onDelete = null,
  canDelete = false,
  showFeaturedToggle = false,
  showReviewNotes = false,
  saveLabel = 'Save draft',
  submitLabel = 'Submit for review',
  extraActions = null,
}) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h5" fontWeight={800}>
          {title}
        </Typography>
        <Typography color="text.secondary">
          {description}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Title"
            value={form.title || ''}
            onChange={(event) => onFieldChange('title', event.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Slug preview"
            value={form.slug || ''}
            onChange={(event) => onFieldChange('slug', event.target.value)}
            helperText="Leave blank to auto-generate from the title"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Summary"
            value={form.summary || ''}
            onChange={(event) => onFieldChange('summary', event.target.value)}
            multiline
            minRows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Cover image URL"
            value={form.cover_image_url || ''}
            onChange={(event) => onFieldChange('cover_image_url', event.target.value)}
            helperText="Optional. Used on the public article card and post header."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tags"
            value={form.tagsInput || ''}
            onChange={(event) => onFieldChange('tagsInput', event.target.value)}
            helperText="Separate tags with commas"
          />
        </Grid>
      </Grid>

      {showFeaturedToggle ? (
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(form.is_featured)}
              onChange={(event) => onFieldChange('is_featured', event.target.checked)}
            />
          )}
          label="Feature this article on the public blog"
        />
      ) : null}

      {showReviewNotes ? (
        <TextField
          fullWidth
          label="Review notes"
          value={form.review_notes || ''}
          onChange={(event) => onFieldChange('review_notes', event.target.value)}
          multiline
          minRows={3}
          helperText="Use review notes for moderation context, requested edits, or publishing instructions."
        />
      ) : null}

      <TextField
        fullWidth
        label="Markdown body"
        value={form.content_markdown || ''}
        onChange={(event) => onFieldChange('content_markdown', event.target.value)}
        multiline
        minRows={16}
        helperText={MARKDOWN_EMBED_HELP}
      />

      {extraActions ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          {extraActions}
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Button disabled={saving} variant="contained" onClick={onSave} sx={{ alignSelf: 'flex-start' }}>
          {saveLabel}
        </Button>
        {onSubmit ? (
          <Button disabled={saving} variant="outlined" onClick={onSubmit} sx={{ alignSelf: 'flex-start' }}>
            {submitLabel}
          </Button>
        ) : null}
        {canDelete && onDelete ? (
          <Button disabled={saving} color="error" variant="text" onClick={onDelete} sx={{ alignSelf: 'flex-start' }}>
            Delete post
          </Button>
        ) : null}
      </Stack>

      <Divider />

      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
            Live preview
          </Typography>
          <BlogStatusChip status={form.status || 'draft'} />
          <Typography variant="body2" color="text.secondary">
            Tags: {formatBlogTagInput(form.tagsInput || form.tags || []) || 'None yet'}
          </Typography>
        </Stack>

        {form.cover_image_url ? (
          <Box
            component="img"
            src={form.cover_image_url}
            alt={form.title || 'Blog cover preview'}
            sx={{
              width: '100%',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ) : null}

        <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '28px', md: '34px' } }}>
          {form.title || 'Untitled article'}
        </Typography>

        {form.summary ? (
          <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {form.summary}
          </Typography>
        ) : null}

        <MarkdownRenderer markdown={form.content_markdown || ''} />
      </Stack>
    </Stack>
  </Paper>
);

export default BlogEditorForm;
