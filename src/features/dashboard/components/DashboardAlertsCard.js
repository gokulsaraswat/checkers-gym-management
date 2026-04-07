import React from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const DashboardAlertsCard = ({ alerts = [] }) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography color="#ff2625" fontWeight={700}>
          Alerts and nudges
        </Typography>
        <Typography variant="h6" fontWeight={800}>
          Stay on top of renewals and routines
        </Typography>
      </Stack>

      {!alerts.length ? (
        <Stack spacing={1.25}>
          <Typography fontWeight={700}>
            Everything looks healthy
          </Typography>
          <Typography color="text.secondary" lineHeight={1.8}>
            You have no urgent alerts right now. Keep logging workouts and snapshots to maintain momentum.
          </Typography>
        </Stack>
      ) : (
        alerts.map((alert) => (
          <Paper
            key={alert.id}
            variant="outlined"
            sx={{ p: 2, borderRadius: 3, borderColor: '#f3f4f6', boxShadow: 'none' }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                <Typography fontWeight={800}>
                  {alert.title}
                </Typography>
                <Chip
                  label={alert.severity || 'info'}
                  size="small"
                  sx={(() => {
                    if (alert.severity === 'warning') {
                      return { bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700, textTransform: 'capitalize' };
                    }

                    if (alert.severity === 'error') {
                      return { bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, textTransform: 'capitalize' };
                    }

                    return { bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, textTransform: 'capitalize' };
                  })()}
                />
              </Stack>

              <Typography color="text.secondary" lineHeight={1.75}>
                {alert.description}
              </Typography>

              {alert.actionLabel && alert.actionTo ? (
                <Button
                  component={RouterLink}
                  to={alert.actionTo}
                  variant="text"
                  sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none', fontWeight: 700 }}
                >
                  {alert.actionLabel}
                </Button>
              ) : null}
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  </Paper>
);

export default DashboardAlertsCard;
