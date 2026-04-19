import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';

export default function AsyncScreenState({
  loading,
  error,
  title,
  description,
  loadingLabel,
  empty,
  children,
}) {
  const theme = useTheme();

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

  if (error) {
    return (
      <Alert
        severity="error"
        variant="outlined"
        sx={{
          borderRadius: 4,
          bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.14 : 0.05),
          borderColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
        }}
      >
        {error}
      </Alert>
    );
  }

  if (empty) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 4,
          px: { xs: 2.5, md: 3.5 },
          py: { xs: 4, md: 5 },
          textAlign: 'center',
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.84),
        }}
      >
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return children;
}

AsyncScreenState.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string,
  empty: PropTypes.bool,
  error: PropTypes.string,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  title: PropTypes.string,
};

AsyncScreenState.defaultProps = {
  children: null,
  description: '',
  empty: false,
  error: '',
  loading: false,
  loadingLabel: 'Loading…',
  title: 'Nothing to show',
};
