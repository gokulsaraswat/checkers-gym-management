/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies */

import PropTypes from 'prop-types';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { Stack, Typography } from '@mui/material';

import SectionCard from './SectionCard';

export default function ReadinessChecklistCard({ items }) {
  const completedCount = items.filter((item) => item.completed).length;

  return (
    <SectionCard
      title="Launch checklist"
      subtitle="Final checks the admin team can review before pushing the release live."
      actions={(
        <Typography color="text.secondary" variant="body2">
          {completedCount}/{items.length} complete
        </Typography>
      )}
    >
      <Stack spacing={1.5}>
        {items.length ? items.map((item) => (
          <Stack key={item.label} direction="row" spacing={1.25} alignItems="flex-start">
            {item.completed ? (
              <CheckCircleRoundedIcon color="success" fontSize="small" sx={{ mt: 0.1 }} />
            ) : (
              <RadioButtonUncheckedRoundedIcon color="disabled" fontSize="small" sx={{ mt: 0.1 }} />
            )}
            <Stack spacing={0.25}>
              <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
              <Typography color="text.secondary" variant="body2">
                {item.helper}
              </Typography>
            </Stack>
          </Stack>
        )) : (
          <Typography color="text.secondary" variant="body2">
            No launch checklist items are available yet.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}

ReadinessChecklistCard.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    completed: PropTypes.bool,
    helper: PropTypes.string,
    label: PropTypes.string,
  })),
};

ReadinessChecklistCard.defaultProps = {
  items: [],
};
