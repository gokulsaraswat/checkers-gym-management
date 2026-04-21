import React from 'react';
import {
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const ReportInsightPanel = ({ insights = [] }) => (
  <Stack spacing={1.25}>
    {insights.map((insight) => (
      <Paper
        key={insight.id}
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 3,
          borderColor: 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
            <Typography fontWeight={800}>{insight.title}</Typography>
            <Chip
              label={insight.badge || insight.severity}
              color={insight.severity || 'default'}
              size="small"
              sx={{ borderRadius: 999 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
        </Stack>
      </Paper>
    ))}
  </Stack>
);

export default ReportInsightPanel;
