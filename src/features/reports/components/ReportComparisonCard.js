import React from 'react';
import {
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  TrendingDown,
  TrendingFlat,
  TrendingUp,
} from '@mui/icons-material';

const resolveTone = (deltaValue, goal) => {
  if (deltaValue === null || deltaValue === undefined || Number(deltaValue) === 0) {
    return {
      color: 'default',
      icon: <TrendingFlat fontSize="small" />,
    };
  }

  const isIncrease = Number(deltaValue) > 0;
  const isPositive = goal === 'down' ? !isIncrease : isIncrease;

  if (isPositive) {
    return {
      color: 'success',
      icon: <TrendingUp fontSize="small" />,
    };
  }

  return {
    color: 'warning',
    icon: <TrendingDown fontSize="small" />,
  };
};

const ReportComparisonCard = ({
  title,
  value,
  comparisonText,
  deltaText,
  deltaValue,
  goal = 'up',
  helperText = '',
}) => {
  const tone = resolveTone(deltaValue, goal);
  const chipVariant = tone.color === 'default' ? 'outlined' : 'filled';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 3,
        height: '100%',
        borderColor: 'rgba(15, 23, 42, 0.08)',
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
          <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: 0.1 }}>
            {title}
          </Typography>
          <Chip
            icon={tone.icon}
            label={deltaText}
            size="small"
            color={tone.color}
            variant={chipVariant}
            sx={{ borderRadius: 999 }}
          />
        </Stack>
        <Typography variant="h5" fontWeight={800}>{value}</Typography>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">{comparisonText}</Typography>
          <Typography variant="body2" color="text.secondary">{helperText}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ReportComparisonCard;
