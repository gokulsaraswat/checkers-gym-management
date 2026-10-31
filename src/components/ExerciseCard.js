import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const tagButtonSx = (theme, paletteKey) => ({
  color: theme.palette[paletteKey][theme.palette.mode === 'dark' ? 'light' : 'dark'],
  background: alpha(theme.palette[paletteKey].main, theme.palette.mode === 'dark' ? 0.24 : 0.16),
  fontSize: '14px',
  borderRadius: '20px',
  textTransform: 'capitalize',
  '&:hover': {
    background: alpha(theme.palette[paletteKey].main, theme.palette.mode === 'dark' ? 0.32 : 0.24),
  },
});

const ExerciseCard = ({ exercise }) => {
  const theme = useTheme();

  return (
    <Link className="exercise-card" to={`/exercise/${exercise.id}`}>
      <img src={exercise.gifUrl} alt={exercise.name} loading="lazy" />
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button sx={{ ml: '21px', ...tagButtonSx(theme, 'error') }}>
          {exercise.bodyPart}
        </Button>
        <Button sx={{ ml: { xs: '21px', sm: 0 }, ...tagButtonSx(theme, 'warning') }}>
          {exercise.target}
        </Button>
      </Stack>
      <Typography
        ml="21px"
        color="text.primary"
        fontWeight="bold"
        sx={{ fontSize: { lg: '24px', xs: '20px' } }}
        mt="11px"
        pb="10px"
        textTransform="capitalize"
      >
        {exercise.name}
      </Typography>
    </Link>
  );
};

export default ExerciseCard;
