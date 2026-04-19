import React from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/images/Logo.png';

const FooterColumn = ({ title, items }) => (
  <Stack spacing={1.25} sx={{ minWidth: 0 }}>
    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
      {title}
    </Typography>
    <Stack spacing={1}>
      {items.map((item) => (
        item.to ? (
          <Link
            key={item.label}
            component={RouterLink}
            to={item.to}
            underline="hover"
            color="text.primary"
            sx={{ width: 'fit-content', fontWeight: 600 }}
          >
            {item.label}
          </Link>
        ) : (
          <Typography key={item.label} variant="body2" color="text.secondary">
            {item.label}
          </Typography>
        )
      ))}
    </Stack>
  </Stack>
);

const Footer = () => {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff' || isAdmin;
  const currentYear = new Date().getFullYear();

  const primaryLinks = user
    ? [
        { label: 'Dashboard', to: PATHS.dashboard },
        { label: 'Blog', to: PATHS.blog },
        { label: 'Tools', to: PATHS.tools },
        { label: 'Events', to: PATHS.events },
        { label: 'Contact', to: PATHS.contact },
      ]
    : [
        { label: 'Home', to: PATHS.home },
        { label: 'Gallery', to: PATHS.gallery },
        { label: 'Tools', to: PATHS.tools },
        { label: 'Blog', to: PATHS.blog },
        { label: 'Contact', to: PATHS.contact },
      ];

  const workspaceLinks = isAdmin
    ? [
        { label: 'Admin workspace', to: PATHS.admin },
        { label: 'Access control', to: PATHS.adminAccess },
        { label: 'Blog moderation', to: PATHS.adminBlog },
        { label: 'Reports', to: PATHS.adminReports },
      ]
    : isStaff
      ? [
          { label: 'Staff home', to: PATHS.staff },
          { label: 'Access desk', to: PATHS.staffAccess },
          { label: 'Blog editor', to: PATHS.staffBlog },
          { label: 'Staff POS', to: PATHS.staffPos },
        ]
      : user
        ? [
            { label: 'Schedule', to: PATHS.schedule },
            { label: 'Bookings', to: PATHS.bookings },
            { label: 'Membership', to: PATHS.membership },
            { label: 'Account', to: PATHS.account },
          ]
        : [
            { label: 'Events page', to: PATHS.events },
            { label: 'Testimonials', to: PATHS.testimonials },
            { label: 'Tools', to: PATHS.tools },
            { label: 'Feedback', to: PATHS.feedback },
            { label: 'Gym map', to: PATHS.gymMap },
          ];

  const publicSiteLinks = [
    { label: 'Gallery', to: PATHS.gallery },
    { label: 'Testimonials', to: PATHS.testimonials },
    { label: 'Tools', to: PATHS.tools },
    { label: 'Events', to: PATHS.events },
    { label: 'Feedback', to: PATHS.feedback },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 6, md: 8 },
        mb: { xs: 3, md: 4 },
        borderRadius: { xs: 4, md: 6 },
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 18px 42px rgba(2, 6, 23, 0.36)'
          : '0 18px 42px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Stack spacing={4} sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={{ xs: 3, lg: 5 }}
          justifyContent="space-between"
        >
          <Stack spacing={2} sx={{ flex: 1.2, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src={Logo}
                alt="Checkers Gym logo"
                sx={{
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  borderRadius: 3,
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 28px rgba(2, 6, 23, 0.3)'
                    : '0 12px 28px rgba(15, 23, 42, 0.08)',
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} noWrap>
                  Checkers Gym
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Public website and management app
                </Typography>
              </Box>
            </Stack>

            <Typography color="text.secondary" maxWidth="60ch">
              A cleaner public shell for gallery stories, member trust signals, community events,
              contact routes, and first-visit utility tools—without mixing public visitors into the
              private product workflows.
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {['Gallery', 'Testimonials', 'Tools', 'Events', 'Feedback'].map((label) => (
                <Chip
                  key={label}
                  size="small"
                  label={label}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
                    color: 'text.primary',
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 3, sm: 4, md: 6 }}
            sx={{ flex: 1, justifyContent: 'space-between' }}
          >
            <FooterColumn title="Navigate" items={primaryLinks} />
            <FooterColumn title={user ? 'Workspace' : 'Public site'} items={user ? workspaceLinks : publicSiteLinks} />
            <FooterColumn title={user ? 'Public site' : 'Plan a visit'} items={user ? publicSiteLinks : workspaceLinks} />
          </Stack>
        </Stack>

        <Divider />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} Checkers Gym Management App.
          </Typography>

          <Button
            component={RouterLink}
            to={user ? PATHS.dashboard : PATHS.contact}
            variant="contained"
            size="small"
            sx={{ px: 2.25 }}
          >
            {user ? 'Open dashboard' : 'Plan a visit'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Footer;
