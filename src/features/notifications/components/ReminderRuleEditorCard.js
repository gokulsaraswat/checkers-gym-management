import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Autorenew,
  NotificationsActive,
  PlayArrow,
  Preview,
  Save,
} from '@mui/icons-material';

import {
  DELIVERY_CHANNEL_OPTIONS,
  NOTIFICATION_AUDIENCE_OPTIONS,
  formatReminderLastRun,
  formatReminderLeadLabel,
  getReminderTypeOption,
  REMINDER_LEAD_UNIT_OPTIONS,
  REMINDER_TEMPLATE_PLACEHOLDERS,
  REMINDER_TYPE_OPTIONS,
} from '../notificationsHelpers';

const ReminderRuleEditorCard = ({
  rules,
  selectedRuleId,
  rule,
  feedback,
  loading,
  saving,
  previewing,
  running,
  onSelectRule,
  onFieldChange,
  onReload,
  onSave,
  onPreview,
  onRun,
}) => {
  const selectedRule = rules.find((entry) => entry.id === selectedRuleId) || rule;
  const reminderType = getReminderTypeOption(rule.reminder_type);

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography color="#ff2625" fontWeight={700}>
              Reminder centre
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              Schedule reusable reminder playbooks
            </Typography>
            <Typography color="text.secondary" maxWidth="760px">
              Configure reminder rules once, preview exactly who matches, then trigger the reminder in a controlled batch.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={onReload}
            disabled={loading}
            startIcon={<Autorenew />}
            sx={{ textTransform: 'none', borderRadius: 999, alignSelf: { xs: 'flex-start', md: 'center' } }}
          >
            {loading ? 'Refreshing…' : 'Refresh rules'}
          </Button>
        </Stack>

        {feedback?.message ? (
          <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Reminder rule"
            value={selectedRuleId}
            onChange={(event) => onSelectRule(event.target.value)}
            fullWidth
            helperText={selectedRule?.last_run_at ? `Last run ${formatReminderLastRun(selectedRule.last_run_at)}` : 'Select a rule to edit or preview it.'}
          >
            {!rules.length ? (
              <MenuItem value="" disabled>
                No reminder rules found yet
              </MenuItem>
            ) : null}
            {rules.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Lead time"
            value={formatReminderLeadLabel(rule.lead_value, rule.lead_unit)}
            InputProps={{ readOnly: true }}
            sx={{ minWidth: { md: 220 } }}
            helperText={rule.enabled ? 'Rule is enabled' : 'Rule is currently disabled'}
          />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <TextField
            label="Rule title"
            value={rule.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            fullWidth
          />

          <TextField
            label="Short description"
            value={rule.description}
            onChange={(event) => onFieldChange('description', event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Reminder type"
              value={rule.reminder_type}
              onChange={(event) => onFieldChange('reminder_type', event.target.value)}
              fullWidth
              helperText={reminderType.description}
            >
              {REMINDER_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Audience"
              value={rule.target_role}
              onChange={(event) => onFieldChange('target_role', event.target.value)}
              fullWidth
            >
              {NOTIFICATION_AUDIENCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Delivery channel"
              value={rule.delivery_channel}
              onChange={(event) => onFieldChange('delivery_channel', event.target.value)}
              fullWidth
            >
              {DELIVERY_CHANNEL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="Lead value"
              value={rule.lead_value}
              onChange={(event) => onFieldChange('lead_value', event.target.value)}
              fullWidth
              inputProps={{ min: 0, max: 90 }}
            />
            <TextField
              select
              label="Lead unit"
              value={rule.lead_unit}
              onChange={(event) => onFieldChange('lead_unit', event.target.value)}
              fullWidth
            >
              {REMINDER_LEAD_UNIT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Cooldown (hours)"
              value={rule.cooldown_hours}
              onChange={(event) => onFieldChange('cooldown_hours', event.target.value)}
              fullWidth
              inputProps={{ min: 0, max: 720 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Action label"
              value={rule.action_label}
              onChange={(event) => onFieldChange('action_label', event.target.value)}
              fullWidth
            />
            <TextField
              label="Action path"
              value={rule.action_path}
              onChange={(event) => onFieldChange('action_path', event.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            label="Title template"
            value={rule.title_template}
            onChange={(event) => onFieldChange('title_template', event.target.value)}
            fullWidth
          />

          <TextField
            label="Message template"
            value={rule.message_template}
            onChange={(event) => onFieldChange('message_template', event.target.value)}
            multiline
            minRows={4}
            fullWidth
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={(
                <Switch
                  checked={Boolean(rule.enabled)}
                  onChange={(event) => onFieldChange('enabled', event.target.checked)}
                />
              )}
              label="Rule enabled"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={Boolean(rule.respect_preferences)}
                  onChange={(event) => onFieldChange('respect_preferences', event.target.checked)}
                />
              )}
              label="Respect member preferences"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={Boolean(rule.include_inactive)}
                  onChange={(event) => onFieldChange('include_inactive', event.target.checked)}
                />
              )}
              label="Include inactive members"
            />
          </Stack>
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            Available template placeholders
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {REMINDER_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
              <Chip
                key={placeholder.key}
                size="small"
                label={`{{${placeholder.key}}}`}
                title={placeholder.description}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving}
            startIcon={<Save />}
            sx={{ bgcolor: '#ff2625', textTransform: 'none', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
          >
            {saving ? 'Saving…' : 'Save rule'}
          </Button>
          <Button
            variant="outlined"
            onClick={onPreview}
            disabled={previewing}
            startIcon={<Preview />}
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            {previewing ? 'Previewing…' : 'Preview recipients'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={onRun}
            disabled={running}
            startIcon={<PlayArrow />}
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            {running ? 'Running…' : 'Run reminder now'}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <NotificationsActive color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            Running a rule generates in-app reminders through the existing notifications inbox and respects reminder cooldown windows.
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ReminderRuleEditorCard;
