import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import {
  fetchAnalyticsSnapshot,
  fetchBranchOptions,
  fetchMembersAtRisk,
  fetchRecentModelRuns,
  fetchRetentionCohorts,
  fetchRevenueForecasts,
  fetchTrainerOptions,
  fetchTrainerPerformance,
  refreshMemberRiskScores,
  saveRevenueForecast,
  saveTrainerSnapshot,
} from './analyticsClient';
import {
  formatCompactNumber,
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  formatPercent,
} from './formatters';

const emptyForecastForm = {
  branchId: '',
  forecastMonth: new Date().toISOString().slice(0, 10),
  forecastPeriod: 'monthly',
  projectedRevenue: '',
  confirmedRevenue: '',
  confidenceScore: 70,
  assumptionsText: '',
};

const emptyTrainerForm = {
  branchId: '',
  trainerId: '',
  snapshotMonth: new Date().toISOString().slice(0, 10),
  sessionsCompleted: '',
  uniqueMembers: '',
  avgAttendance: '',
  memberRetentionScore: '',
  ptRevenue: '',
  commissionGenerated: '',
  notes: '',
};

function SectionCard({ title, subtitle, icon, action, children }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 4 }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              {icon}
              <Typography variant="h6">{title}</Typography>
            </Stack>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function KpiCard({ title, value, hint, color = 'primary.main', icon }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 4 }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Box sx={{ color }}>{icon}</Box>
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function riskChipColor(level) {
  if (level === 'high') return 'error';
  if (level === 'medium') return 'warning';
  return 'success';
}

