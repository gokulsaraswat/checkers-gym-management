export const sexOptions = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

export const activityLevelOptions = [
  {
    id: 'sedentary',
    label: 'Mostly seated',
    multiplier: 1.2,
    description: 'Desk-heavy days with little planned activity.',
  },
  {
    id: 'light',
    label: 'Lightly active',
    multiplier: 1.375,
    description: 'A few walks, some standing time, and two or three lighter sessions each week.',
  },
  {
    id: 'moderate',
    label: 'Moderately active',
    multiplier: 1.55,
    description: 'Regular training, decent daily movement, and a repeatable weekly routine.',
  },
  {
    id: 'active',
    label: 'Very active',
    multiplier: 1.725,
    description: 'Harder training blocks or long active days on top of regular workouts.',
  },
];

export const calorieGoalOptions = [
  {
    id: 'maintain',
    label: 'Maintain bodyweight',
    adjustment: 0,
    description: 'A steady starting point for routine building, performance, and habit consistency.',
  },
  {
    id: 'lose-fat',
    label: 'Lose fat steadily',
    adjustment: -350,
    description: 'A moderate calorie deficit that usually feels easier to sustain than an aggressive cut.',
  },
  {
    id: 'gain-muscle',
    label: 'Gain muscle gradually',
    adjustment: 250,
    description: 'A small surplus that supports training quality without forcing a large bulk.',
  },
];

export const suggestionGoalOptions = [
  { id: 'general-fitness', label: 'General fitness' },
  { id: 'fat-loss', label: 'Fat loss' },
  { id: 'muscle-gain', label: 'Muscle gain' },
  { id: 'strength-base', label: 'Strength base' },
];

export const experienceOptions = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'returning', label: 'Returning after time off' },
  { id: 'intermediate', label: 'Intermediate' },
];

export const createInitialBmiForm = () => ({
  heightCm: '170',
  weightKg: '70',
});

export const createInitialCalorieForm = () => ({
  sex: 'male',
  age: '28',
  heightCm: '170',
  weightKg: '70',
  activityLevelId: 'moderate',
  goalId: 'maintain',
});

export const createInitialSuggestionForm = () => ({
  goalId: 'general-fitness',
  experienceId: 'beginner',
  trainingDays: '3',
  sessionMinutes: '60',
});

const toNumber = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
};

const findById = (options, id, fallbackIndex = 0) => {
  const match = options.find((option) => option.id === id);

  if (match) {
    return match;
  }

  return options[fallbackIndex];
};

const roundTo = (value, digits = 0) => Number(value.toFixed(digits));

const resolveBmiCategory = (bmi) => {
  if (bmi < 18.5) {
    return {
      value: 'Needs support',
      label: 'Below the usual healthy BMI range',
      guidance: 'Prioritize regular meals, progressive resistance training, and a slower ramp-up in activity volume.',
    };
  }

  if (bmi < 25) {
    return {
      value: 'Healthy range',
      label: 'Inside the typical BMI target band',
      guidance: 'Focus on training consistency, sleep, and gradual progress instead of chasing quick changes.',
    };
  }

  if (bmi < 30) {
    return {
      value: 'Above range',
      label: 'Slightly above the usual BMI target band',
      guidance: 'A moderate calorie deficit, more steps, and coached resistance work are usually a practical starting point.',
    };
  }

  return {
    value: 'Higher-risk range',
    label: 'Needs a careful progression plan',
    guidance: 'Keep training approachable, manage recovery well, and consider professional medical input when needed.',
  };
};

const buildTrainingSplit = (goalId, trainingDays, experienceId) => {
  if (trainingDays <= 2) {
    return {
      title: 'Full-body foundation',
      summary: 'Two whole-body sessions make it easier to build rhythm without overcomplicating the week.',
      outline: [
        'Day 1: squat or leg press, horizontal push, row, hinge, and core work.',
        'Day 2: hinge or Romanian deadlift, vertical push, pulldown, split squat, and carries.',
        'Use short walks or light mobility on the days between lifts.',
      ],
    };
  }

  if (trainingDays === 3) {
    if (goalId === 'fat-loss') {
      return {
        title: 'Three-day full-body plus conditioning',
        summary: 'A fat-loss friendly setup built around repeatable strength work and a manageable conditioning finish.',
        outline: [
          'Day 1: lower-body focus, push work, row, and a short bike or treadmill finisher.',
          'Day 2: hinge, pulldown, dumbbell press, lunges, and carries.',
          'Day 3: mixed full-body circuit with controlled pacing and simple progress tracking.',
        ],
      };
    }

    if (goalId === 'muscle-gain') {
      return {
        title: 'Three-day hypertrophy base',
        summary: 'A push-pull-legs style week keeps volume focused while still being realistic for most schedules.',
        outline: [
          'Day 1: chest, shoulders, triceps, and a small accessory superset.',
          'Day 2: back, rear delts, biceps, and upper-back support work.',
          'Day 3: quads, glutes, hamstrings, calves, and core finisher work.',
        ],
      };
    }

    return {
      title: 'Three-day balanced split',
      summary: 'This is a strong starter layout for general fitness or strength-base goals.',
      outline: [
        'Day 1: squat pattern, push work, row, and a small core block.',
        'Day 2: hinge pattern, pulldown, dumbbell press, and single-leg work.',
        'Day 3: full-body reload with simpler volume and movement quality emphasis.',
      ],
    };
  }

  if (trainingDays === 4) {
    return {
      title: 'Upper / lower repeat',
      summary: 'Four days usually works best as an upper-lower split so recovery stays predictable.',
      outline: [
        'Day 1: upper-body push and pull volume with shoulder support work.',
        'Day 2: lower-body squat emphasis, accessories, and core.',
        'Day 3: upper-body strength or hypertrophy focus with rows, presses, and arms.',
        'Day 4: lower-body hinge emphasis, unilateral work, and a short conditioning finish.',
      ],
    };
  }

  return {
    title: experienceId === 'intermediate' ? 'Five-day advanced split' : 'Five-day structured split',
    summary: 'Once you reach five sessions, keep the split organized and protect at least one easier recovery day.',
    outline: [
      'Day 1: push emphasis with chest, shoulders, and triceps.',
      'Day 2: pull emphasis with back, rear delts, and biceps.',
      'Day 3: lower-body strength or hypertrophy focus.',
      'Day 4: upper accessories plus conditioning or carries.',
      'Day 5: lower accessories, core, and easier quality work to close the week.',
    ],
  };
};

