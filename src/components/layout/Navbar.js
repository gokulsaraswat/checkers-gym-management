
import React from 'react';
import {
  AppBar,
  Button,
  Chip,
  Stack,
  Toolbar,
} from '@mui/material';
import { Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { getRoleBadgeLabel, isStaffRole } from '../../app/auth/access';
import { PATHS } from '../../app/paths';
import Logo from '../../assets/images/Logo.png';
import { useAuth } from '../../context/AuthContext';

const linkStyle = ({ isActive }) => ({
  textDecoration: 'none',
  color: '#1f2937',
  fontWeight: 700,
  borderBottom: isActive ? '3px solid #ff2625' : '3px solid transparent',
  paddingBottom: '6px',
});

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleExercisesClick = () => {
    if (location.pathname !== PATHS.home) {
      navigate(PATHS.home);
      return;
    }

    document.getElementById('exercises')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(PATHS.home);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        backdropFilter: 'blur(16px)',
        background: 'rgba(255, 251, 252, 0.92)',
        borderRadius: 4,
        top: 12,
        zIndex: 20,
        mb: 3,
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 1, sm: 2 },
          py: 1.25,
          minHeight: '82px !important',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <RouterLink to={PATHS.home}>
            <img src={Logo} alt="Checkers Gym logo" style={{ width: '54px', height: '54px' }} />
          </RouterLink>
          {user ? (
            <Chip
              label={getRoleBadgeLabel(profile?.role)}
              sx={{ bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }}
            />
          ) : null}
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 3 }}
          alignItems="center"
          flexWrap="wrap"
          justifyContent="flex-end"
        >
          <NavLink end to={PATHS.home} style={linkStyle}>Home</NavLink>
          <Button onClick={handleExercisesClick} sx={{ color: '#1f2937', fontWeight: 700, textTransform: 'none' }}>
            Exercises
          </Button>

          {user ? (
            <>
              <NavLink to={PATHS.dashboard} style={linkStyle}>Dashboard</NavLink>
              <NavLink to={PATHS.membership} style={linkStyle}>Membership</NavLink>
              <NavLink to={PATHS.account} style={linkStyle}>Account</NavLink>
            </>
          ) : null}

          {isStaffRole(profile?.role) ? (
            <NavLink to={PATHS.staff} style={linkStyle}>Staff</NavLink>
          ) : null}

          {profile?.role === 'admin' ? (
            <NavLink to={PATHS.admin} style={linkStyle}>Admin</NavLink>
          ) : null}

          {user ? (
            <Button
              variant="contained"
              onClick={handleSignOut}
              sx={{
                bgcolor: '#ff2625',
                textTransform: 'none',
                borderRadius: 999,
                px: 2.5,
                '&:hover': { bgcolor: '#df1d1d' },
              }}
            >
              Logout
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to={PATHS.auth}
              variant="contained"
              sx={{
                bgcolor: '#ff2625',
                textTransform: 'none',
                borderRadius: 999,
                px: 2.5,
                '&:hover': { bgcolor: '#df1d1d' },
              }}
            >
              Login / Signup
            </Button>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
