import React from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const DashboardAlertsCard = ({ alerts = [] }) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={2}>
      <Box>
        <Typography color="#ff2625" fontWeight={700}>
          Alert center
        </Typography>
        <Typography variant="h6" fontWeight={800} mt={0.5}>
          Stay ahead of renewals and missing records
        </Typography>
      </Box>

      {!alerts.length ? (
        <Alert severity="success" sx={{ borderRadius: 3 }}>
          Everything important looks up to date right now.
        </Alert>
      ) : (
        alerts.map((alert) => (
          <Alert
            key={alert.id}
            severity={alert.severity || 'info'}
            sx={{ borderRadius: 3, alignItems: 'flex-start' }}
            action={alert.actionLabel && alert.actionTo ? (
              <Button
                component={RouterLink}
                to={alert.actionTo}
                size="small"
                sx={{ textTransform: 'none', mt: 0.5 }}
              >
                {alert.actionLabel}
              </Button>
            ) : null}
          >
            <Typography fontWeight={700} mb={0.5}>
              {alert.title}
            </Typography>
            <Typography variant="body2">
              {alert.description}
            </Typography>
          </Alert>
        ))
      )}
    </Stack>
  </Paper>
);

export default DashboardAlertsCard;
