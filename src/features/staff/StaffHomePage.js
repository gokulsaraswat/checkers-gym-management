import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CalendarMonth,
  Checklist,
  Group,
  TrendingUp,
} from '@mui/icons-material';

import MetricCard from '../../components/common/MetricCard';

const StaffHomePage = () => (
  <Box sx={{ py: { xs: 3, md: 5 } }}>
    <Stack spacing={1.5} mb={4}>
      <Typography color="#ff2625" fontWeight={700}>
        Staff workspace
      </Typography>
      <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
        Staff routing is now ready
      </Typography>
      <Typography color="text.secondary" maxWidth="760px">
        This page is intentionally lightweight in Phase 1. It proves that staff accounts can sign in,
        reach a staff-only area, and stay separated from member and admin routes.
      </Typography>
    </Stack>

    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <MetricCard title="Assigned members" value="0" caption="Trainer tools land in a later patch" icon={Group} />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard title="Today's sessions" value="0" caption="Class scheduling starts in Phase 6" icon={CalendarMonth} />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard title="Tasks" value="0" caption="Operational checklists come later" icon={Checklist} />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard title="Performance" value="—" caption="Staff metrics arrive with reports" icon={TrendingUp} />
      </Grid>

      <Grid item xs={12}>
        <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
          <Stack spacing={1.25}>
            <Typography variant="h5" fontWeight={800}>
              What Phase 1 adds for staff
            </Typography>
            <Typography color="text.secondary">
              Staff is now a first-class role in the app and database. Later patches will attach real trainer schedules,
              client management, attendance workflows, and performance reporting to this space.
            </Typography>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default StaffHomePage;
