import React from 'react';
import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

const ActionButton = ({ action, primary }) => {
  if (!action?.label) {
    return null;
  }

  const variant = action.variant || (primary ? 'contained' : 'outlined');

  if (action.to) {
    return (
      <Button variant={variant} component={RouterLink} to={action.to}>
        {action.label}
      </Button>
    );
  }

  if (action.href) {
    return (
      <Button
        variant={variant}
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
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
};

const ErrorPageShell = ({
  children,
  statusLabel,
  title,
  description,
  details,
  primaryAction,
  secondaryAction,
  tips,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 4, md: 5 },
          p: { xs: 2.5, md: 4 },
          mb: 3,
          bgcolor: 'background.paper',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at top right, ${alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)}, transparent 44%), radial-gradient(circle at bottom left, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08)}, transparent 42%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Stack spacing={3} sx={{ position: 'relative' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box
              sx={{
                width: 74,
                height: 74,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'error.main',
                bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                border: '1px solid',
                borderColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.34 : 0.18),
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ fontSize: 36 }} />
            </Box>

            <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
              <Typography color="error.main" fontWeight={800} sx={{ letterSpacing: 1.1 }}>
                {statusLabel}
              </Typography>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '30px', md: '44px' } }}>
                {title}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: '900px' }}>
                {description}
              </Typography>
            </Stack>
          </Stack>

          {children}

          {(primaryAction || secondaryAction) ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <ActionButton action={primaryAction} primary />
              <ActionButton action={secondaryAction} primary={false} />
            </Stack>
          ) : null}

          {details ? (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.05),
                borderColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.28 : 0.16),
              }}
            >
              {details}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {tips?.length ? (
        <Grid container spacing={2.5}>
          {tips.map((tip, index) => (
            <Grid item xs={12} md={4} key={tip}>
              <Paper
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: { xs: 3, md: 4 },
                  p: { xs: 2.25, md: 2.75 },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
                    Step {index + 1}
                  </Typography>
                  <Typography fontWeight={800}>Try this next</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    {tip}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : null}
    </Box>
  );
};

const actionShape = PropTypes.shape({
  external: PropTypes.bool,
  href: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  to: PropTypes.string,
  variant: PropTypes.oneOf(['contained', 'outlined', 'text']),
});

ActionButton.propTypes = {
  action: actionShape,
  primary: PropTypes.bool,
};

ActionButton.defaultProps = {
  action: null,
  primary: false,
};

ErrorPageShell.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string.isRequired,
  details: PropTypes.string,
  primaryAction: actionShape,
  secondaryAction: actionShape,
  statusLabel: PropTypes.string,
  tips: PropTypes.arrayOf(PropTypes.string),
  title: PropTypes.string.isRequired,
};

ErrorPageShell.defaultProps = {
  children: null,
  details: '',
  primaryAction: null,
  secondaryAction: null,
  statusLabel: 'Unavailable',
  tips: [],
};

export default ErrorPageShell;
