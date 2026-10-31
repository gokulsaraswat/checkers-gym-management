import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { getTonedChipSx } from '../../../utils/statusColors';
import { formatProgressDate } from '../progressHelpers';

const KIND_META = {
  snapshot: { label: 'Snapshot', tone: 'info' },
  measurement: { label: 'Measurement', tone: 'success' },
  record: { label: 'Personal record', tone: 'success' },
};

const getKindMeta = (kind) => KIND_META[kind] || { label: 'Activity', tone: null };

const ProgressTimelineCard = ({
  title = 'Recent progress activity',
  description = 'Every snapshot, tape-measure entry, and new personal best is collected here in one feed.',
  timeline = [],
  emptyStateText = 'No progress activity yet.',
  limit = 10,
}) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', height: '100%' }}>
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
                    bgcolor: kindMeta.tone ? `${kindMeta.tone}.main` : 'text.disabled',
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
                        sx={(theme) => getTonedChipSx(theme, kindMeta.tone)}
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
