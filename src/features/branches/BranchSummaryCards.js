import React from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupIcon from '@mui/icons-material/Group';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CampaignIcon from '@mui/icons-material/Campaign';

import MetricCard from '../../components/common/MetricCard';

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const BranchSummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Branch',
      value: summary?.branch_name || 'Not selected',
      caption: summary?.timezone || 'Select a branch to inspect operations.',
      icon: StorefrontIcon,
    },
    {
      title: 'Active members',
      value: summary?.active_members ?? 0,
      caption: 'Members with this branch as their current home branch.',
      icon: GroupIcon,
    },
    {
      title: 'Expiring in 30 days',
      value: summary?.expiring_soon ?? 0,
      caption: 'Renewal queue for this location.',
      icon: EventBusyIcon,
    },
    {
      title: 'Month revenue',
      value: formatCurrency(summary?.month_revenue),
      caption: 'Completed payments booked to this branch this month.',
      icon: PaymentsIcon,
    },
    {
      title: 'Month expenses',
      value: formatCurrency(summary?.month_expenses),
      caption: 'Operating expenses logged against this branch this month.',
      icon: ReceiptLongIcon,
    },
    {
      title: 'Open leads',
      value: summary?.open_leads ?? 0,
      caption: 'Leads still in the local CRM pipeline.',
      icon: CampaignIcon,
    },
  ];

  return (
    <Grid container spacing={2.25}>
      {cards.map((card) => (
        <Grid key={card.title} xs={12} sm={6} lg={4}>
          <MetricCard
            title={card.title}
            value={card.value}
            caption={card.caption}
            icon={card.icon}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default BranchSummaryCards;
