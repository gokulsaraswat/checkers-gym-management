import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  DEFAULT_BACKUP_POLICY,
  formatBytes,
  formatDateTime,
  normalizePolicyToForm,
} from '../opsHelpers';
import SectionCard from './SectionCard';
import StatusChip from './StatusChip';

const policyModes = ['manual', 'scheduled', 'vendor-managed'];
const policyScopes = ['database', 'storage', 'database-and-storage', 'files', 'ops-artifacts'];

export default function OpsBackupPanel({
  policies,
  runs,
  saving,
  loggingPolicyName,
  onSavePolicy,
  onLogPolicyRun,
}) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_BACKUP_POLICY }));

  const canSubmit = useMemo(() => (
    Boolean(form.policyName.trim())
      && Boolean(form.backupScope.trim())
      && Number(form.retentionDays) > 0
  ), [form.backupScope, form.policyName, form.retentionDays]);

  const handleFieldChange = (field) => (event) => {
    const { checked, value } = event.target;

    setForm((current) => ({
      ...current,
      [field]: field === 'enabled' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSavePolicy({
      ...form,
      retentionDays: Number(form.retentionDays) || DEFAULT_BACKUP_POLICY.retentionDays,
    });
  };

  return (
    <SectionCard
      title="Backup policies"
      subtitle="Track retention expectations, queue manual verification runs, and keep lightweight recovery notes visible for operators."
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <TextField
          label="Policy name"
          value={form.policyName}
          onChange={handleFieldChange('policyName')}
          fullWidth
          required
        />
        <TextField
          select
          label="Scope"
          value={form.backupScope}
          onChange={handleFieldChange('backupScope')}
          fullWidth
        >
          {policyScopes.map((scope) => (
            <MenuItem key={scope} value={scope}>
              {scope}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Mode"
          value={form.backupMode}
          onChange={handleFieldChange('backupMode')}
          fullWidth
        >
          {policyModes.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {mode}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Retention (days)"
          type="number"
          value={form.retentionDays}
          onChange={handleFieldChange('retentionDays')}
          inputProps={{ min: 1, step: 1 }}
          fullWidth
        />
        <TextField
          label="Notes"
          value={form.notes}
          onChange={handleFieldChange('notes')}
          multiline
          minRows={3}
          fullWidth
          sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
        >
          <FormControlLabel
            control={(
              <Switch
                checked={Boolean(form.enabled)}
                onChange={handleFieldChange('enabled')}
              />
            )}
            label="Enabled"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setForm({ ...DEFAULT_BACKUP_POLICY })}
              sx={{ textTransform: 'none', borderRadius: 999 }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit || saving}
              sx={{ textTransform: 'none', borderRadius: 999 }}
            >
              {saving ? 'Saving…' : 'Save policy'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          Active policies
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Policy</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Retention</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.length ? policies.map((policy) => {
              const policyName = policy.policy_name || policy.policyName;
              const isLogging = loggingPolicyName === policyName;

              return (
                <TableRow key={policy.id || policyName}>
                  <TableCell>
                    <Stack spacing={0.35}>
                      <Typography variant="body2" fontWeight={700}>
                        {policyName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {policy.backup_scope || policy.backupScope}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{policy.backup_mode || policy.backupMode}</TableCell>
                  <TableCell>{policy.retention_days || policy.retentionDays} days</TableCell>
                  <TableCell>
                    <StatusChip status={(policy.enabled ?? true) ? 'enabled' : 'disabled'} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setForm(normalizePolicyToForm(policy))}
                        sx={{ textTransform: 'none', borderRadius: 999 }}
                      >
                        Use values
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={isLogging}
                        onClick={() => onLogPolicyRun(policy)}
                        sx={{ textTransform: 'none', borderRadius: 999 }}
                      >
                        {isLogging ? 'Logging…' : 'Log success'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No backup policies found yet. Use the form above or the seed action to add the first policy.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          Recent backup runs
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Policy</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Bytes</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.length ? runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.policy_name || 'Manual run'}</TableCell>
                <TableCell>
                  <StatusChip status={run.run_status} />
                </TableCell>
                <TableCell>{formatDateTime(run.started_at)}</TableCell>
                <TableCell>{formatBytes(run.bytes_copied)}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {run.backup_location || 'Not recorded'}
                  </Typography>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No backup run logs yet. Use “Log success” on a policy after you complete a manual or vendor-managed backup check.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </SectionCard>
  );
}

OpsBackupPanel.propTypes = {
  loggingPolicyName: PropTypes.string,
  onLogPolicyRun: PropTypes.func.isRequired,
  onSavePolicy: PropTypes.func.isRequired,
  policies: PropTypes.arrayOf(PropTypes.shape({
    backup_mode: PropTypes.string,
    backup_scope: PropTypes.string,
    enabled: PropTypes.bool,
    id: PropTypes.string,
    notes: PropTypes.string,
    policy_name: PropTypes.string,
    retention_days: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  })),
  runs: PropTypes.arrayOf(PropTypes.shape({
    backup_location: PropTypes.string,
    bytes_copied: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    id: PropTypes.string.isRequired,
    policy_name: PropTypes.string,
    run_status: PropTypes.string,
    started_at: PropTypes.string,
  })),
  saving: PropTypes.bool,
};

OpsBackupPanel.defaultProps = {
  loggingPolicyName: '',
  policies: [],
  runs: [],
  saving: false,
};
