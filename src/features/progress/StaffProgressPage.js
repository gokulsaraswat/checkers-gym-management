import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  FitnessCenter,
  MonitorWeight,
  PersonSearch,
  Refresh,
  TaskAlt,
  TrendingUp,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  deleteBodyMeasurement,
  deletePersonalRecord,
  deleteProgressCheckpoint,
  fetchBodyMeasurements,
  fetchPersonalRecords,
  fetchProgressCheckpoints,
  saveBodyMeasurement,
  savePersonalRecord,
  saveProgressCheckpoint,
  searchMembersForAttendance,
} from '../../services/gymService';
import {
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
} from '../members/memberLifecycle';
import {
  buildProgressSummary,
  createEmptyProgressForm,
  sortProgressRows,
} from '../dashboard/dashboardHelpers';
import ProgressSnapshotCard from '../dashboard/components/ProgressSnapshotCard';
import BodyMeasurementsCard from './components/BodyMeasurementsCard';
import PersonalRecordsCard from './components/PersonalRecordsCard';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import {
  buildBodyMeasurementSummary,
  buildPersonalRecordSummary,
  buildProgressOverview,
  buildProgressTimeline,
  createEmptyBodyMeasurementForm,
  createEmptyPersonalRecordForm,
  formatMetric,
  getSuggestedPersonalRecordUnit,
  sortBodyMeasurementRows,
  sortPersonalRecordRows,
} from './progressHelpers';

