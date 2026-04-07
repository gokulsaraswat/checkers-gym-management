const normaliseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const nextValue = value.includes?.('T') ? value : `${value}T00:00:00`;
  const parsedValue = new Date(nextValue);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
};

export const formatProgressDate = (value, fallback = 'Not set') => {
  const parsedValue = normaliseDateValue(value);

  if (!parsedValue) {
    return fallback;
  }

  return parsedValue.toLocaleDateString();
};

export const formatMetric = (value, suffix = '', fallback = '—', decimals = 1) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return `${value}${suffix}`;
  }

  const stringValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(decimals);

  return `${stringValue}${suffix}`;
};

export const formatDeltaLabel = (value, suffix = '', fallback = 'No comparison yet', decimals = 1) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  const prefix = numericValue > 0 ? '+' : '';
  const stringValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(decimals);

  return `${prefix}${stringValue}${suffix}`;
};

const buildSortKey = (primaryDate, createdAt) => `${primaryDate || ''}${createdAt || ''}`;

export const sortBodyMeasurementRows = (rows = []) => [...rows].sort((left, right) => (
  buildSortKey(right?.recorded_on, right?.created_at).localeCompare(
    buildSortKey(left?.recorded_on, left?.created_at),
  )
));

export const sortPersonalRecordRows = (rows = []) => [...rows].sort((left, right) => (
  buildSortKey(right?.achieved_on, right?.created_at).localeCompare(
    buildSortKey(left?.achieved_on, left?.created_at),
  )
));

export const createEmptyBodyMeasurementForm = () => ({
  id: '',
  recorded_on: new Date().toISOString().slice(0, 10),
  height_cm: '',
  chest_cm: '',
  waist_cm: '',
  hips_cm: '',
  left_arm_cm: '',
  right_arm_cm: '',
  left_thigh_cm: '',
  right_thigh_cm: '',
  notes: '',
});

export const PERSONAL_RECORD_TYPE_OPTIONS = [
  { value: 'weight', label: 'Weight' },
  { value: 'reps', label: 'Reps' },
  { value: 'distance', label: 'Distance' },
  { value: 'time', label: 'Time' },
  { value: 'volume', label: 'Volume' },
  { value: 'custom', label: 'Custom' },
];

const PERSONAL_RECORD_TYPE_META = {
  weight: { label: 'Weight', background: '#eef2ff', color: '#4338ca' },
  reps: { label: 'Reps', background: '#eff6ff', color: '#1d4ed8' },
  distance: { label: 'Distance', background: '#ecfeff', color: '#0f766e' },
  time: { label: 'Time', background: '#fff7ed', color: '#c2410c' },
  volume: { label: 'Volume', background: '#ecfdf3', color: '#047857' },
  custom: { label: 'Custom', background: '#f8fafc', color: '#475569' },
};

const PERSONAL_RECORD_DEFAULT_UNITS = {
  weight: 'kg',
  reps: 'reps',
  distance: 'm',
  time: 'sec',
  volume: 'kg',
  custom: 'units',
};

export const getPersonalRecordTypeMeta = (recordType) => (
  PERSONAL_RECORD_TYPE_META[recordType] || PERSONAL_RECORD_TYPE_META.custom
);

export const getPersonalRecordTypeChipSx = (recordType) => {
  const meta = getPersonalRecordTypeMeta(recordType);

  return {
    bgcolor: meta.background,
    color: meta.color,
    fontWeight: 700,
  };
};

export const getSuggestedPersonalRecordUnit = (recordType) => (
  PERSONAL_RECORD_DEFAULT_UNITS[recordType] || ''
);

export const createEmptyPersonalRecordForm = () => ({
  id: '',
  exercise_name: '',
  record_type: 'weight',
  record_value: '',
  unit: getSuggestedPersonalRecordUnit('weight'),
  achieved_on: new Date().toISOString().slice(0, 10),
  notes: '',
});

const buildDelta = (latestValue, previousValue) => (
  latestValue != null && previousValue != null
    ? Number(latestValue) - Number(previousValue)
    : null
);

export const buildBodyMeasurementSummary = (rows = []) => {
  const latest = rows[0] || null;
  const previous = rows[1] || null;

  return {
    latest,
    previous,
    totalEntries: rows.length,
    waistDelta: buildDelta(latest?.waist_cm, previous?.waist_cm),
    chestDelta: buildDelta(latest?.chest_cm, previous?.chest_cm),
    hipsDelta: buildDelta(latest?.hips_cm, previous?.hips_cm),
  };
};

