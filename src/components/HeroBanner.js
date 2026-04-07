import React from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import HeroBannerImage from '../assets/images/banner.png';
import { getPostAuthPath } from '../app/auth/access';
import { PATHS } from '../app/paths';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

const HeroBanner = () => {
  const { user, profile } = useAuth();

  const openDashboardPath = getPostAuthPath(profile?.role);

  const scrollToExercises = () => {
    document.getElementById('exercises')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      sx={{ mt: { lg: '30px', xs: '20px' }, ml: { sm: '20px' }, px: { xs: 1, sm: 2 } }}
      position="relative"
      p="20px"
      minHeight={{ lg: '640px' }}
    >
      <Chip
        label={isSupabaseConfigured ? 'Supabase-ready starter' : 'Connect Supabase to unlock members'}
        sx={{
          bgcolor: '#fff0f0',
          color: '#ff2625',
          fontWeight: 700,
          mb: 2,
        }}
      />
      <Typography color="#FF2625" fontWeight="700" fontSize="24px">
        Checkers Gym
      </Typography>
      <Typography fontWeight={800} sx={{ fontSize: { lg: '58px', xs: '42px' } }} mb="20px" mt="8px">
        Train Smarter. <br />
        Manage Members. <br />
        Grow Your Gym.
      </Typography>
      <Typography
        fontSize={{ xs: '18px', lg: '22px' }}
        fontFamily="Alegreya"
        lineHeight="34px"
        maxWidth="640px"
      >
        This upgraded app keeps your public fitness website while adding login, member plans,
        workout tracking, and an admin workspace built for day-to-day gym operations.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={4}>
        <Button
          component={RouterLink}
          to={user ? openDashboardPath : PATHS.auth}
          variant="contained"
          sx={{
            width: { xs: '100%', sm: '220px' },
            bgcolor: '#FF2625',
            py: 1.6,
            fontSize: '18px',
            textTransform: 'none',
            borderRadius: '18px',
            '&:hover': { bgcolor: '#df1d1d' },
          }}
        >
          {(() => {
            if (!user) {
              return 'Login / Signup';
            }

            if (profile?.role === 'admin') {
              return 'Open Admin Panel';
            }

            return 'Open Dashboard';
          })()}
        </Button>
        <Button
          onClick={scrollToExercises}
          variant="outlined"
          sx={{
            width: { xs: '100%', sm: '220px' },
            color: '#1f2937',
            borderColor: '#1f2937',
            py: 1.6,
            fontSize: '18px',
            textTransform: 'none',
            borderRadius: '18px',
          }}
        >
          Explore Exercises
        </Button>
      </Stack>

      <Typography
        className="hero-banner-typo"
        fontWeight={700}
        sx={{
          opacity: '0.08',
          display: { lg: 'block', xs: 'none' },
          fontSize: '180px',
          mt: 6,
        }}
      >
        Stronger
      </Typography>
      <img src={HeroBannerImage} alt="hero banner" className="hero-banner-img" />
    </Box>
  );
};

export default HeroBanner;
