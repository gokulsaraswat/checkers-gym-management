import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { alpha } from '@mui/material/styles';
import {
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
import {
  Link as RouterLink,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { getRoleBadgeLabel, isStaffRole } from '../../app/auth/access';
import { PATHS } from '../../app/paths';
import Logo from '../../assets/images/Logo.png';
import { useAuth } from '../../context/AuthContext';
import useReducedMotionPreference from '../../features/accessibility/useReducedMotionPreference';
import { fetchUnreadNotificationCount } from '../../services/gymService';
import { headerOffsets, layoutGutters } from '../../theme/responsiveTokens';
import ThemeModeToggle from './ThemeModeToggle';

const drawerId = 'mobile-navigation-drawer';
const drawerTitleId = 'mobile-navigation-drawer-title';

const getItemKey = (item) => item.to || item.label;
const getUnreadLabel = (count) => `${count} unread ${count === 1 ? 'notification' : 'notifications'}`;

const Navbar = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isWideDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  const prefersReducedMotion = useReducedMotionPreference();
  const { user, profile, signOut, isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const handleExercisesClick = useCallback(() => {
    setMobileMenuOpen(false);

    if (location.pathname !== PATHS.home) {
      navigate(PATHS.home);
      return;
    }

    document.getElementById('exercises')?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [location.pathname, navigate, prefersReducedMotion]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate(PATHS.home);
  }, [navigate, signOut]);

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
      syncUnreadCount();
    };

    syncUnreadCount();
    window.addEventListener('gym:notifications-changed', handleNotificationsChanged);

    return () => {
      active = false;
      window.removeEventListener('gym:notifications-changed', handleNotificationsChanged);
    };
  }, [isConfigured, location.pathname, user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const createRailLinkStyle = useCallback(({ isActive }) => ({
    textDecoration: 'none',
    color: theme.palette.text.primary,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    borderRadius: '999px',
    minHeight: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: isWideDesktop ? '10px 14px' : '9px 12px',
    backgroundColor: isActive
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)
      : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.92),
    boxShadow: `inset 0 0 0 1px ${
      isActive
        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.22)
        : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06)
    }`,
  }), [isWideDesktop, theme.palette.background.paper, theme.palette.mode, theme.palette.primary.main, theme.palette.text.primary]);

  const publicDesktopLinks = useMemo(() => ([
    { label: 'Home', to: PATHS.home },
    { label: 'Gallery', to: PATHS.gallery },
    { label: 'Tools', to: PATHS.tools },
    { label: 'Events', to: PATHS.events },
    { label: 'Blog', to: PATHS.blog },
    { label: 'Contact', to: PATHS.contact },
    { label: 'Exercises', onClick: handleExercisesClick },
  ]), [handleExercisesClick]);

  const publicDrawerLinks = useMemo(() => ([
    { label: 'Home', to: PATHS.home },
    { label: 'Gallery', to: PATHS.gallery },
    { label: 'Testimonials', to: PATHS.testimonials },
    { label: 'Tools', to: PATHS.tools },
    { label: 'Events', to: PATHS.events },
    { label: 'Blog', to: PATHS.blog },
    { label: 'Contact', to: PATHS.contact },
    { label: 'Feedback', to: PATHS.feedback },
    { label: 'Gym map', to: PATHS.gymMap },
    { label: 'Exercises', onClick: handleExercisesClick },
  ]), [handleExercisesClick]);

  const memberLinks = useMemo(() => {
    if (!user) {
      return [];
    }

    return [
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
    ];
  }, [unreadNotificationCount, user]);

  const staffLinks = useMemo(() => {
    if (!isStaffRole(profile?.role)) {
      return [];
    }

    return [
      { label: 'Staff', to: PATHS.staff },
      { label: 'Staff tools', to: PATHS.staffTools },
      { label: 'Access desk', to: PATHS.staffAccess },
      { label: 'Blog editor', to: PATHS.staffBlog },
      { label: 'Staff notifications', to: PATHS.staffNotifications },
      { label: 'Staff POS', to: PATHS.staffPos },
    ];
  }, [profile?.role]);

  const adminLinks = useMemo(() => {
    if (profile?.role !== 'admin') {
      return [];
    }

    return [
      { label: 'Admin', to: PATHS.admin },
      { label: 'Ops', to: PATHS.adminOps },
      { label: 'Access', to: PATHS.adminAccess },
      { label: 'CRM', to: PATHS.adminCrm },
      { label: 'POS', to: PATHS.adminPos },
      { label: 'Reports', to: PATHS.adminReports },
      { label: 'Blog', to: PATHS.adminBlog },
    ];
  }, [profile?.role]);

  const desktopItems = useMemo(() => ([
    ...publicDesktopLinks,
    ...memberLinks,
    ...staffLinks,
    ...adminLinks,
  ]), [adminLinks, memberLinks, publicDesktopLinks, staffLinks]);

  const renderRailItem = (item) => {
    const itemAriaLabel = item.badge ? `${item.label}, ${getUnreadLabel(item.badge)}` : item.label;
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

    if (item.onClick) {
      return (
        <Button
          key={getItemKey(item)}
          color="inherit"
          onClick={item.onClick}
          aria-label={itemAriaLabel}
          sx={{
            color: 'text.primary',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            borderRadius: 999,
            minHeight: 40,
            px: isWideDesktop ? 1.75 : 1.5,
            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.92),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06)}`,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
            },
          }}
        >
          {item.label}
        </Button>
      );
    }

    return (
      <NavLink
        key={getItemKey(item)}
        to={item.to}
        style={createRailLinkStyle}
        aria-label={itemAriaLabel}
      >
        {labelContent}
      </NavLink>
    );
  };

  const renderDrawerLink = (item) => {
    const isSelected = Boolean(item.to && location.pathname === item.to);
    const itemAriaLabel = item.badge ? `${item.label}, ${getUnreadLabel(item.badge)}` : item.label;

    return (
      <ListItemButton
        key={getItemKey(item)}
        component={item.to ? RouterLink : 'button'}
        to={item.to}
        onClick={item.onClick}
        selected={isSelected}
        aria-current={isSelected ? 'page' : undefined}
        aria-label={itemAriaLabel}
        sx={{
          borderRadius: 3,
          mb: 0.75,
          px: 1.25,
          bgcolor: isSelected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)
            : 'transparent',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
          },
        }}
      >
        <ListItemText
          primaryTypographyProps={{ fontWeight: 700 }}
          primary={item.badge ? `${item.label} (${item.badge})` : item.label}
        />
      </ListItemButton>
    );
  };

  const groupedDrawerLinks = useMemo(() => ([
    {
      title: 'Explore',
      items: publicDrawerLinks,
    },
    user ? { title: 'Member', items: memberLinks } : null,
    staffLinks.length ? { title: 'Staff', items: staffLinks } : null,
    adminLinks.length ? { title: 'Admin', items: adminLinks } : null,
  ].filter(Boolean)), [adminLinks, memberLinks, publicDrawerLinks, staffLinks, user]);

  const roleChip = user ? (
    <Chip
      label={getRoleBadgeLabel(profile?.role)}
      size="small"
      sx={{
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
        color: theme.palette.primary.main,
        fontWeight: 700,
        maxWidth: '100%',
      }}
    />
  ) : null;

  return (
    <>
      <AppBar
        component="header"
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          top: { xs: headerOffsets.mobile, md: headerOffsets.desktop },
          zIndex: 20,
          mb: { xs: 2.5, md: 3 },
          borderRadius: { xs: 3, md: 4 },
        }}
      >
        <Toolbar
          sx={{
            px: layoutGutters,
            py: { xs: 1, md: 1.25 },
            minHeight: { xs: '74px', md: '82px' },
            display: 'flex',
            justifyContent: 'space-between',
            gap: { xs: 1, md: 1.5 },
          }}
        >
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.5 }}
            alignItems="center"
            sx={{
              minWidth: 0,
              flexShrink: 0,
              maxWidth: { xs: 'calc(100% - 108px)', lg: 340 },
            }}
          >
            {!isDesktop ? (
              <Tooltip title="Open navigation menu">
                <IconButton
                  color="inherit"
                  aria-label="Open navigation menu"
                  aria-controls={mobileMenuOpen ? drawerId : undefined}
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="dialog"
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : null}

            <RouterLink to={PATHS.home} style={{ flexShrink: 0, display: 'inline-flex' }} aria-label="Open home page">
              <Box
                component="img"
                src={Logo}
                alt="Checkers Gym logo"
                sx={{
                  width: { xs: 46, sm: 52, lg: 56 },
                  height: { xs: 46, sm: 52, lg: 56 },
                  borderRadius: 3,
                }}
              />
            </RouterLink>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ lineHeight: 1.1 }}>
                Checkers Gym
              </Typography>
              {roleChip || (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  Management App
                </Typography>
              )}
            </Box>
          </Stack>

          {isDesktop ? (
            <>
              <Box
                component="nav"
                aria-label="Primary navigation"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    width: '100%',
                    maxWidth: isWideDesktop ? 920 : 740,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{
                      width: 'max-content',
                      minWidth: '100%',
                      py: 0.25,
                      pr: 1,
                    }}
                  >
                    {desktopItems.map(renderRailItem)}
                  </Stack>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                <ThemeModeToggle />
                {user ? (
                  <Button variant="contained" onClick={handleSignOut} sx={{ px: 2.5 }}>
                    Logout
                  </Button>
                ) : (
                  <Button component={RouterLink} to={PATHS.auth} variant="contained" sx={{ px: 2.5 }}>
                    Join now
                  </Button>
                )}
              </Stack>
            </>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <ThemeModeToggle />
              {user ? (
                <Button variant="contained" size="small" onClick={handleSignOut} sx={{ px: 2 }}>
                  Logout
                </Button>
              ) : (
                <Button component={RouterLink} to={PATHS.auth} variant="contained" size="small" sx={{ px: 2 }}>
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
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          id: drawerId,
          'aria-labelledby': drawerTitleId,
          sx: {
            width: 320,
            maxWidth: '88vw',
            px: 2,
            py: 2.5,
            display: 'flex',
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              component="img"
              src={Logo}
              alt="Checkers Gym logo"
              sx={{ width: 42, height: 42, borderRadius: 2.5 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography id={drawerTitleId} fontWeight={800} noWrap>
                Checkers Gym
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Quick access menu
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            aria-controls={drawerId}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>{roleChip}</Box>
          <ThemeModeToggle edge />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
          {groupedDrawerLinks.map((group) => (
            <Box key={group.title} component="nav" aria-label={`${group.title} navigation`} sx={{ mb: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
                {group.title}
              </Typography>
              <List disablePadding sx={{ mt: 1 }}>
                {group.items.map(renderDrawerLink)}
              </List>
            </Box>
          ))}
        </Box>

        <Stack spacing={1.25} sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Public website pages, quick utility tools, cleaner contact routes, and theme-aware controls across screen sizes.
          </Typography>
          {user ? (
            <Button fullWidth variant="contained" onClick={handleSignOut}>
              Logout
            </Button>
          ) : (
            <Button fullWidth variant="contained" component={RouterLink} to={PATHS.auth}>
              Join now
            </Button>
          )}
        </Stack>
      </Drawer>
    </>
  );
};

export default Navbar;
