import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Rating,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FeedbackRoundedIcon from '@mui/icons-material/FeedbackRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import {
  feedbackTopics,
  visitTypeOptions,
} from './publicSiteContent';
import {
  buildFeedbackSummary,
  clearFeedbackDraft,
  createInitialFeedbackDraft,
  loadFeedbackDraft,
  publicSectionCardSx,
  saveFeedbackDraft,
} from './publicSiteHelpers';

const FeedbackPage = () => {
  const [form, setForm] = useState(createInitialFeedbackDraft);
  const [storageReady, setStorageReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState('');

  useEffect(() => {
    setForm(loadFeedbackDraft());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    saveFeedbackDraft(form);
  }, [form, storageReady]);

  const feedbackSummary = useMemo(() => buildFeedbackSummary(form), [form]);

  const updateField = (field) => (event) => {
    const nextValue = field === 'contactPermission' ? event.target.checked : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedSummary(feedbackSummary);
    clearFeedbackDraft();
    setForm(createInitialFeedbackDraft());
  };

  const handleCopy = async () => {
    if (typeof window === 'undefined' || !window.navigator?.clipboard) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(submittedSummary || feedbackSummary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PublicPageShell
      eyebrow="Public website"
      title="Feedback and suggestion page"
      description="Patch 31 adds a public-safe feedback route so suggestions, service issues, first-visit notes, and website comments can be collected without sending visitors into private member dashboards."
      chips={['Feedback intake', 'Local draft save', 'Public-safe form']}
      actions={[
        { label: 'Contact the team', to: PATHS.contact },
        { label: 'See testimonials', to: PATHS.testimonials },
      ]}
      stats={[
        { label: 'Draft handling', value: 'Local save', caption: 'Visitors can keep writing even before backend wiring exists.' },
        { label: 'Good for', value: 'Service loops', caption: 'Useful for ideas, issues, and public-site improvements.' },
        { label: 'Next step', value: 'CRM-ready', caption: 'Later route form output into email, CRM, or support tools.' },
      ]}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper component="form" variant="outlined" onSubmit={handleSubmit} sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <FeedbackRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={800}>
                  Share a note, issue, or improvement idea
                </Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Name" value={form.name} onChange={updateField('name')} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Email" type="email" value={form.email} onChange={updateField('email')} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Phone" value={form.phone} onChange={updateField('phone')} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField select label="Visit type" value={form.visitType} onChange={updateField('visitType')} fullWidth>
                    {visitTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField select label="Topic" value={form.topic} onChange={updateField('topic')} fullWidth>
                    {feedbackTopics.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>How would you rate the experience?</Typography>
                    <Rating
                      value={Number(form.rating)}
                      onChange={(event, nextValue) => setForm((current) => ({
                        ...current,
                        rating: nextValue ?? current.rating,
                      }))}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="What stood out, what felt unclear, or what should improve?"
                    value={form.message}
                    onChange={updateField('message')}
                    multiline
                    minRows={5}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Specific improvement idea"
                    value={form.improvementIdea}
                    onChange={updateField('improvementIdea')}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Switch checked={form.contactPermission} onChange={updateField('contactPermission')} />
                <Typography color="text.secondary">
                  I am okay with a follow-up message about this feedback.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button type="submit" variant="contained">
                  Save feedback summary
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => {
                    clearFeedbackDraft();
                    setForm(createInitialFeedbackDraft());
                  }}
                >
                  Reset draft
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={1.5}>
                <Typography variant="h5" fontWeight={800}>
                  Draft preview
                </Typography>
                <Typography color="text.secondary">
                  The form autosaves in the browser so the feedback page stays useful before email or CRM routing is wired up.
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {feedbackSummary}
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <MailOutlineRoundedIcon color="primary" />
                  <Typography variant="h5" fontWeight={800}>
                    After submit
                  </Typography>
                </Stack>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  This first version keeps the public page frontend-only. Once your preferred support inbox,
                  CRM, or automation path is ready, route the saved summary into that channel.
                </Typography>
                {submittedSummary ? (
                  <Alert severity="success" sx={{ borderRadius: 3 }}>
                    Feedback summary saved for follow-up. Copy the summary below or connect this route to your live support workflow next.
                  </Alert>
                ) : null}
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={handleCopy}
                  disabled={!submittedSummary && !feedbackSummary}
                >
                  Copy summary
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {copied ? (
        <Alert severity="info" sx={{ mt: 3, borderRadius: 3 }} onClose={() => setCopied(false)}>
          Feedback summary copied to the clipboard.
        </Alert>
      ) : null}
    </PublicPageShell>
  );
};

export default FeedbackPage;
