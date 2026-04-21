import React from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Link as RouterLink } from 'react-router-dom';

function getActionVariant(action, index) {
  if (action.variant) {
    return action.variant;
  }

  if (index === 0) {
    return 'contained';
  }

  return 'outlined';
}

function renderAction(action, index) {
  const buttonProps = {
    variant: getActionVariant(action, index),
    color: action.color || 'primary',
    startIcon: action.startIcon || undefined,
    onClick: action.onClick,
  };

  if (action.to) {
    return (
      <Button
        key={action.label}
        variant={buttonProps.variant}
        color={buttonProps.color}
        startIcon={buttonProps.startIcon}
        onClick={buttonProps.onClick}
        component={RouterLink}
        to={action.to}
      >
        {action.label}
      </Button>
    );
  }

  if (action.href) {
    return (
      <Button
        key={action.label}
        variant={buttonProps.variant}
        color={buttonProps.color}
        startIcon={buttonProps.startIcon}
        onClick={buttonProps.onClick}
        component="a"
        href={action.href}
        target={action.external ? '_blank' : undefined}
        rel={action.external ? 'noreferrer' : undefined}
      >
        {action.label}
      </Button>
    );
  }

  return (
    <Button
      key={action.label}
      variant={buttonProps.variant}
      color={buttonProps.color}
      startIcon={buttonProps.startIcon}
      onClick={buttonProps.onClick}
    >
      {action.label}
    </Button>
  );
}

function getIconColor(severity) {
  if (severity === 'warning') {
    return 'warning';
  }

  if (severity === 'info') {
    return 'info';
  }

  return 'error';
}

const ErrorStatePanel = ({
  eyebrow = 'Something went wrong',
  title,
  description,
  hint = '',
  details = '',
  severity = 'error',
  icon = null,
  actions = [],
  sx = {},
}) => {
  const IconComponent = icon || ErrorOutlineRoundedIcon;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: { xs: 3, md: 4 },
        ...sx,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
              borderRadius: '50%',
              bgcolor: 'action.selected',
            }}
          >
            <IconComponent color={getIconColor(severity)} />
          </Box>

          <Stack spacing={0.75}>
            <Typography
              color="text.secondary"
              fontWeight={700}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {eyebrow}
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
        </Stack>

        <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
          {description}
        </Typography>

        {hint ? <Alert severity={severity}>{hint}</Alert> : null}

        {details ? (
          <Alert severity="info">
            <Typography variant="body2">{details}</Typography>
          </Alert>
        ) : null}

        {actions.length ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            flexWrap="wrap"
            useFlexGap
          >
            {actions.map(renderAction)}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default ErrorStatePanel;
