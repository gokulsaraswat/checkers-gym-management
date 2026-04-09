import PropTypes from 'prop-types'
import { Chip } from '@mui/material'

const statusToColor = {
  acknowledged: 'info',
  completed: 'success',
  healthy: 'success',
  investigating: 'warning',
  open: 'error',
  queued: 'default',
  resolved: 'success',
  running: 'info',
}

export default function StatusChip({ status, size = 'small' }) {
  const normalized = (status || 'unknown').toLowerCase()
  return (
    <Chip
      color={statusToColor[normalized] || 'default'}
      label={normalized.replaceAll('_', ' ')}
      size={size}
      sx={{ textTransform: 'capitalize' }}
      variant="outlined"
    />
  )
}

StatusChip.propTypes = {
  size: PropTypes.oneOf(['small', 'medium']),
  status: PropTypes.string,
}

StatusChip.defaultProps = {
  size: 'small',
  status: 'unknown',
}
