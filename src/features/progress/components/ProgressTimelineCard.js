import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { formatProgressDate } from '../progressHelpers';

const KIND_META = {
  snapshot: { label: 'Snapshot', background: '#eef2ff', color: '#4338ca' },
  measurement: { label: 'Measurement', background: '#ecfeff', color: '#0f766e' },
  record: { label: 'Personal record', background: '#ecfdf3', color: '#047857' },
};

const getKindMeta = (kind) => KIND_META[kind] || {
  label: 'Activity',
  background: '#f8fafc',
  color: '#475569',
};

const ProgressTimelineCard = ({
  title = 'Recent progress activity',
  description = 'Every snapshot, tape-measure entry, and new personal best is collected here in one feed.',
  timeline = [],
  emptyStateText = 'No progress activity yet.',
  limit = 10,
}) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography color="#ff2625" fontWeight={700}>
          Activity timeline
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          {title}
        </Typography>
        <Typography color="text.secondary">
          {description}
        </Typography>
      </Stack>

      {!timeline.length ? (
        <Typography color="text.secondary">
          {emptyStateText}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {timeline.slice(0, limit).map((item) => {
            const kindMeta = getKindMeta(item.kind);

            return (
              <Stack key={item.id} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    mt: 1,
                    borderRadius: '999px',
                    flexShrink: 0,
                    bgcolor: kindMeta.color,
                  }}
                />
                <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
                  <Stack spacing={1}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ sm: 'center' }}
                      spacing={1}
                    >
                      <Typography fontWeight={800}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={kindMeta.label}
                        sx={{ bgcolor: kindMeta.background, color: kindMeta.color, fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {formatProgressDate(item.occurred_on)}
                    </Typography>
                    {item.subtitle ? (
                      <Typography color="text.secondary">
                        {item.subtitle}
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  </Paper>
);

export default ProgressTimelineCard;
