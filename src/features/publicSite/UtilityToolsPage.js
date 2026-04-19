import React, { useMemo, useState } from 'react';
import {
  Alert,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LocalDrinkRoundedIcon from '@mui/icons-material/LocalDrinkRounded';
import MonitorWeightRoundedIcon from '@mui/icons-material/MonitorWeightRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import { publicSectionCardSx } from './publicSiteHelpers';
import {
  activityLevelOptions,
  buildUtilitySuggestions,
  calculateBmiResult,
  calculateCalorieResult,
  calorieGoalOptions,
  createInitialBmiForm,
  createInitialCalorieForm,
  createInitialSuggestionForm,
  experienceOptions,
  formatMetric,
  sexOptions,
  suggestionGoalOptions,
} from './utilityToolHelpers';

const UtilityToolsPage = () => {
  const [bmiForm, setBmiForm] = useState(createInitialBmiForm);
  const [calorieForm, setCalorieForm] = useState(createInitialCalorieForm);
  const [suggestionForm, setSuggestionForm] = useState(createInitialSuggestionForm);

  const bmiResult = useMemo(() => calculateBmiResult(bmiForm), [bmiForm]);
  const calorieResult = useMemo(() => calculateCalorieResult(calorieForm), [calorieForm]);
  const utilitySuggestions = useMemo(() => buildUtilitySuggestions(suggestionForm), [suggestionForm]);

  const handleBmiChange = (field) => (event) => {
    const { value } = event.target;

    setBmiForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCalorieChange = (field) => (event) => {
    const { value } = event.target;

    setCalorieForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSuggestionChange = (field) => (event) => {
    const { value } = event.target;

    setSuggestionForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <PublicPageShell
      eyebrow="Public website"
      title="Utility tools for quick planning"
      description="Patch 33 adds lightweight BMI, calorie, hydration, and starter-program tools for visitors who want practical guidance before a trial visit or deeper coach conversation."
      chips={['BMI check', 'Calorie planning', 'Suggestion tools']}
      actions={[
        { label: 'Plan a visit', to: PATHS.contact },
        { label: 'Read the blog', to: PATHS.blog },
      ]}
      stats={[
        { label: 'Live tools', value: '3', caption: 'Frontend-first utilities that stay on the public website track.' },
        { label: 'Best use case', value: 'First visit', caption: 'Helpful before a trial, consultation, or general enquiry.' },
        { label: 'Reminder', value: 'Estimate only', caption: 'These tools support planning and coaching conversations, not medical advice.' },
      ]}
    >
      <Alert severity="info" sx={{ mb: 4, borderRadius: 3 }}>
        These results are lightweight estimates for planning. They are intentionally public-site friendly and should not be treated as medical advice or a replacement for coached assessment.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <MonitorWeightRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={800}>
                  BMI quick check
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Use height and bodyweight to get a rough BMI category and a typical healthy-weight range.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Height (cm)"
                    type="number"
                    value={bmiForm.heightCm}
                    onChange={handleBmiChange('heightCm')}
                    fullWidth
                    inputProps={{ min: 100, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weight (kg)"
                    type="number"
                    value={bmiForm.weightKg}
                    onChange={handleBmiChange('weightKg')}
                    fullWidth
                    inputProps={{ min: 25, step: 0.1 }}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 }, height: '100%' }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Typography variant="overline" color="text.secondary">
                BMI result
              </Typography>
              <Typography variant="h3" fontWeight={900}>
                {bmiResult ? formatMetric(bmiResult.bmi, '', 1) : '—'}
              </Typography>
              {bmiResult ? (
                <>
                  <Chip label={bmiResult.category.value} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                  <Typography fontWeight={700}>{bmiResult.category.label}</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {bmiResult.category.guidance}
                  </Typography>
                  <Divider />
                  <Typography color="text.secondary">
                    Typical healthy weight range: <strong>{bmiResult.healthyWeightRange}</strong>
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary">
                  Enter a valid height and weight to see the result.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <CalculateRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={800}>
                  Calorie and macro estimate
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                This estimate uses a simple BMR formula, an activity multiplier, and a light goal adjustment.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Sex"
                    value={calorieForm.sex}
                    onChange={handleCalorieChange('sex')}
                    fullWidth
                  >
                    {sexOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Age"
                    type="number"
                    value={calorieForm.age}
                    onChange={handleCalorieChange('age')}
                    fullWidth
                    inputProps={{ min: 16, max: 90, step: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Height (cm)"
                    type="number"
                    value={calorieForm.heightCm}
                    onChange={handleCalorieChange('heightCm')}
                    fullWidth
                    inputProps={{ min: 100, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weight (kg)"
                    type="number"
                    value={calorieForm.weightKg}
                    onChange={handleCalorieChange('weightKg')}
                    fullWidth
                    inputProps={{ min: 25, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Activity level"
                    value={calorieForm.activityLevelId}
                    onChange={handleCalorieChange('activityLevelId')}
                    fullWidth
                  >
                    {activityLevelOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Goal"
                    value={calorieForm.goalId}
                    onChange={handleCalorieChange('goalId')}
                    fullWidth
                  >
                    {calorieGoalOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 }, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="text.secondary">
                Estimated intake targets
              </Typography>
              {calorieResult ? (
                <>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Maintenance</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatMetric(calorieResult.maintenanceCalories, 'kcal')}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Target</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatMetric(calorieResult.targetCalories, 'kcal')}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Protein</Typography>
                        <Typography variant="h6" fontWeight={800}>{formatMetric(calorieResult.proteinGrams, 'g')}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Hydration</Typography>
                        <Typography variant="h6" fontWeight={800}>{formatMetric(calorieResult.hydrationLiters, 'L', 1)}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider />

                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>{calorieResult.activityLevel.label}</Typography>
                    <Typography color="text.secondary">{calorieResult.activityLevel.description}</Typography>
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>{calorieResult.goal.label}</Typography>
                    <Typography color="text.secondary">{calorieResult.goal.description}</Typography>
                  </Stack>

                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Carbs</Typography>
                        <Typography fontWeight={800}>{formatMetric(calorieResult.carbGrams, 'g')}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">Fats</Typography>
                        <Typography fontWeight={800}>{formatMetric(calorieResult.fatGrams, 'g')}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Typography variant="body2" color="text.secondary">BMR</Typography>
                        <Typography fontWeight={800}>{formatMetric(calorieResult.bmr, 'kcal')}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Typography color="text.secondary">
                  Enter valid age, height, and weight details to see the estimate.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <InsightsRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={800}>
                  Suggestion builder
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Build a small training and recovery suggestion based on goal, experience, weekly frequency, and session length.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Goal"
                    value={suggestionForm.goalId}
                    onChange={handleSuggestionChange('goalId')}
                    fullWidth
                  >
                    {suggestionGoalOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Experience"
                    value={suggestionForm.experienceId}
                    onChange={handleSuggestionChange('experienceId')}
                    fullWidth
                  >
                    {experienceOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Training days / week"
                    type="number"
                    value={suggestionForm.trainingDays}
                    onChange={handleSuggestionChange('trainingDays')}
                    fullWidth
                    inputProps={{ min: 2, max: 5, step: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Session length (minutes)"
                    type="number"
                    value={suggestionForm.sessionMinutes}
                    onChange={handleSuggestionChange('sessionMinutes')}
                    fullWidth
                    inputProps={{ min: 30, max: 120, step: 5 }}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.25, md: 2.75 }, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="text.secondary">
                Suggested routine snapshot
              </Typography>
              {utilitySuggestions ? (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip icon={<FitnessCenterRoundedIcon />} label={utilitySuggestions.goal.label} variant="outlined" />
                    <Chip icon={<InsightsRoundedIcon />} label={utilitySuggestions.experience.label} variant="outlined" />
                    <Chip label={`${utilitySuggestions.trainingDays} days`} variant="outlined" />
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography variant="h5" fontWeight={800}>
                      {utilitySuggestions.split.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {utilitySuggestions.split.summary}
                    </Typography>
                  </Stack>

                  <Stack spacing={1}>
                    {utilitySuggestions.split.outline.map((line) => (
                      <Typography key={line} color="text.secondary">
                        • {line}
                      </Typography>
                    ))}
                  </Stack>

                  <Divider />

                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">Hydration</Typography>
                          <Typography fontWeight={800}>{formatMetric(utilitySuggestions.hydrationLiters, 'L', 1)}</Typography>
                          <Typography variant="body2" color="text.secondary">{utilitySuggestions.sessionMinutes} minute sessions</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">Protein cue</Typography>
                          <Typography fontWeight={800}>{utilitySuggestions.proteinTarget}</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">Daily movement</Typography>
                          <Typography fontWeight={800}>{utilitySuggestions.stepTarget}</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocalDrinkRoundedIcon color="primary" />
                      <Typography fontWeight={800}>Quick wins</Typography>
                    </Stack>
                    {utilitySuggestions.quickWins.map((item) => (
                      <Typography key={item} color="text.secondary">
                        • {item}
                      </Typography>
                    ))}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
                      <DirectionsWalkRoundedIcon color="primary" />
                      <Typography color="text.secondary">
                        Keep these suggestions lightweight until a coach shapes them around your schedule, recovery, and branch-specific setup.
                      </Typography>
                    </Stack>
                  </Stack>
                </>
              ) : (
                <Typography color="text.secondary">
                  Enter valid suggestion inputs to build the starter plan.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </PublicPageShell>
  );
};

export default UtilityToolsPage;
