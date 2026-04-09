import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Stack,
  Typography,
} from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';

const DISMISS_KEY = 'checkers-gym-pwa-dismissed';

const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    setDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true');

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canRender = useMemo(() => !dismissed && !isInstalled && deferredPrompt, [deferredPrompt, dismissed, isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  return (
    <Collapse in={Boolean(canRender)} unmountOnExit>
      <Alert
        severity="info"
        icon={<DownloadRoundedIcon fontSize="inherit" />}
        sx={{
          mt: 1,
          mb: 3,
          borderRadius: 4,
          alignItems: 'center',
          bgcolor: 'background.paper',
        }}
        action={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ ml: 2 }}>
            <Button size="small" variant="contained" onClick={handleInstall}>Install</Button>
            <Button size="small" color="inherit" onClick={handleDismiss}>Later</Button>
          </Stack>
        )}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Install Checkers Gym on this device
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add the app to your home screen for quicker member check-ins, class bookings, and admin workflows.
          </Typography>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default InstallAppPrompt;
