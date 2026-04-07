import React from 'react';
import { Avatar, Paper, Stack, Typography } from '@mui/material';

const MetricCard = ({
  title,
  value,
  caption,
  icon: Icon,
}) => (
  <Paper
    className="surface-card"
    sx={{
      p: 3,
      borderRadius: 4,
      height: '100%',
      background: '#fff',
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
      <Stack spacing={0.5}>
        <Typography color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
        {caption ? (
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </Stack>
      {Icon ? (
        <Avatar sx={{ bgcolor: '#fff0f0', color: '#ff2625', width: 52, height: 52 }}>
          <Icon />
        </Avatar>
      ) : null}
    </Stack>
  </Paper>
);

export default MetricCard;
