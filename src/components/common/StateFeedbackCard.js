import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

const severityConfig = {
  error: {
    Icon: ErrorOutlineRoundedIcon,
    colorKey: 'error',
    badgeLabel: 'Recovery ready',
  },
  info: {
    Icon: InfoOutlinedIcon,
    colorKey: 'info',
    badgeLabel: 'Heads up',
  },
  success: {
    Icon: CheckCircleOutlineRoundedIcon,
    colorKey: 'success',
    badgeLabel: 'All set',
  },
  warning: {
    Icon: WarningAmberRoundedIcon,
    colorKey: 'warning',
    badgeLabel: 'Needs attention',
  },
};

const ActionButton = ({ action, variant }) => {
  if (!action?.label || typeof action.onClick !== 'function') {
    return null;
  }

  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
};

const StateFeedbackCard = ({
  severity,
  title,
  description,
  details,
  primaryAction,
  secondaryAction,
  compact,
  children,
}) => {
  const theme = useTheme();
  const config = severityConfig[severity] || severityConfig.info;
  const palette = theme.palette[config.colorKey];
  const { Icon } = config;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: compact ? 3 : 4,
        px: compact ? 2.25 : { xs: 2.5, md: 3.5 },
        py: compact ? 2.25 : { xs: 3, md: 4 },
        bgcolor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.14 : 0.05),
        borderColor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.34 : 0.18),
      }}
    >
      <Stack spacing={compact ? 2 : 2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box
            sx={{
              width: compact ? 56 : 68,
              height: compact ? 56 : 68,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
              border: '1px solid',
              borderColor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.34 : 0.18),
              color: `${config.colorKey}.main`,
            }}
          >
            <Icon sx={{ fontSize: compact ? 28 : 34 }} />
          </Box>

          <Stack spacing={0.75} sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color={`${config.colorKey}.main`} sx={{ letterSpacing: 1.1, fontWeight: 800 }}>
              {config.badgeLabel}
            </Typography>
            <Typography variant={compact ? 'h6' : 'h5'} fontWeight={800}>
              {title}
            </Typography>
            {description ? (
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {description}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        {details ? (
          <Alert
            severity={severity}
            variant="outlined"
            sx={{
              borderRadius: 3,
              bgcolor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.12 : 0.04),
              borderColor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.28 : 0.16),
            }}
          >
            {details}
          </Alert>
        ) : null}

        {children}

        {(primaryAction || secondaryAction) ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <ActionButton action={primaryAction} variant="contained" />
            <ActionButton action={secondaryAction} variant="outlined" />
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

const actionShape = PropTypes.shape({
  label: PropTypes.string,
  onClick: PropTypes.func,
});

ActionButton.propTypes = {
  action: actionShape,
  variant: PropTypes.oneOf(['contained', 'outlined', 'text']).isRequired,
};

ActionButton.defaultProps = {
  action: null,
};

StateFeedbackCard.propTypes = {
  children: PropTypes.node,
  compact: PropTypes.bool,
  description: PropTypes.string,
  details: PropTypes.string,
  primaryAction: actionShape,
  secondaryAction: actionShape,
  severity: PropTypes.oneOf(['error', 'info', 'success', 'warning']),
  title: PropTypes.string.isRequired,
};

StateFeedbackCard.defaultProps = {
  children: null,
  compact: false,
  description: '',
  details: '',
  primaryAction: null,
  secondaryAction: null,
  severity: 'info',
};

export default StateFeedbackCard;