export default function AdminInsightsPage() {
  const [branchId, setBranchId] = useState('');
  const [snapshotMonth, setSnapshotMonth] = useState(new Date().toISOString().slice(0, 10));
  const [branches, setBranches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [membersAtRisk, setMembersAtRisk] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [trainerRows, setTrainerRows] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [modelRuns, setModelRuns] = useState([]);
  const [forecastForm, setForecastForm] = useState(emptyForecastForm);
  const [trainerForm, setTrainerForm] = useState(emptyTrainerForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingForecast, setSavingForecast] = useState(false);
  const [savingTrainer, setSavingTrainer] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const selectedBranchName = useMemo(() => {
    const match = branches.find((branch) => branch.id === branchId);
    return match?.name || 'All branches';
  }, [branchId, branches]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [branchList, trainerList, snapshotData, riskRows, forecastRows, performanceRows, cohortRows, runRows] = await Promise.all([
        fetchBranchOptions(),
        fetchTrainerOptions(),
        fetchAnalyticsSnapshot(branchId || null),
        fetchMembersAtRisk(branchId || null, 12),
        fetchRevenueForecasts(branchId || null, 6),
        fetchTrainerPerformance(branchId || null, snapshotMonth, 8),
        fetchRetentionCohorts(branchId || null, 6),
        fetchRecentModelRuns(branchId || null, 8),
      ]);

      setBranches(branchList || []);
      setTrainers(trainerList || []);
      setSnapshot(snapshotData);
      setMembersAtRisk(riskRows || []);
      setForecasts(forecastRows || []);
      setTrainerRows(performanceRows || []);
      setCohorts(cohortRows || []);
      setModelRuns(runRows || []);

      setForecastForm((current) => ({
        ...current,
        branchId: current.branchId || branchId || branchList?.[0]?.id || '',
      }));
      setTrainerForm((current) => ({
        ...current,
        branchId: current.branchId || branchId || branchList?.[0]?.id || '',
      }));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load analytics insights.');
    } finally {
      setLoading(false);
    }
  }, [branchId, snapshotMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRiskRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await refreshMemberRiskScores(branchId || null);
      setSnackbar({
        open: true,
        severity: 'success',
        message: result
          ? `Risk model refreshed. Processed ${result.processed_count || 0} members.`
          : 'Risk model refreshed.',
      });
      await loadData();
    } catch (refreshError) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: refreshError.message || 'Failed to refresh risk scores.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveForecast = async (event) => {
    event.preventDefault();
    setSavingForecast(true);
    try {
      await saveRevenueForecast({
        branchId: forecastForm.branchId,
        forecastMonth: forecastForm.forecastMonth,
        forecastPeriod: forecastForm.forecastPeriod,
        projectedRevenue: forecastForm.projectedRevenue,
        confirmedRevenue: forecastForm.confirmedRevenue,
        confidenceScore: forecastForm.confidenceScore,
        assumptions: forecastForm.assumptionsText
          ? { notes: forecastForm.assumptionsText }
          : {},
      });
      setSnackbar({ open: true, severity: 'success', message: 'Revenue forecast saved.' });
      setForecastForm((current) => ({ ...emptyForecastForm, branchId: current.branchId || branchId || '' }));
      await loadData();
    } catch (saveError) {
      setSnackbar({ open: true, severity: 'error', message: saveError.message || 'Failed to save forecast.' });
    } finally {
      setSavingForecast(false);
    }
  };

  const handleSaveTrainer = async (event) => {
    event.preventDefault();
    setSavingTrainer(true);
    try {
      await saveTrainerSnapshot({
        ...trainerForm,
      });
      setSnackbar({ open: true, severity: 'success', message: 'Trainer snapshot saved.' });
      setTrainerForm((current) => ({ ...emptyTrainerForm, branchId: current.branchId || branchId || '' }));
      await loadData();
    } catch (saveError) {
      setSnackbar({ open: true, severity: 'error', message: saveError.message || 'Failed to save trainer snapshot.' });
    } finally {
      setSavingTrainer(false);
    }
  };

  const maxProjectedRevenue = Math.max(...forecasts.map((row) => Number(row.projected_revenue || 0)), 1);
  const maxRetention = Math.max(...cohorts.map((row) => Number(row.retention_rate || 0)), 1);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 3 }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', lg: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Advanced analytics
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            Monitor revenue momentum, membership risk, retention, and trainer performance for {selectedBranchName.toLowerCase()}.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label="Branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All accessible branches</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="Snapshot month"
            value={snapshotMonth}
            onChange={(event) => setSnapshotMonth(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshRoundedIcon />}
            onClick={handleRiskRefresh}
            disabled={refreshing || loading}
          >
            Refresh risk scores
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Active members"
            value={formatCompactNumber(snapshot?.active_members || 0)}
            hint={`${formatCompactNumber(snapshot?.expiring_this_month || 0)} expiring this month`}
            color="primary.main"
            icon={<Diversity3RoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="At-risk members"
            value={formatCompactNumber(snapshot?.at_risk_members || 0)}
            hint={`${formatCompactNumber(snapshot?.high_risk_members || 0)} marked high risk`}
            color="warning.main"
            icon={<WarningAmberRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Current month revenue"
            value={formatCurrency(snapshot?.current_month_revenue || 0)}
            hint={`Forecast gap ${formatCurrency(snapshot?.forecast_gap || 0)}`}
            color="success.main"
            icon={<TrendingUpRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Projected revenue"
            value={formatCurrency(snapshot?.projected_month_revenue || 0)}
            hint={`Expenses ${formatCurrency(snapshot?.current_month_expenses || 0)}`}
            color="secondary.main"
            icon={<InsightsRoundedIcon />}
          />
        </Grid>
      </Grid>

      {loading ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ py: 8, display: 'grid', placeItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading analytics workspace...
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          <Grid item xs={12} xl={8}>
            <SectionCard
              title="Members most at risk"
              subtitle="Heuristic score uses renewal timing, missed attendance, and unpaid balance."
              icon={<WarningAmberRoundedIcon color="warning" />}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell align="right">Risk</TableCell>
                      <TableCell>Signals</TableCell>
                      <TableCell>Last visit</TableCell>
                      <TableCell>Expiry</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {membersAtRisk.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No member risk rows yet. Click refresh risk scores to generate the first snapshot.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      membersAtRisk.map((member) => (
                        <TableRow key={member.member_id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {member.full_name || member.email || 'Unnamed member'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.email || 'No email'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{member.branch_name || '—'}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {Number(member.risk_score || 0).toFixed(0)}
                              </Typography>
                              <Chip size="small" label={member.risk_level || 'low'} color={riskChipColor(member.risk_level)} />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {member.days_since_visit != null ? (
                                <Chip size="small" variant="outlined" label={`${member.days_since_visit}d since visit`} />
                              ) : null}
                              {member.days_to_expiry != null ? (
                                <Chip size="small" variant="outlined" label={`${member.days_to_expiry}d to expiry`} />
                              ) : null}
                              {Number(member.outstanding_due || 0) > 0 ? (
                                <Chip size="small" variant="outlined" label={`${formatCurrency(member.outstanding_due)} due`} />
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>{formatDateLabel(member.last_check_in_at)}</TableCell>
                          <TableCell>{formatDateLabel(member.membership_end_date)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Grid>

          <Grid item xs={12} xl={4}>
            <SectionCard
              title="Recent model runs"
              subtitle="Every risk refresh is logged so you can track analytics freshness."
              icon={<InsightsRoundedIcon color="primary" />}
            >
              <Stack spacing={1.25}>
                {modelRuns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No model run history yet.
                  </Typography>
                ) : (
                  modelRuns.map((run) => (
                    <Box key={run.id} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {run.model_key || 'risk-model'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {run.branch_name || 'All branches'}
                          </Typography>
                        </Box>
                        <Chip size="small" label={run.run_status || 'completed'} color={run.run_status === 'failed' ? 'error' : 'success'} />
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Processed {formatCompactNumber(run.rows_processed || 0)} rows on {formatDateLabel(run.ran_at)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard
              title="Revenue forecast tracker"
              subtitle="Forecasts are saved per branch and month so finance can compare plan vs actual."
              icon={<TrendingUpRoundedIcon color="success" />}
            >
              <Stack component="form" spacing={2} onSubmit={handleSaveForecast} sx={{ mb: 3 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Branch"
                      value={forecastForm.branchId}
                      onChange={(event) => setForecastForm((current) => ({ ...current, branchId: event.target.value }))}
                    >
                      {branches.map((branch) => (
                        <MenuItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      label="Forecast month"
                      value={forecastForm.forecastMonth}
                      onChange={(event) => setForecastForm((current) => ({ ...current, forecastMonth: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Projected revenue"
                      type="number"
                      value={forecastForm.projectedRevenue}
                      onChange={(event) => setForecastForm((current) => ({ ...current, projectedRevenue: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Confirmed revenue"
                      type="number"
                      value={forecastForm.confirmedRevenue}
                      onChange={(event) => setForecastForm((current) => ({ ...current, confirmedRevenue: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Confidence score"
                      type="number"
                      value={forecastForm.confidenceScore}
                      onChange={(event) => setForecastForm((current) => ({ ...current, confidenceScore: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Assumptions / notes"
                      value={forecastForm.assumptionsText}
                      onChange={(event) => setForecastForm((current) => ({ ...current, assumptionsText: event.target.value }))}
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={savingForecast}>
                    {savingForecast ? 'Saving...' : 'Save forecast'}
                  </Button>
                </Stack>
              </Stack>
              <Stack spacing={1.5}>
                {forecasts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No revenue forecasts saved yet.
                  </Typography>
                ) : (
                  forecasts.map((row) => {
                    const projected = Number(row.projected_revenue || 0);
                    const confirmed = Number(row.confirmed_revenue || 0);
                    const width = Math.max(12, (projected / maxProjectedRevenue) * 100);
                    return (
                      <Box key={`${row.branch_id}-${row.forecast_month}`} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.branch_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMonthLabel(row.forecast_month)}
                            </Typography>
                          </Box>
                          <Chip size="small" label={`${Math.round(Number(row.confidence_score || 0))}% confidence`} />
                        </Stack>
                        <Box sx={{ mt: 1.5, height: 10, borderRadius: 999, bgcolor: 'divider', overflow: 'hidden' }}>
                          <Box sx={{ width: `${width}%`, height: '100%', bgcolor: 'success.main' }} />
                        </Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                          <Typography variant="body2">Projected {formatCurrency(projected)}</Typography>
                          <Typography variant="body2" color="text.secondary">Confirmed {formatCurrency(confirmed)}</Typography>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard
              title="Trainer performance"
              subtitle="Log monthly trainer snapshots to compare retention, attendance, PT revenue, and commission output."
              icon={<LeaderboardRoundedIcon color="secondary" />}
            >
              <Stack component="form" spacing={2} onSubmit={handleSaveTrainer} sx={{ mb: 3 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Branch"
                      value={trainerForm.branchId}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, branchId: event.target.value }))}
                    >
                      {branches.map((branch) => (
                        <MenuItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Trainer"
                      value={trainerForm.trainerId}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, trainerId: event.target.value }))}
                    >
                      {trainers.map((trainer) => (
                        <MenuItem key={trainer.id} value={trainer.id}>
                          {trainer.full_name || trainer.email || trainer.id}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      label="Snapshot month"
                      value={trainerForm.snapshotMonth}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, snapshotMonth: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Sessions completed"
                      type="number"
                      value={trainerForm.sessionsCompleted}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, sessionsCompleted: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Unique members"
                      type="number"
                      value={trainerForm.uniqueMembers}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, uniqueMembers: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Avg attendance"
                      type="number"
                      value={trainerForm.avgAttendance}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, avgAttendance: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Retention score"
                      type="number"
                      value={trainerForm.memberRetentionScore}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, memberRetentionScore: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="PT revenue"
                      type="number"
                      value={trainerForm.ptRevenue}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, ptRevenue: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Commission generated"
                      type="number"
                      value={trainerForm.commissionGenerated}
                      onChange={(event) => setTrainerForm((current) => ({ ...current, commissionGenerated: event.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  value={trainerForm.notes}
                  onChange={(event) => setTrainerForm((current) => ({ ...current, notes: event.target.value }))}
                />
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={savingTrainer}>
                    {savingTrainer ? 'Saving...' : 'Save trainer snapshot'}
                  </Button>
                </Stack>
              </Stack>
              <Stack spacing={1.5}>
                {trainerRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No trainer snapshots saved for the selected month.
                  </Typography>
                ) : (
                  trainerRows.map((row) => (
                    <Box key={`${row.trainer_id}-${row.snapshot_month}-${row.branch_id}`} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.trainer_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.branch_name} · {formatMonthLabel(row.snapshot_month)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(row.pt_revenue || 0)} PT
                        </Typography>
                      </Stack>
                      <Stack spacing={1} sx={{ mt: 1.25 }}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption">Retention score</Typography>
                            <Typography variant="caption">{Math.round(Number(row.member_retention_score || 0))}%</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, Number(row.member_retention_score || 0)))}
                            sx={{ mt: 0.5, height: 8, borderRadius: 999 }}
                          />
                        </Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption">Sessions {row.sessions_completed || 0}</Typography>
                          <Typography variant="caption">Members {row.unique_members || 0}</Typography>
                          <Typography variant="caption">Commission {formatCurrency(row.commission_generated || 0)}</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard
              title="Retention cohorts"
              subtitle="Signup month cohorts let you quickly see whether member retention is improving or slipping."
              icon={<Diversity3RoundedIcon color="primary" />}
            >
              <Stack spacing={1.5}>
                {cohorts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No retention cohorts available yet.
                  </Typography>
                ) : (
                  cohorts.map((row) => {
                    const width = Math.max(8, (Number(row.retention_rate || 0) / maxRetention) * 100);
                    return (
                      <Box key={`${row.cohort_month}-${row.branch_name || 'all'}`}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatMonthLabel(row.cohort_month)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {row.active_now || 0} / {row.cohort_size || 0} active
                          </Typography>
                        </Stack>
                        <Box sx={{ mt: 0.75, height: 10, borderRadius: 999, bgcolor: 'divider', overflow: 'hidden' }}>
                          <Box sx={{ width: `${width}%`, height: '100%', bgcolor: 'primary.main' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Retention {formatPercent(Number(row.retention_rate || 0) / 100)}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard
              title="Snapshot notes"
              subtitle="Use this page to store monthly forecast and trainer snapshot baselines before running deeper reports or exports."
              icon={<InsightsRoundedIcon color="secondary" />}
            >
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  The risk model is rule-based. It does not call an external AI API, so it works without extra billing or secrets.
                </Alert>
                <Alert severity="success" sx={{ borderRadius: 3 }}>
                  This patch is designed to complement your earlier finance, export, staff, and branch patches. The new route works well on laptop and tablet layouts.
                </Alert>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Suggested workflow each week: refresh risk scores, review expiring members, update this month’s forecast, and capture trainer snapshot metrics after payroll close.
                </Typography>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
