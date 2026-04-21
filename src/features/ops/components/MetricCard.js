/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies */

import PropTypes from 'prop-types';
import { Card, CardContent, Stack, Typography } from '@mui/material';

import { sectionCardSx } from '../../../theme/responsiveTokens';

export default function MetricCard({ label, value, helper }) {
  return (
    <Card sx={sectionCardSx}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {helper ? (
            <Typography variant="caption" color="text.secondary">
              {helper}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

MetricCard.propTypes = {
  helper: PropTypes.string,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

MetricCard.defaultProps = {
  helper: '',
};
