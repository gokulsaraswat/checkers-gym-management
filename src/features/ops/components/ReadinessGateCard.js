/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies */

import PropTypes from 'prop-types';
import { Button, Stack, Typography } from '@mui/material';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { Link as RouterLink } from 'react-router-dom';

import SectionCard from './SectionCard';
import StatusChip from './StatusChip';

export default function ReadinessGateCard({
  title,
  status,
  summary,
  evidence,
  actionTo,
  actionLabel,
}) {
  return (
    <SectionCard
      title={title}
      subtitle={summary}
      actions={<StatusChip status={status} />}
    >
      <Stack spacing={1.5}>
        {evidence.length ? (
          <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
            {evidence.map((entry) => (
              <Typography component="li" key={entry} color="text.secondary" variant="body2">
                {entry}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No readiness evidence is available yet.
          </Typography>
        )}
        {actionTo ? (
          <Button
            component={RouterLink}
            to={actionTo}
            variant="outlined"
            endIcon={<LaunchRoundedIcon />}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

ReadinessGateCard.propTypes = {
  actionLabel: PropTypes.string,
  actionTo: PropTypes.string,
  evidence: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string,
  summary: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

ReadinessGateCard.defaultProps = {
  actionLabel: 'Open workspace',
  actionTo: '',
  evidence: [],
  status: 'unknown',
};
