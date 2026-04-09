import React, { useCallback, useEffect, useState } from 'react';
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
import AccessLogsCard from './AccessLogsCard';
import {
  getAccessControlSnapshot,
  listAccessPoints,
  listRecentAccessEvents,
  listWaiverTemplates,
  upsertAccessPoint,
  upsertWaiverTemplate,
} from './accessClient';

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

export default function AdminAccessControlPage() {
  const [snapshot, setSnapshot] = useState({});
  const [accessPoints, setAccessPoints] = useState([]);
  const [waiverTemplates, setWaiverTemplates] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [accessPointDraft, setAccessPointDraft] = useState(emptyAccessPoint);
  const [waiverDraft, setWaiverDraft] = useState(emptyWaiver);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPage = useCallback(async () => {
    setError('');
    try {
      const [snapshotData, points, waivers, logs] = await Promise.all([
        getAccessControlSnapshot(14),
        listAccessPoints(),
        listWaiverTemplates(),
        listRecentAccessEvents(14),
      ]);
      setSnapshot(snapshotData || {});
      setAccessPoints(points);
      setWaiverTemplates(waivers);
      setRecentLogs(logs);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load access control admin data.');
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSaveAccessPoint = async () => {
    setError('');
    setSuccessMessage('');
    try {
      await upsertAccessPoint(accessPointDraft);
      setSuccessMessage('Access point saved.');
      setAccessPointDraft(emptyAccessPoint);
      await loadPage();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save access point.');
    }
  };

  const handleSaveWaiver = async () => {
    setError('');
    setSuccessMessage('');
    try {
      await upsertWaiverTemplate({
        ...waiverDraft,
        renewal_days: waiverDraft.requires_renewal ? Number(waiverDraft.renewal_days || 365) : null,
      });
      setSuccessMessage('Waiver template saved.');
      setWaiverDraft(emptyWaiver);
      await loadPage();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save waiver template.');
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack spacing={2} mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Access control and compliance
        </Typography>
        <Typography color="text.secondary">
          Track entry approvals, manage gate points, and keep waiver/compliance requirements ready for staffed or unstaffed access flows.
        </Typography>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}

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
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveAccessPoint} disabled={!accessPointDraft.branch_name || !accessPointDraft.name}>Save access point</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Liability waiver templates</Typography>
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
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveWaiver} disabled={!waiverDraft.title || !waiverDraft.version_code}>Save waiver template</Button>
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
