import React, { useCallback, useEffect, useState } from 'react';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import {
  getAccessControlSnapshot,
  listAccessPoints,
  listRecentAccessEvents,
  listWaiverTemplates,
  upsertAccessPoint,
  upsertWaiverTemplate,
} from './accessClient';
import AccessLogsCard from './AccessLogsCard';
import {
  formatAccessRefreshLabel,
  normalizeAccessError,
} from './accessStabilizationHelpers';

function SnapshotCard({ label, value, helper }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">{label}</Typography>
        <Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography>
        <Typography variant="body2" color="text.secondary">{helper}</Typography>
      </CardContent>
    </Card>
  );
}

const emptyAccessPoint = {
  branch_name: 'Main Branch',
  name: '',
  point_type: 'front_desk',
  description: '',
  offline_code: '',
  is_active: true,
};

const emptyWaiver = {
  title: '',
  version_code: '',
  summary: '',
  active_from: new Date().toISOString().slice(0, 10),
  requires_renewal: true,
  renewal_days: 365,
  is_active: true,
};

function normalizePositiveInteger(value, fallbackValue) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return Math.round(parsedValue);
}

export default function AdminAccessControlPage() {
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [snapshot, setSnapshot] = useState({});
  const [accessPoints, setAccessPoints] = useState([]);
  const [waiverTemplates, setWaiverTemplates] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [accessPointDraft, setAccessPointDraft] = useState(emptyAccessPoint);
  const [waiverDraft, setWaiverDraft] = useState(emptyWaiver);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [snapshotData, points, waivers, logs] = await Promise.all([
        getAccessControlSnapshot(14),
        listAccessPoints(),
        listWaiverTemplates(),
        listRecentAccessEvents(14),
      ]);

      setSnapshot(snapshotData || {});
      setAccessPoints(points || []);
      setWaiverTemplates(waivers || []);
      setRecentLogs(logs || []);
      setLastLoadedAt(new Date().toISOString());
    } catch (fetchError) {
      setError(normalizeAccessError(fetchError, 'Failed to load access control admin data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSaveAccessPoint = async () => {
    const normalizedDraft = {
      branch_name: accessPointDraft.branch_name.trim() || 'Main Branch',
      name: accessPointDraft.name.trim(),
      point_type: accessPointDraft.point_type.trim() || 'front_desk',
      description: accessPointDraft.description.trim(),
      offline_code: accessPointDraft.offline_code.trim().toUpperCase(),
      is_active: Boolean(accessPointDraft.is_active),
    };

    if (!normalizedDraft.name) {
      setError('Point name is required.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      await upsertAccessPoint(normalizedDraft);
      setSuccessMessage('Access point saved.');
      setAccessPointDraft(emptyAccessPoint);
      await loadPage();
    } catch (saveError) {
      setError(normalizeAccessError(saveError, 'Failed to save access point.'));
    }
  };

  const handleSaveWaiver = async () => {
    const normalizedTitle = waiverDraft.title.trim();
    const normalizedVersionCode = waiverDraft.version_code.trim();

    if (!normalizedTitle || !normalizedVersionCode) {
      setError('Waiver title and version code are required.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      await upsertWaiverTemplate({
        ...waiverDraft,
        title: normalizedTitle,
        version_code: normalizedVersionCode,
        summary: waiverDraft.summary.trim(),
        renewal_days: waiverDraft.requires_renewal
          ? normalizePositiveInteger(waiverDraft.renewal_days, 365)
          : null,
      });
      setSuccessMessage('Waiver template saved.');
      setWaiverDraft(emptyWaiver);
      await loadPage();
    } catch (saveError) {
      setError(normalizeAccessError(saveError, 'Failed to save waiver template.'));
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        mb={3}
      >
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={800}>
            Access control and compliance
          </Typography>
          <Typography color="text.secondary">
            Track entry approvals, manage gate points, and keep waiver/compliance requirements ready for staffed or unstaffed access flows. Launch the scanner console when you need a live QR check-in desk.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatAccessRefreshLabel(lastLoadedAt, 'Waiting for the first access admin sync.')}
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staffAccess}
            startIcon={<LaunchRoundedIcon />}
            variant="contained"
          >
            Scanner console
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.adminAccessHardware}
            startIcon={<LaunchRoundedIcon />}
            variant="outlined"
          >
            Hardware layer
          </Button>
          <Button
            variant="outlined"
            onClick={loadPage}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Refreshing access control admin data...</Alert> : null}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} lg={3}><SnapshotCard label="Allowed entries" value={snapshot.allowedCount} helper="Last 14 days" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SnapshotCard label="Denied entries" value={snapshot.deniedCount} helper="Last 14 days" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SnapshotCard label="QR scans" value={snapshot.qrScans} helper="Last 14 days" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><SnapshotCard label="Manual overrides" value={snapshot.manualOverrides} helper="Last 14 days" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={7}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Configured access points</Typography>
                {!accessPoints.length ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No access points are configured yet. Save the first staffed entry point below.
                  </Alert>
                ) : null}
                <Stack spacing={1.5} mb={3}>
                  {accessPoints.map((point) => (
                    <Stack key={point.id} direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                      <Stack>
                        <Typography fontWeight={700}>{point.branch_name} · {point.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{point.point_type} • {point.description || 'No description'} • Offline code: {point.offline_code || '—'}</Typography>
                      </Stack>
                      <Chip label={point.is_active ? 'Active' : 'Inactive'} color={point.is_active ? 'success' : 'default'} size="small" />
                    </Stack>
                  ))}
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Add or update access point</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Branch name" value={accessPointDraft.branch_name} onChange={(event) => setAccessPointDraft((current) => ({ ...current, branch_name: event.target.value }))} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Point name" value={accessPointDraft.name} onChange={(event) => setAccessPointDraft((current) => ({ ...current, name: event.target.value }))} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Point type" value={accessPointDraft.point_type} onChange={(event) => setAccessPointDraft((current) => ({ ...current, point_type: event.target.value }))} helperText="front_desk, turnstile, door, studio, gate, self_check" /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Offline code" value={accessPointDraft.offline_code} onChange={(event) => setAccessPointDraft((current) => ({ ...current, offline_code: event.target.value }))} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Description" value={accessPointDraft.description} onChange={(event) => setAccessPointDraft((current) => ({ ...current, description: event.target.value }))} multiline minRows={2} /></Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2">Active</Typography>
                      <Switch checked={Boolean(accessPointDraft.is_active)} onChange={(event) => setAccessPointDraft((current) => ({ ...current, is_active: event.target.checked }))} />
                    </Stack>
                  </Grid>
                </Grid>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveAccessPoint} disabled={loading || !accessPointDraft.branch_name.trim() || !accessPointDraft.name.trim()}>
                  Save access point
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Liability waiver templates</Typography>
                {!waiverTemplates.length ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No waiver templates are configured yet. Add the current active waiver version below.
                  </Alert>
                ) : null}
                <Stack spacing={1.5} mb={3}>
                  {waiverTemplates.map((template) => (
                    <Box key={template.id}>
                      <Typography fontWeight={700}>{template.title}</Typography>
                      <Typography variant="body2" color="text.secondary">Version: {template.version_code} • Active from: {template.active_from} • Renewal: {template.requires_renewal ? `${template.renewal_days || 'No'} days` : 'Not required'}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Add or update waiver template</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Title" value={waiverDraft.title} onChange={(event) => setWaiverDraft((current) => ({ ...current, title: event.target.value }))} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Version code" value={waiverDraft.version_code} onChange={(event) => setWaiverDraft((current) => ({ ...current, version_code: event.target.value }))} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth type="date" label="Active from" InputLabelProps={{ shrink: true }} value={waiverDraft.active_from} onChange={(event) => setWaiverDraft((current) => ({ ...current, active_from: event.target.value }))} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Renewal days" value={waiverDraft.renewal_days} onChange={(event) => setWaiverDraft((current) => ({ ...current, renewal_days: event.target.value }))} disabled={!waiverDraft.requires_renewal} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Summary" value={waiverDraft.summary} onChange={(event) => setWaiverDraft((current) => ({ ...current, summary: event.target.value }))} multiline minRows={3} /></Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Requires renewal</Typography><Switch checked={Boolean(waiverDraft.requires_renewal)} onChange={(event) => setWaiverDraft((current) => ({ ...current, requires_renewal: event.target.checked }))} /></Stack>
                      <Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Active</Typography><Switch checked={Boolean(waiverDraft.is_active)} onChange={(event) => setWaiverDraft((current) => ({ ...current, is_active: event.target.checked }))} /></Stack>
                    </Stack>
                  </Grid>
                </Grid>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveWaiver} disabled={loading || !waiverDraft.title.trim() || !waiverDraft.version_code.trim()}>
                  Save waiver template
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
        <Grid item xs={12} xl={5}>
          <AccessLogsCard title="Recent access decisions" logs={recentLogs} emptyMessage="Your access logs will appear here once gate activity starts." />
        </Grid>
      </Grid>
    </Box>
  );
}
