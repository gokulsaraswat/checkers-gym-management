import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  FitnessCenter,
  MonitorWeight,
  PlaylistAddCheck,
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
} from '../../services/gymService';
import { buildProgressSummary, createEmptyProgressForm, sortProgressRows } from '../dashboard/dashboardHelpers';
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
  formatDeltaLabel,
  formatMetric,
  getSuggestedPersonalRecordUnit,
  sortBodyMeasurementRows,
  sortPersonalRecordRows,
} from './progressHelpers';
import ProgressSnapshotCard from '../dashboard/components/ProgressSnapshotCard';

const ProgressTrackingPage = () => {
  const {
    user,
    loading,
    isConfigured,
  } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
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

  const loadProgressData = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [checkpointRows, measurementRows, recordRows] = await Promise.all([
        fetchProgressCheckpoints(user.id),
        fetchBodyMeasurements(user.id),
        fetchPersonalRecords(user.id),
      ]);

      setCheckpoints(sortProgressRows(checkpointRows));
      setMeasurements(sortBodyMeasurementRows(measurementRows));
      setRecords(sortPersonalRecordRows(recordRows));
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to load your progress hub.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

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
    if (!window.confirm('Delete this progress snapshot?')) {
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
    if (!window.confirm('Delete this body measurement entry?')) {
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
    if (!window.confirm('Delete this personal record entry?')) {
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
    setSnapshotFeedback({ type: '', message: '' });

    try {
      setSavingSnapshot(true);
      const savedRow = await saveProgressCheckpoint(user.id, snapshotForm, {
        recordedBy: user.id,
        entrySource: 'member_app',
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
    setMeasurementFeedback({ type: '', message: '' });

    try {
      setSavingMeasurement(true);
      const savedRow = await saveBodyMeasurement(user.id, measurementForm, {
        recordedBy: user.id,
        entrySource: 'member_app',
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
    setRecordFeedback({ type: '', message: '' });

    try {
      setSavingRecord(true);
      const savedRow = await savePersonalRecord(user.id, recordForm, {
        recordedBy: user.id,
        entrySource: 'member_app',
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
    return <LoadingScreen message="Loading your progress hub..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Progress tracking needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Progress hub
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Track measurements, body composition, and personal bests
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          This is the dedicated place for your fitness check-ins. Save body metrics, tape-measure entries,
          and new performance milestones so you can review progress beyond attendance alone.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.dashboard}
            variant="contained"
            startIcon={<TrendingUp />}
            sx={{ bgcolor: '#ff2625', borderRadius: 999, alignSelf: 'flex-start', '&:hover': { bgcolor: '#df1d1d' } }}
          >
            Back to dashboard
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.workoutPlan}
            variant="outlined"
            startIcon={<FitnessCenter />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Open workout plan
          </Button>
        </Stack>
      </Stack>

      {pageFeedback.message ? (
        <Alert severity={pageFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {pageFeedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Latest weight"
            value={formatMetric(overview.latestWeight, ' kg')}
            caption={formatDeltaLabel(overview.weightDelta, ' kg')}
            icon={MonitorWeight}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Latest body fat"
            value={formatMetric(overview.latestBodyFat, '%')}
            caption={`${overview.monthlyCheckIns} progress check-ins in the last 30 days`}
            icon={TrendingUp}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Latest waist"
            value={formatMetric(overview.latestWaist, ' cm')}
            caption={formatDeltaLabel(overview.waistDelta, ' cm')}
            icon={PlaylistAddCheck}
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
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <ProgressSnapshotCard
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
            disableActions={!isConfigured}
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ProgressTimelineCard timeline={timeline} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <BodyMeasurementsCard
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
            disableActions={!isConfigured}
          />
        </Grid>
        <Grid item xs={12} lg={6}>
          <PersonalRecordsCard
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
            disableActions={!isConfigured}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProgressTrackingPage;
