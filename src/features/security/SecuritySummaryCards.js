import React from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';

import MetricCard from '../../components/common/MetricCard';

const SecuritySummaryCards = ({ summary }) => {
  const safeSummary = summary || {};

  return (
    <Grid container spacing={2.25}>
      <Grid xs={12} sm={6} lg={2.4}>
        <MetricCard
          title="Open incidents"
          value={safeSummary.open_incidents ?? 0}
          caption="Open and monitoring issues"
          icon={ShieldOutlinedIcon}
        />
      </Grid>
      <Grid xs={12} sm={6} lg={2.4}>
        <MetricCard
          title="Critical incidents"
          value={safeSummary.critical_incidents ?? 0}
          caption="Requires immediate attention"
          icon={WarningAmberOutlinedIcon}
        />
      </Grid>
      <Grid xs={12} sm={6} lg={2.4}>
        <MetricCard
          title="Permission overrides"
          value={safeSummary.overrides_count ?? 0}
          caption="Role-level override rules"
          icon={KeyOutlinedIcon}
        />
      </Grid>
      <Grid xs={12} sm={6} lg={2.4}>
        <MetricCard
          title="Flagged users"
          value={safeSummary.flagged_users ?? 0}
          caption="Portal access or reset controls"
          icon={LockResetOutlinedIcon}
        />
      </Grid>
      <Grid xs={12} sm={6} lg={2.4}>
        <MetricCard
          title="Audit events (7d)"
          value={safeSummary.audit_events_7d ?? 0}
          caption={`${safeSummary.audit_events_30d ?? 0} in the last 30 days`}
          icon={HistoryEduOutlinedIcon}
        />
      </Grid>
    </Grid>
  );
};

export default SecuritySummaryCards;