export const formatMetric = (value, suffix = '', digits = 0) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '—';
  }

  const formattedValue = numericValue.toFixed(digits);

  if (!suffix) {
    return formattedValue;
  }

  return `${formattedValue} ${suffix}`;
};

export const calculateBmiResult = (form) => {
  const heightCm = toNumber(form.heightCm);
  const weightKg = toNumber(form.weightKg);

  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  const healthyLowerWeight = 18.5 * heightMeters * heightMeters;
  const healthyUpperWeight = 24.9 * heightMeters * heightMeters;

  return {
    bmi: roundTo(bmi, 1),
    category: resolveBmiCategory(bmi),
    healthyWeightRange: `${formatMetric(healthyLowerWeight, 'kg', 1)} – ${formatMetric(healthyUpperWeight, 'kg', 1)}`,
  };
};

export const calculateCalorieResult = (form) => {
  const age = toNumber(form.age);
  const heightCm = toNumber(form.heightCm);
  const weightKg = toNumber(form.weightKg);

  if (!age || !heightCm || !weightKg || age <= 0 || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const activityLevel = findById(activityLevelOptions, form.activityLevelId, 2);
  const goal = findById(calorieGoalOptions, form.goalId, 0);
  const sexFactor = form.sex === 'female' ? -161 : 5;
  const bmr = Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexFactor);
  const maintenanceCalories = Math.round(bmr * activityLevel.multiplier);
  const targetCalories = Math.max(1200, maintenanceCalories + goal.adjustment);
  const proteinMultiplier = goal.id === 'lose-fat' ? 2 : 1.8;
  const proteinGrams = Math.round(weightKg * proteinMultiplier);
  const fatGrams = Math.round(weightKg * (goal.id === 'gain-muscle' ? 0.9 : 0.8));
  const remainingCalories = Math.max(targetCalories - ((proteinGrams * 4) + (fatGrams * 9)), 0);
  const carbGrams = Math.round(remainingCalories / 4);
  const hydrationLiters = roundTo((weightKg * 0.035) + ((activityLevel.multiplier - 1.2) * 0.8), 1);

  return {
    bmr,
    maintenanceCalories,
    targetCalories,
    hydrationLiters,
    proteinGrams,
    carbGrams,
    fatGrams,
    activityLevel,
    goal,
  };
};

export const buildUtilitySuggestions = (form) => {
  const trainingDaysRaw = toNumber(form.trainingDays);
  const sessionMinutesRaw = toNumber(form.sessionMinutes);

  if (!trainingDaysRaw || !sessionMinutesRaw || trainingDaysRaw <= 0 || sessionMinutesRaw <= 0) {
    return null;
  }

  const trainingDays = Math.min(Math.max(Math.round(trainingDaysRaw), 2), 5);
  const sessionMinutes = Math.min(Math.max(Math.round(sessionMinutesRaw), 30), 120);
  const goal = findById(suggestionGoalOptions, form.goalId, 0);
  const experience = findById(experienceOptions, form.experienceId, 0);
  const split = buildTrainingSplit(goal.id, trainingDays, experience.id);
  const hydrationLiters = roundTo(2.4 + (trainingDays * 0.15) + (sessionMinutes >= 75 ? 0.3 : 0), 1);
  const proteinTarget = goal.id === 'muscle-gain'
    ? 'Aim for 25–35 g of protein across 4 meals.'
    : 'Aim for 25–35 g of protein across 3–4 meals.';
  const stepTarget = goal.id === 'fat-loss'
    ? 'Target 8,000–10,000 steps most days.'
    : 'Target 7,000–9,000 steps with a short walk after training.';

  const quickWins = [];

  if (experience.id === 'beginner') {
    quickWins.push('Keep the first two weeks intentionally repeatable so recovery stays smooth.');
  } else if (experience.id === 'returning') {
    quickWins.push('Leave one or two reps in reserve while your joints and recovery readjust.');
  } else {
    quickWins.push('Track loads or reps on your main lifts so each week has a clear progression target.');
  }

  if (trainingDays >= 4) {
    quickWins.push('Protect one full recovery day and avoid turning every session into a max-effort day.');
  } else {
    quickWins.push('Use one easy walk or mobility session between lifting days to keep momentum high.');
  }

  if (goal.id === 'fat-loss') {
    quickWins.push('Build meals around protein and vegetables first, then place carbs around training.');
  } else if (goal.id === 'muscle-gain') {
    quickWins.push('Keep a simple calorie log for a week to confirm the surplus is actually happening.');
  } else if (goal.id === 'strength-base') {
    quickWins.push('Repeat key movement patterns weekly so technique quality improves alongside load.');
  } else {
    quickWins.push('Choose a schedule you can repeat for six weeks before worrying about more advanced programming.');
  }

  return {
    goal,
    experience,
    split,
    hydrationLiters,
    proteinTarget,
    stepTarget,
    trainingDays,
    sessionMinutes,
    quickWins,
  };
};
