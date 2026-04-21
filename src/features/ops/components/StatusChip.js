/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies */

import PropTypes from 'prop-types';
import { Chip } from '@mui/material';

import { getStatusTone } from '../opsHelpers';

const normalizeLabel = (status) => String(status || 'unknown').replace(/_/g, ' ');

export default function StatusChip({ status, size = 'small' }) {
  return (
    <Chip
      color={getStatusTone(status)}
      label={normalizeLabel(status)}
      size={size}
      sx={{ textTransform: 'capitalize' }}
      variant="outlined"
    />
  );
}

StatusChip.propTypes = {
  size: PropTypes.oneOf(['small', 'medium']),
  status: PropTypes.string,
};

StatusChip.defaultProps = {
  size: 'small',
  status: 'unknown',
};
