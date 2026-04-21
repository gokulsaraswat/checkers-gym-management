import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { useLocation, useNavigate } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import { describeRestriction } from './securityAccess';
import { useUserSecurityPolicy } from './useUserSecurityPolicy';

const SecurityRestrictionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { policy } = useUserSecurityPolicy();

  const reasonCode = location.state?.reasonCode || 'portal-disabled';
  const pathname = location.state?.pathname || '';
  const permissionKey = location.state?.permissionKey || null;
  const requiredPortal = location.state?.requiredPortal || 'member';
  const copy = describeRestriction(reasonCode);

  const handleAccountClick = () => {
    navigate(PATHS.account);
  };

  const handleRetryClick = () => {
    if (pathname) {
      navigate(pathname, { replace: true });
      return;
    }

    navigate(-1);
  };

  const handleAuthClick = () => {
    navigate(PATHS.auth);
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 }, display: 'flex', justifyContent: 'center' }}>
      <Paper className="surface-card" sx={{ width: '100%', maxWidth: 760, p: { xs: 3, md: 4 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'warning.light',
                color: 'warning.dark',
              }}
            >
              <ShieldOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                {copy.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
                {copy.description}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Reason: ${reasonCode}`} color="warning" variant="outlined" />
            <Chip label={`Portal: ${requiredPortal}`} variant="outlined" />
            {permissionKey ? <Chip label={`Permission: ${permissionKey}`} variant="outlined" /> : null}
          </Stack>

          {pathname ? (
            <Alert severity="info">
              The blocked destination was <strong>{pathname}</strong>.
            </Alert>
          ) : null}

          {policy?.notes ? (
            <Alert severity="warning">
              Admin note: {policy.notes}
            </Alert>
          ) : null}

          {reasonCode === 'password-reset-required' ? (
            <Alert severity="error">
              You can still open account settings to update your password. An administrator may also need to clear the reset flag after the change.
            </Alert>
          ) : null}

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack spacing={1.25}>
              <Typography variant="h6" fontWeight={700}>
                What to do next
              </Typography>
              <Typography variant="body2" color="text.secondary">
                If this restriction is unexpected, ask an administrator to review your security flags and role permission overrides in the security center.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The security center route is <strong>{PATHS.adminSecurity}</strong>.
              </Typography>
            </Stack>
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {user ? (
              <Button
                variant="contained"
                startIcon={<SettingsOutlinedIcon />}
                onClick={handleAccountClick}
              >
                Open account settings
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<LoginOutlinedIcon />}
                onClick={handleAuthClick}
              >
                Go to sign in
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={handleRetryClick}
            >
              Retry access
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default SecurityRestrictionPage;
