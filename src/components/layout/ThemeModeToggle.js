import React from 'react';
import { alpha } from '@mui/material/styles';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';

import { useThemeMode } from '../../theme/ThemeModeProvider';

const ThemeModeToggle = ({ edge = false }) => {
  const theme = useTheme();
  const { isDarkMode, toggleMode } = useThemeMode();
  const actionLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip title={actionLabel}>
      <IconButton
        color="inherit"
        onClick={toggleMode}
        edge={edge ? 'start' : false}
        aria-label={actionLabel}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.88 : 0.78),
          color: 'text.primary',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 12px 24px rgba(2, 6, 23, 0.24)'
            : '0 10px 22px rgba(15, 23, 42, 0.08)',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
          },
        }}
      >
        {isDarkMode ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeModeToggle;
