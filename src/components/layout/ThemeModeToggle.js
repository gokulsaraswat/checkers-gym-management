import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';

import { useThemeMode } from '../../theme/ThemeModeProvider';

const ThemeModeToggle = ({ edge = false }) => {
  const { isDarkMode, toggleMode } = useThemeMode();

  return (
    <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        color="inherit"
        onClick={toggleMode}
        edge={edge ? 'start' : false}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {isDarkMode ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeModeToggle;
