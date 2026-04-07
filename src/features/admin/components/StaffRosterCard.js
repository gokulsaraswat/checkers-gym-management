import React from 'react';
import {
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { AdminPanelSettings, Group } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import EmptyStateCard from '../../../components/common/EmptyStateCard';
import { getAdminMemberDetailPath } from '../../../app/paths';
import { getRoleChipSx, getRoleLabel } from '../adminHelpers';

const StaffRosterCard = ({ members = [] }) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Group sx={{ color: '#ff2625' }} />
        <Stack spacing={0.5}>
          <Typography fontWeight={800}>Staff and admin roster</Typography>
          <Typography variant="body2" color="text.secondary">
            Quickly review non-member accounts and jump into their detail pages.
          </Typography>
        </Stack>
      </Stack>

      {!members.length ? (
        <EmptyStateCard
          title="No staff records yet"
          description="Promote a member to staff or admin from the roster to start using staff tooling later."
        />
      ) : (
        <Stack divider={<Divider flexItem />} spacing={2}>
          {members.map((member) => (
            <Stack key={member.id} spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Stack spacing={0.25}>
                  <Typography fontWeight={700}>
                    {member.full_name || member.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {member.email}
                  </Typography>
                </Stack>

                <Chip
                  label={getRoleLabel(member.role)}
                  size="small"
                  sx={getRoleChipSx(member.role)}
                />
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {member.plan?.name || 'No assigned plan'}
                </Typography>

                <Button
                  component={RouterLink}
                  to={getAdminMemberDetailPath(member.id)}
                  size="small"
                  startIcon={<AdminPanelSettings />}
                  sx={{ textTransform: 'none', borderRadius: 999 }}
                >
                  Open
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  </Paper>
);

export default StaffRosterCard;
