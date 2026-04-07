import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  FitnessCenter,
  MonitorHeart,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import HeroBanner from '../../../components/HeroBanner';
import Exercises from '../../../components/Exercises';
import SearchExercises from '../../../components/SearchExercises';
import SetupNotice from '../../../components/common/SetupNotice';
import { useAuth } from '../../../context/AuthContext';
import { isRapidApiConfigured } from '../../../utils/fetchData';

const featureCards = [
  {
    title: 'Member dashboard',
    description: 'Logged-in members can check their active plan, membership status, and recent workout history.',
    icon: FitnessCenter,
  },
  {
    title: 'Workout tracking',
    description: 'Track sessions with multiple exercise rows, notes, and completion status from one dashboard.',
    icon: MonitorHeart,
  },
  {
    title: 'Admin control',
    description: 'Admins can manage plans, update member roles, and create or remove members securely.',
    icon: AdminPanelSettings,
  },
];

const HomePage = () => {
  const [exercises, setExercises] = useState([]);
  const [bodyPart, setBodyPart] = useState('all');
  const { user, profile } = useAuth();

  const dashboardPath = useMemo(() => (
    profile?.role === 'admin' ? '/admin' : '/dashboard'
  ), [profile]);

  return (
    <Box>
      <HeroBanner />

      <Box sx={{ px: { xs: 1, sm: 2 }, mt: { xs: 4, md: 6 } }}>
        <SetupNotice title="Supabase unlocks the member and admin app" />

        {!isRapidApiConfigured ? (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
            RapidAPI is optional here. The exercise explorer is currently running in demo mode until you add
            <strong> REACT_APP_RAPID_API_KEY</strong>.
          </Alert>
        ) : null}

        <Grid container spacing={3}>
          {featureCards.map(({ title, description, icon: Icon }) => (
            <Grid item xs={12} md={4} key={title}>
              <Paper
                className="surface-card"
                sx={{
                  p: 3,
                  borderRadius: 4,
                  height: '100%',
                  background: '#fff',
                }}
              >
                <Stack spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '18px',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#fff0f0',
                      color: '#ff2625',
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography variant="h6" fontWeight={800}>
                    {title}
                  </Typography>
                  <Typography color="text.secondary">
                    {description}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper
          className="surface-card"
          sx={{
            mt: 3,
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background: 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
          >
            <Box maxWidth="760px">
              <Typography color="#ff2625" fontWeight={700} mb={1}>
                Upgrade complete
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '30px', md: '42px' } }} mb={1.5}>
                Your static gym site now has the structure for a real member app.
              </Typography>
              <Typography color="text.secondary">
                Use the public homepage to showcase your brand, then move members into the protected dashboard
                and admin panel for day-to-day gym operations.
              </Typography>
            </Box>

            <Button
              component={RouterLink}
              to={user ? dashboardPath : '/auth'}
              variant="contained"
              sx={{
                bgcolor: '#ff2625',
                textTransform: 'none',
                borderRadius: 999,
                px: 3.5,
                py: 1.5,
                alignSelf: { xs: 'flex-start', md: 'center' },
                '&:hover': { bgcolor: '#df1d1d' },
              }}
            >
              {user ? (profile?.role === 'admin' ? 'Open Admin Panel' : 'Open Dashboard') : 'Open Login / Signup'}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <SearchExercises setExercises={setExercises} bodyPart={bodyPart} setBodyPart={setBodyPart} />
      <Exercises setExercises={setExercises} exercises={exercises} bodyPart={bodyPart} />
    </Box>
  );
};

export default HomePage;
