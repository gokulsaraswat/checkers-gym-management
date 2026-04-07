import React from 'react';
import { Typography, Box, Stack, Alert } from '@mui/material';
import Loader from './Loader';

const ExerciseVideos = ({ exerciseVideos, name }) => {
  if (exerciseVideos === null) return <Loader />;

  if (!exerciseVideos.length) {
    return (
      <Box sx={{ marginTop: { lg: '120px', xs: '20px' } }} p="20px">
        <Typography sx={{ fontSize: { lg: '40px', xs: '25px' } }} fontWeight={700} color="#000" mb="20px">
          Coaching Videos
        </Typography>
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          No guided videos are available for <strong style={{ textTransform: 'capitalize' }}>{name}</strong> in demo mode yet.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ marginTop: { lg: '203px', xs: '20px' } }} p="20px">
      <Typography sx={{ fontSize: { lg: '44px', xs: '25px' } }} fontWeight={700} color="#000" mb="33px">
        Watch <span style={{ color: '#FF2625', textTransform: 'capitalize' }}>{name}</span> exercise videos
      </Typography>
      <Stack
        sx={{ flexDirection: { lg: 'row' }, gap: { lg: '64px', xs: '24px' } }}
        justifyContent="flex-start"
        flexWrap="wrap"
        alignItems="stretch"
      >
        {exerciseVideos.slice(0, 3).map((item) => (
          <a
            key={item.video.videoId}
            className="exercise-video"
            href={`https://www.youtube.com/watch?v=${item.video.videoId}`}
            target="_blank"
            rel="noreferrer"
          >
            <img src={item.video.thumbnails[0].url} alt={item.video.title} />
            <Box>
              <Typography sx={{ fontSize: { lg: '28px', xs: '18px' } }} fontWeight={600} color="#000">
                {item.video.title}
              </Typography>
              <Typography fontSize="14px" color="#000">
                {item.video.channelName}
              </Typography>
            </Box>
          </a>
        ))}
      </Stack>
    </Box>
  );
};

export default ExerciseVideos;