export const buildPersonalRecordSummary = (rows = []) => {
  const monthPrefix = new Date().toISOString().slice(0, 7);

  return {
    latest: rows[0] || null,
    totalRecords: rows.length,
    monthlyRecords: rows.filter((row) => String(row.achieved_on || '').startsWith(monthPrefix)).length,
    uniqueExercises: new Set(rows.map((row) => String(row.exercise_name || '').trim()).filter(Boolean)).size,
  };
};

export const buildProgressOverview = ({
  checkpoints = [],
  measurements = [],
  records = [],
} = {}) => {
  const latestCheckpoint = checkpoints[0] || null;
  const previousCheckpoint = checkpoints[1] || null;
  const latestMeasurement = measurements[0] || null;
  const previousMeasurement = measurements[1] || null;
  const lastThirtyDays = Date.now() - (30 * 24 * 60 * 60 * 1000);

  return {
    latestWeight: latestCheckpoint?.weight_kg ?? null,
    latestBodyFat: latestCheckpoint?.body_fat_percent ?? null,
    latestWaist: latestMeasurement?.waist_cm ?? null,
    monthlyCheckIns: checkpoints.filter((row) => {
      const parsedDate = normaliseDateValue(row.recorded_on);
      return parsedDate && parsedDate.getTime() >= lastThirtyDays;
    }).length,
    monthlyMeasurements: measurements.filter((row) => {
      const parsedDate = normaliseDateValue(row.recorded_on);
      return parsedDate && parsedDate.getTime() >= lastThirtyDays;
    }).length,
    monthlyRecords: records.filter((row) => {
      const parsedDate = normaliseDateValue(row.achieved_on);
      return parsedDate && parsedDate.getTime() >= lastThirtyDays;
    }).length,
    totalRecords: records.length,
    totalMeasurements: measurements.length,
    weightDelta: buildDelta(latestCheckpoint?.weight_kg, previousCheckpoint?.weight_kg),
    waistDelta: buildDelta(latestMeasurement?.waist_cm, previousMeasurement?.waist_cm),
  };
};

export const buildProgressTimeline = ({
  checkpoints = [],
  measurements = [],
  records = [],
} = {}) => {
  const timeline = [
    ...checkpoints.map((checkpoint) => ({
      id: `checkpoint-${checkpoint.id}`,
      kind: 'snapshot',
      occurred_on: checkpoint.recorded_on,
      created_at: checkpoint.created_at,
      title: checkpoint.weight_kg != null
        ? `Progress snapshot • ${formatMetric(checkpoint.weight_kg, ' kg')}`
        : 'Progress snapshot added',
      subtitle: [
        checkpoint.body_fat_percent != null ? `${formatMetric(checkpoint.body_fat_percent, '%')}` : null,
        checkpoint.resting_heart_rate != null ? `${formatMetric(checkpoint.resting_heart_rate, ' bpm', '—', 0)}` : null,
        checkpoint.notes || null,
      ].filter(Boolean).join(' • '),
    })),
    ...measurements.map((measurement) => ({
      id: `measurement-${measurement.id}`,
      kind: 'measurement',
      occurred_on: measurement.recorded_on,
      created_at: measurement.created_at,
      title: measurement.waist_cm != null
        ? `Body measurements • waist ${formatMetric(measurement.waist_cm, ' cm')}`
        : 'Body measurements logged',
      subtitle: [
        measurement.chest_cm != null ? `Chest ${formatMetric(measurement.chest_cm, ' cm')}` : null,
        measurement.hips_cm != null ? `Hips ${formatMetric(measurement.hips_cm, ' cm')}` : null,
        measurement.notes || null,
      ].filter(Boolean).join(' • '),
    })),
    ...records.map((record) => ({
      id: `record-${record.id}`,
      kind: 'record',
      occurred_on: record.achieved_on,
      created_at: record.created_at,
      title: `${record.exercise_name || 'Personal record'} • ${formatMetric(record.record_value, record.unit ? ` ${record.unit}` : '')}`,
      subtitle: [
        getPersonalRecordTypeMeta(record.record_type).label,
        record.notes || null,
      ].filter(Boolean).join(' • '),
    })),
  ];

  return timeline.sort((left, right) => (
    buildSortKey(right.occurred_on, right.created_at).localeCompare(
      buildSortKey(left.occurred_on, left.created_at),
    )
  ));
};
