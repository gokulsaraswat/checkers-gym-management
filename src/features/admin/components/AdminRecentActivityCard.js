import React from 'react';
import {
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { HistoryEdu } from '@mui/icons-material';

import EmptyStateCard from '../../../components/common/EmptyStateCard';
import { formatAdminActivityTimestamp } from '../adminHelpers';

const AdminRecentActivityCard = ({
  activities = [],
  title = 'Recent admin activity',
  emptyDescription = 'Actions like member creation, lifecycle edits, and note changes will appear here.',
}) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <HistoryEdu sx={{ color: '#ff2625' }} />
        <BoxHeading title={title} subtitle="Helpful when multiple admins are managing the same roster." />
      </Stack>

      {!activities.length ? (
        <EmptyStateCard
          title="No admin activity yet"
          description={emptyDescription}
        />
      ) : (
        <Stack divider={<Divider flexItem />} spacing={2}>
          {activities.map((item) => (
            <Stack key={item.id} spacing={1}>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                <Typography fontWeight={700} sx={{ pr: 1 }}>
                  {item.action_summary}
                </Typography>
                <Chip
                  label={formatAdminActivityTimestamp(item.created_at)}
                  size="small"
                  sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700 }}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {item.actor_name || 'Admin'}{item.target_member_name ? ` • ${item.target_member_name}` : ''}
              </Typography>

              {item.metadata?.changes ? (
                <Typography variant="body2" color="text.secondary">
                  Fields changed: {Object.keys(item.metadata.changes).join(', ') || 'record update'}
                </Typography>
              ) : null}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  </Paper>
);

const BoxHeading = ({ title, subtitle }) => (
  <Stack spacing={0.5}>
    <Typography fontWeight={800}>{title}</Typography>
    <Typography variant="body2" color="text.secondary">
      {subtitle}
    </Typography>
  </Stack>
);

export default AdminRecentActivityCard;
