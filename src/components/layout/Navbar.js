import React, { useEffect, useMemo, useState } from 'react';
import {
  alpha,
  AppBar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { getRoleBadgeLabel, isStaffRole } from '../../app/auth/access';
import { PATHS } from '../../app/paths';
import Logo from '../../assets/images/Logo.png';
import { useAuth } from '../../context/AuthContext';
import { fetchUnreadNotificationCount } from '../../services/gymService';
import ThemeModeToggle from './ThemeModeToggle';

const Navbar = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { user, profile, signOut, isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const handleExercisesClick = () => {
    setMobileMenuOpen(false);

    if (location.pathname !== PATHS.home) {
      navigate(PATHS.home);
      return;
    }

    document.getElementById('exercises')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate(PATHS.home);
  };

  useEffect(() => {
    let active = true;

    const syncUnreadCount = async () => {
      if (!user || !isConfigured) {
        if (active) {
          setUnreadNotificationCount(0);
        }
        return;
      }

      try {
        const count = await fetchUnreadNotificationCount(user.id);
        if (active) {
          setUnreadNotificationCount(count);
        }
      } catch (error) {
        if (active) {
          setUnreadNotificationCount(0);
        }
      }
    };

    const handleNotificationsChanged = () => {
      void syncUnreadCount();
    };

    void syncUnreadCount();
    window.addEventListener('gym:notifications-changed', handleNotificationsChanged);

    return () => {
      active = false;
      window.removeEventListener('gym:notifications-changed', handleNotificationsChanged);
    };
  }, [isConfigured, location.pathname, user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const createLinkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: theme.palette.text.primary,
    fontWeight: 700,
    borderBottom: isActive ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
    paddingBottom: '6px',
  });

  const memberLinks = useMemo(() => (
    user
      ? [
          { label: 'Dashboard', to: PATHS.dashboard },
          { label: 'Progress', to: PATHS.progress },
          { label: 'Nutrition', to: PATHS.nutrition },
          { label: 'Workout plan', to: PATHS.workoutPlan },
          { label: 'Schedule', to: PATHS.schedule },
          { label: 'Bookings', to: PATHS.bookings },
          {
            label: 'Notifications',
            to: PATHS.notifications,
            badge: unreadNotificationCount,
          },
          { label: 'Billing', to: PATHS.billing },
          { label: 'Membership', to: PATHS.membership },
          { label: 'Account', to: PATHS.account },
        ]
      : []
  ), [unreadNotificationCount, user]);

  const staffLinks = useMemo(() => (
    isStaffRole(profile?.role)
      ? [
          { label: 'Staff', to: PATHS.staff },
          { label: 'Staff tools', to: PATHS.staffTools },
          { label: 'Staff notifications', to: PATHS.staffNotifications },
          { label: 'Staff POS', to: PATHS.staffPos },
        ]
      : []
  ), [profile?.role]);

  const adminLinks = useMemo(() => (
    profile?.role === 'admin'
      ? [
          { label: 'Admin', to: PATHS.admin },
          { label: 'CRM', to: PATHS.adminCrm },
          { label: 'POS', to: PATHS.adminPos },
          { label: 'Reports', to: PATHS.adminReports },
        ]
      : []
  ), [profile?.role]);

  const renderDesktopLink = (item) => {
    const labelContent = item.badge ? (
      <Badge
        color="error"
        badgeContent={item.badge}
        max={9}
        sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
      >
        <span>{item.label}</span>
      </Badge>
    ) : item.label;

    return (
      <NavLink key={item.to || item.label} to={item.to} style={createLinkStyle}>
        {labelContent}
      </NavLink>
    );
  };

  const renderDrawerLink = (item) => (
    <ListItemButton
      key={item.to || item.label}
      component={item.to ? RouterLink : 'button'}
      to={item.to}
      onClick={item.onClick}
      sx={{
        borderRadius: 3,
        mb: 0.5,
        bgcolor: location.pathname === item.to ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
      }}
    >
      <ListItemText
        primaryTypographyProps={{ fontWeight: 700 }}
        primary={item.badge ? `${item.label} (${item.badge})` : item.label}
      />
    </ListItemButton>
  );

  const groupedDrawerLinks = [
    {
      title: 'Explore',
      items: [
        { label: 'Home', to: PATHS.home },
        { label: 'Exercises', onClick: handleExercisesClick },
      ],
    },
    user ? { title: 'Member', items: memberLinks } : null,
    staffLinks.length ? { title: 'Staff', items: staffLinks } : null,
    adminLinks.length ? { title: 'Admin', items: adminLinks } : null,
  ].filter(Boolean);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(16px)',
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
            flexWrap: 'nowrap',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            {!isDesktop ? (
              <Tooltip title="Open navigation menu">
                <IconButton
                  color="inherit"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : null}
            <RouterLink to={PATHS.home} style={{ flexShrink: 0 }}>
              <img src={Logo} alt="Checkers Gym logo" style={{ width: '54px', height: '54px' }} />
            </RouterLink>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                Checkers Gym
              </Typography>
              {user ? (
                <Chip
                  label={getRoleBadgeLabel(profile?.role)}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                    color: theme.palette.primary.main,
                    fontWeight: 700,
                  }}
                />
              ) : null}
            </Box>
          </Stack>

          {isDesktop ? (
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 2.5 }}
              alignItems="center"
              flexWrap="wrap"
              justifyContent="flex-end"
            >
              <NavLink end to={PATHS.home} style={createLinkStyle}>Home</NavLink>
              <Button onClick={handleExercisesClick} sx={{ color: 'text.primary', fontWeight: 700 }}>
                Exercises
              </Button>
              {memberLinks.map(renderDesktopLink)}
              {staffLinks.map(renderDesktopLink)}
              {adminLinks.map(renderDesktopLink)}
              <ThemeModeToggle />
              {user ? (
                <Button
                  variant="contained"
                  onClick={handleSignOut}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2.5,
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
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2.5,
                  }}
                >
                  Join now
                </Button>
              )}
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <ThemeModeToggle />
              {user ? (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSignOut}
                  sx={{ borderRadius: 999, px: 2 }}
                >
                  Logout
                </Button>
              ) : (
                <Button
                  component={RouterLink}
                  to={PATHS.auth}
                  variant="contained"
                  size="small"
                  sx={{ borderRadius: 999, px: 2 }}
                >
                  Join
                </Button>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            px: 2,
            py: 2.5,
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <img src={Logo} alt="Checkers Gym logo" style={{ width: '42px', height: '42px' }} />
            <Box>
              <Typography fontWeight={800}>Checkers Gym</Typography>
              <Typography variant="body2" color="text.secondary">
                Quick access menu
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <ThemeModeToggle edge />

        <Divider sx={{ my: 2 }} />

        {groupedDrawerLinks.map((group) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
              {group.title}
            </Typography>
            <List disablePadding sx={{ mt: 1 }}>
              {group.items.map(renderDrawerLink)}
            </List>
          </Box>
        ))}

        <Box sx={{ mt: 'auto', pt: 2 }}>
          {user ? (
            <Button fullWidth variant="contained" onClick={handleSignOut}>
              Logout
            </Button>
          ) : (
            <Button fullWidth variant="contained" component={RouterLink} to={PATHS.auth}>
              Join now
            </Button>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