const StaffProgressPage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [memberRows, setMemberRows] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const [pageLoading, setPageLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [refreshingDirectory, setRefreshingDirectory] = useState(false);
  const [pageFeedback, setPageFeedback] = useState({ type: '', message: '' });

  const [checkpoints, setCheckpoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [records, setRecords] = useState([]);

  const [snapshotForm, setSnapshotForm] = useState(createEmptyProgressForm);
  const [measurementForm, setMeasurementForm] = useState(createEmptyBodyMeasurementForm);
  const [recordForm, setRecordForm] = useState(createEmptyPersonalRecordForm);

  const [snapshotFeedback, setSnapshotFeedback] = useState({ type: '', message: '' });
  const [measurementFeedback, setMeasurementFeedback] = useState({ type: '', message: '' });
  const [recordFeedback, setRecordFeedback] = useState({ type: '', message: '' });

  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const entrySource = profile?.role === 'admin' ? 'admin_panel' : 'staff_console';

  const loadMemberDirectory = useCallback(async (queryValue = '', showPageLoader = false) => {
    if (!isConfigured) {
      setPageLoading(false);
      return [];
    }

    try {
      if (showPageLoader) {
        setPageLoading(true);
      } else {
        setRefreshingDirectory(true);
      }

      const rows = await searchMembersForAttendance(queryValue, 40);
      setMemberRows(rows);
      setSelectedMemberId((currentSelectedId) => {
        if (currentSelectedId && rows.some((row) => row.id === currentSelectedId)) {
          return currentSelectedId;
        }

        return rows[0]?.id || '';
      });
      return rows;
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to load the member roster for progress tracking.',
      });
      return [];
    } finally {
      setPageLoading(false);
      setRefreshingDirectory(false);
    }
  }, [isConfigured]);

  const loadSelectedMemberData = useCallback(async (memberId) => {
    if (!memberId || !isConfigured) {
      setCheckpoints([]);
      setMeasurements([]);
      setRecords([]);
      return;
    }

    try {
      setMemberLoading(true);
      const [checkpointRows, measurementRows, recordRows] = await Promise.all([
        fetchProgressCheckpoints(memberId),
        fetchBodyMeasurements(memberId),
        fetchPersonalRecords(memberId),
      ]);

      setCheckpoints(sortProgressRows(checkpointRows));
      setMeasurements(sortBodyMeasurementRows(measurementRows));
      setRecords(sortPersonalRecordRows(recordRows));
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to load the selected member progress data.',
      });
    } finally {
      setMemberLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadMemberDirectory('', true);
  }, [loadMemberDirectory]);

  useEffect(() => {
    loadSelectedMemberData(selectedMemberId);
  }, [loadSelectedMemberData, selectedMemberId]);

  const selectedMember = useMemo(
    () => memberRows.find((member) => member.id === selectedMemberId) || null,
    [memberRows, selectedMemberId],
  );

  const snapshotSummary = useMemo(() => buildProgressSummary(checkpoints), [checkpoints]);
  const measurementSummary = useMemo(() => buildBodyMeasurementSummary(measurements), [measurements]);
  const recordSummary = useMemo(() => buildPersonalRecordSummary(records), [records]);
  const overview = useMemo(() => buildProgressOverview({
    checkpoints,
    measurements,
    records,
  }), [checkpoints, measurements, records]);
  const timeline = useMemo(() => buildProgressTimeline({
    checkpoints,
    measurements,
    records,
  }), [checkpoints, measurements, records]);

  const clearSectionFeedback = () => {
    setSnapshotFeedback({ type: '', message: '' });
    setMeasurementFeedback({ type: '', message: '' });
    setRecordFeedback({ type: '', message: '' });
  };

  const resetSnapshotForm = () => {
    setSnapshotForm(createEmptyProgressForm());
    setSnapshotFeedback({ type: '', message: '' });
  };

  const resetMeasurementForm = () => {
    setMeasurementForm(createEmptyBodyMeasurementForm());
    setMeasurementFeedback({ type: '', message: '' });
  };

  const resetRecordForm = () => {
    setRecordForm(createEmptyPersonalRecordForm());
    setRecordFeedback({ type: '', message: '' });
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateSnapshotField = (field) => (event) => {
    setSnapshotForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateMeasurementField = (field) => (event) => {
    setMeasurementForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateRecordField = (field) => (event) => {
    const nextValue = event.target.value;

    setRecordForm((current) => {
      if (field !== 'record_type') {
        return {
          ...current,
          [field]: nextValue,
        };
      }

      const nextSuggestedUnit = getSuggestedPersonalRecordUnit(nextValue);
      const shouldReplaceUnit = !current.unit || current.unit === getSuggestedPersonalRecordUnit(current.record_type);

      return {
        ...current,
        record_type: nextValue,
        unit: shouldReplaceUnit ? nextSuggestedUnit : current.unit,
      };
    });
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadMemberDirectory(searchQuery);
  };

  const handleRefreshDirectory = async () => {
    await loadMemberDirectory(searchQuery);
    if (selectedMemberId) {
      await loadSelectedMemberData(selectedMemberId);
    }
  };

  const handleSelectedMemberChange = async (event) => {
    const nextMemberId = event.target.value;
    setSelectedMemberId(nextMemberId);
    clearSectionFeedback();
    resetSnapshotForm();
    resetMeasurementForm();
    resetRecordForm();

    if (nextMemberId) {
      await loadSelectedMemberData(nextMemberId);
    }
  };

  const handleEditCheckpoint = (checkpoint) => {
    setSnapshotForm({
      id: checkpoint.id,
      recorded_on: checkpoint.recorded_on || new Date().toISOString().slice(0, 10),
      weight_kg: checkpoint.weight_kg ?? '',
      body_fat_percent: checkpoint.body_fat_percent ?? '',
      skeletal_muscle_percent: checkpoint.skeletal_muscle_percent ?? '',
      resting_heart_rate: checkpoint.resting_heart_rate ?? '',
      notes: checkpoint.notes || '',
    });
    scrollToSection('progress-snapshots');
  };

  const handleEditMeasurement = (measurement) => {
    setMeasurementForm({
      id: measurement.id,
      recorded_on: measurement.recorded_on || new Date().toISOString().slice(0, 10),
      height_cm: measurement.height_cm ?? '',
      chest_cm: measurement.chest_cm ?? '',
      waist_cm: measurement.waist_cm ?? '',
      hips_cm: measurement.hips_cm ?? '',
      left_arm_cm: measurement.left_arm_cm ?? '',
      right_arm_cm: measurement.right_arm_cm ?? '',
      left_thigh_cm: measurement.left_thigh_cm ?? '',
      right_thigh_cm: measurement.right_thigh_cm ?? '',
      notes: measurement.notes || '',
    });
    scrollToSection('body-measurements');
  };

  const handleEditRecord = (record) => {
    setRecordForm({
      id: record.id,
      exercise_name: record.exercise_name || '',
      record_type: record.record_type || 'weight',
      record_value: record.record_value ?? '',
      unit: record.unit || getSuggestedPersonalRecordUnit(record.record_type || 'weight'),
      achieved_on: record.achieved_on || new Date().toISOString().slice(0, 10),
      notes: record.notes || '',
    });
    scrollToSection('personal-records');
  };

  const handleDeleteCheckpoint = async (checkpointId) => {
    if (!window.confirm('Delete this progress snapshot for the selected member?')) {
      return;
    }

    try {
      await deleteProgressCheckpoint(checkpointId);
      setCheckpoints((current) => current.filter((row) => row.id !== checkpointId));
      if (snapshotForm.id === checkpointId) {
        resetSnapshotForm();
      }
      setSnapshotFeedback({ type: 'success', message: 'Progress snapshot deleted.' });
    } catch (error) {
      setSnapshotFeedback({ type: 'error', message: error.message || 'Unable to delete the progress snapshot.' });
    }
  };

  const handleDeleteMeasurement = async (measurementId) => {
    if (!window.confirm('Delete this body measurement entry for the selected member?')) {
      return;
    }

    try {
      await deleteBodyMeasurement(measurementId);
      setMeasurements((current) => current.filter((row) => row.id !== measurementId));
      if (measurementForm.id === measurementId) {
        resetMeasurementForm();
      }
      setMeasurementFeedback({ type: 'success', message: 'Body measurement deleted.' });
    } catch (error) {
      setMeasurementFeedback({ type: 'error', message: error.message || 'Unable to delete the body measurement.' });
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this personal record for the selected member?')) {
      return;
    }

    try {
      await deletePersonalRecord(recordId);
      setRecords((current) => current.filter((row) => row.id !== recordId));
      if (recordForm.id === recordId) {
        resetRecordForm();
      }
      setRecordFeedback({ type: 'success', message: 'Personal record deleted.' });
    } catch (error) {
      setRecordFeedback({ type: 'error', message: error.message || 'Unable to delete the personal record.' });
    }
  };

  const handleSubmitSnapshot = async (event) => {
    event.preventDefault();

    if (!selectedMemberId) {
      setSnapshotFeedback({ type: 'error', message: 'Select a member first.' });
      return;
    }

    try {
      setSavingSnapshot(true);
      const savedRow = await saveProgressCheckpoint(selectedMemberId, snapshotForm, {
        recordedBy: user?.id || null,
        entrySource,
      });

      setCheckpoints((current) => sortProgressRows(
        current.some((row) => row.id === savedRow.id)
          ? current.map((row) => (row.id === savedRow.id ? savedRow : row))
          : [savedRow, ...current],
      ));

      setSnapshotFeedback({
        type: 'success',
        message: snapshotForm.id ? 'Progress snapshot updated.' : 'Progress snapshot saved.',
      });
      resetSnapshotForm();
    } catch (error) {
      setSnapshotFeedback({ type: 'error', message: error.message || 'Unable to save the progress snapshot.' });
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleSubmitMeasurement = async (event) => {
    event.preventDefault();

    if (!selectedMemberId) {
      setMeasurementFeedback({ type: 'error', message: 'Select a member first.' });
      return;
    }

    try {
      setSavingMeasurement(true);
      const savedRow = await saveBodyMeasurement(selectedMemberId, measurementForm, {
        recordedBy: user?.id || null,
        entrySource,
      });

      setMeasurements((current) => sortBodyMeasurementRows(
        current.some((row) => row.id === savedRow.id)
          ? current.map((row) => (row.id === savedRow.id ? savedRow : row))
          : [savedRow, ...current],
      ));

      setMeasurementFeedback({
        type: 'success',
        message: measurementForm.id ? 'Body measurement updated.' : 'Body measurement saved.',
      });
      resetMeasurementForm();
    } catch (error) {
      setMeasurementFeedback({ type: 'error', message: error.message || 'Unable to save the body measurement.' });
    } finally {
      setSavingMeasurement(false);
    }
  };

  const handleSubmitRecord = async (event) => {
    event.preventDefault();

    if (!selectedMemberId) {
      setRecordFeedback({ type: 'error', message: 'Select a member first.' });
      return;
    }

    try {
      setSavingRecord(true);
      const savedRow = await savePersonalRecord(selectedMemberId, recordForm, {
        recordedBy: user?.id || null,
        entrySource,
      });

      setRecords((current) => sortPersonalRecordRows(
        current.some((row) => row.id === savedRow.id)
          ? current.map((row) => (row.id === savedRow.id ? savedRow : row))
          : [savedRow, ...current],
      ));

      setRecordFeedback({
        type: 'success',
        message: recordForm.id ? 'Personal record updated.' : 'Personal record saved.',
      });
      resetRecordForm();
    } catch (error) {
      setRecordFeedback({ type: 'error', message: error.message || 'Unable to save the personal record.' });
    } finally {
      setSavingRecord(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading staff progress tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Staff progress tracking needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff progress tracking
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Review member check-ins and coach measurable progress
        </Typography>
        <Typography color="text.secondary" maxWidth="900px">
          Trainers and staff can search the active roster, pick a member, and log weigh-ins,
          tape-measure updates, or new PRs during assessments and coaching sessions.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staff}
            variant="contained"
            startIcon={<TrendingUp />}
            sx={{ bgcolor: '#ff2625', borderRadius: 999, alignSelf: 'flex-start', '&:hover': { bgcolor: '#df1d1d' } }}
          >
            Back to staff workspace
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffWorkouts}
            variant="outlined"
            startIcon={<FitnessCenter />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Program workouts
          </Button>
        </Stack>
      </Stack>

      {pageFeedback.message ? (
        <Alert severity={pageFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {pageFeedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={7}>
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}
          >
            <TextField
              label="Search members"
              placeholder="Name, email, or phone"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<PersonSearch />}
              sx={{ bgcolor: '#ff2625', borderRadius: 999, alignSelf: 'flex-start', '&:hover': { bgcolor: '#df1d1d' } }}
            >
              Search roster
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefreshDirectory}
              disabled={refreshingDirectory}
              sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
            >
              Refresh
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <TextField
            select
            label="Selected member"
            value={selectedMemberId}
            onChange={handleSelectedMemberChange}
            fullWidth
          >
            {!memberRows.length ? (
              <MenuItem value="">
                No members found
              </MenuItem>
            ) : memberRows.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.full_name || member.email || member.id}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {selectedMember ? (
        <Box
          className="surface-card"
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: '#fff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {selectedMember.full_name || selectedMember.email || 'Selected member'}
                </Typography>
                <Typography color="text.secondary">
                  {selectedMember.email || 'No email on file'}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Chip
                  label={getMembershipStatusLabel(selectedMember.membership_status)}
                  sx={getMembershipStatusChipSx(selectedMember.membership_status)}
                />
                <Chip
                  label={selectedMember.is_active ? 'Access active' : 'Access paused'}
                  sx={{
                    bgcolor: selectedMember.is_active ? '#ecfdf3' : '#fef2f2',
                    color: selectedMember.is_active ? '#047857' : '#b91c1c',
                    fontWeight: 700,
                  }}
                />
                {selectedMember.has_open_visit ? (
                  <Chip
                    label="Checked in now"
                    sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700 }}
                  />
                ) : null}
              </Stack>
            </Stack>
            <Typography color="text.secondary">
              {selectedMember.plan_name ? `Plan: ${selectedMember.plan_name}` : 'No plan assigned'}
            </Typography>
          </Stack>
        </Box>
      ) : null}

      {memberLoading ? (
        <LoadingScreen message="Loading member progress..." />
      ) : (
        <>
          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Latest weight"
                value={formatMetric(overview.latestWeight, ' kg')}
                caption={`${overview.monthlyCheckIns} progress check-ins in the last 30 days`}
                icon={MonitorWeight}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Latest waist"
                value={formatMetric(overview.latestWaist, ' cm')}
                caption={`${overview.monthlyMeasurements} body measurement entries in the last 30 days`}
                icon={TrendingUp}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Personal records"
                value={overview.totalRecords}
                caption={`${overview.monthlyRecords} new records in the last 30 days`}
                icon={TaskAlt}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Progress activity"
                value={timeline.length}
                caption="Snapshots, measurements, and PRs combined"
                icon={FitnessCenter}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <ProgressSnapshotCard
                sectionLabel="Member progress snapshots"
                heading={selectedMember ? `${selectedMember.full_name || selectedMember.email} check-ins` : 'Member progress snapshots'}
                description="Log weigh-ins, body fat, or recovery notes during coaching sessions and assessment blocks."
                summary={snapshotSummary}
                checkpoints={checkpoints}
                form={snapshotForm}
                feedback={snapshotFeedback}
                saving={savingSnapshot}
                onFieldChange={updateSnapshotField}
                onSubmit={handleSubmitSnapshot}
                onEdit={handleEditCheckpoint}
                onDelete={handleDeleteCheckpoint}
                onResetForm={resetSnapshotForm}
                disableActions={!isConfigured || !selectedMemberId}
                emptyStateText="No progress snapshots yet for this member."
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <ProgressTimelineCard
                title={selectedMember ? `${selectedMember.full_name || selectedMember.email} activity timeline` : 'Member activity timeline'}
                description="Use this feed during consultations to review what has changed recently."
                timeline={timeline}
                emptyStateText="No progress activity exists yet for this member."
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <BodyMeasurementsCard
                sectionLabel="Member body measurements"
                heading="Capture tape-measure check-ins"
                description="Record circumference data for assessments, transformation tracking, and physique reviews."
                summary={measurementSummary}
                measurements={measurements}
                form={measurementForm}
                feedback={measurementFeedback}
                saving={savingMeasurement}
                onFieldChange={updateMeasurementField}
                onSubmit={handleSubmitMeasurement}
                onEdit={handleEditMeasurement}
                onDelete={handleDeleteMeasurement}
                onResetForm={resetMeasurementForm}
                disableActions={!isConfigured || !selectedMemberId}
                emptyStateText="No body measurements yet for this member."
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <PersonalRecordsCard
                sectionLabel="Member personal records"
                heading="Save new performance milestones"
                description="Track the lifts, reps, or conditioning benchmarks that matter most to the training plan."
                summary={recordSummary}
                records={records}
                form={recordForm}
                feedback={recordFeedback}
                saving={savingRecord}
                onFieldChange={updateRecordField}
                onSubmit={handleSubmitRecord}
                onEdit={handleEditRecord}
                onDelete={handleDeleteRecord}
                onResetForm={resetRecordForm}
                disableActions={!isConfigured || !selectedMemberId}
                emptyStateText="No personal records yet for this member."
              />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default StaffProgressPage;
