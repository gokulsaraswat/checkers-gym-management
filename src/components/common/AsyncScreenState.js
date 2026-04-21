import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';

import StateFeedbackCard from './StateFeedbackCard';
import { getErrorMessage } from '../../features/errors/errorStateHelpers';

export default function AsyncScreenState({
  loading,
  error,
  title,
  description,
  loadingLabel,
  empty,
  children,
  errorTitle,
  errorDescription,
  onRetry,
  retryLabel,
  emptyActionLabel,
  onEmptyAction,
}) {
  const theme = useTheme();
  const resolvedError = getErrorMessage(error);

  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2.5}
        sx={{
          minHeight: 220,
          py: 6,
          px: 3,
          textAlign: 'center',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.82),
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06),
          }}
        >
          <CircularProgress size={34} thickness={4.2} />
        </Box>
        <Stack spacing={0.75}>
          <Typography variant="subtitle1" fontWeight={700}>
            {loadingLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while the latest data is prepared.
          </Typography>
        </Stack>
      </Stack>
    );
  }

  if (resolvedError) {
    return (
      <StateFeedbackCard
        severity="error"
        title={errorTitle}
        description={errorDescription}
        details={resolvedError}
        primaryAction={onRetry ? { label: retryLabel, onClick: onRetry } : null}
      />
    );
  }

  if (empty) {
    return (
      <StateFeedbackCard
        severity="info"
        title={title}
        description={description}
        primaryAction={onEmptyAction ? { label: emptyActionLabel, onClick: onEmptyAction } : null}
      />
    );
  }

  return children;
}

AsyncScreenState.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string,
  empty: PropTypes.bool,
  emptyActionLabel: PropTypes.string,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      message: PropTypes.string,
    }),
  ]),
  errorDescription: PropTypes.string,
  errorTitle: PropTypes.string,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  onEmptyAction: PropTypes.func,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
  title: PropTypes.string,
};

AsyncScreenState.defaultProps = {
  children: null,
  description: '',
  empty: false,
  emptyActionLabel: 'Take action',
  error: '',
  errorDescription: 'Refresh the section or try a safer entry point if the issue continues.',
  errorTitle: 'We could not load this section',
  loading: false,
  loadingLabel: 'Loading…',
  onEmptyAction: null,
  onRetry: null,
  retryLabel: 'Try again',
  title: 'Nothing to show',
};
