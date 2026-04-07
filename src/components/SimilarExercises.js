import React from 'react';
import { Typography, Box, Stack, Alert } from '@mui/material';

import HorizontalScrollbar from './HorizontalScrollbar';
import Loader from './Loader';

const SimilarExercises = ({ targetMuscleExercises, equipmentExercises }) => {
  const renderSection = (items, fallbackText) => {
    if (items === null) {
      return <Loader />;
    }

    if (!items.length) {
      return (
        <Alert severity="info" sx={{ width: '100%', borderRadius: 3 }}>
          {fallbackText}
        </Alert>
      );
    }

    return <HorizontalScrollbar data={items} />;
  };

  return (
    <Box sx={{ mt: { lg: '100px', xs: '0px' } }}>
      <Typography sx={{ fontSize: { lg: '44px', xs: '25px' }, ml: '20px' }} fontWeight={700} color="#000" mb="33px">
        Similar <span style={{ color: '#FF2625', textTransform: 'capitalize' }}>Target Muscle</span> exercises
      </Typography>
      <Stack direction="row" sx={{ p: 2, position: 'relative', minHeight: '140px' }}>
        {renderSection(targetMuscleExercises, 'No similar target-muscle exercises are available in the demo library.')}
      </Stack>

      <Typography sx={{ fontSize: { lg: '44px', xs: '25px' }, ml: '20px', mt: { lg: '100px', xs: '60px' } }} fontWeight={700} color="#000" mb="33px">
        Similar <span style={{ color: '#FF2625', textTransform: 'capitalize' }}>Equipment</span> exercises
      </Typography>
      <Stack direction="row" sx={{ p: 2, position: 'relative', minHeight: '140px' }}>
        {renderSection(equipmentExercises, 'No similar equipment exercises are available in the demo library.')}
      </Stack>
    </Box>
  );
};

export default SimilarExercises;
