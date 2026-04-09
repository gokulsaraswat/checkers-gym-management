import PropTypes from 'prop-types'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'

export default function AsyncScreenState({
  loading,
  error,
  title,
  description,
  loadingLabel = 'Loading…',
  empty,
  children,
}) {
  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ minHeight: 220, py: 6 }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {loadingLabel}
        </Typography>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3 }}>
        {error}
      </Alert>
    )
  }

  if (empty) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 3,
          px: 3,
          py: 5,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
    )
  }

  return children
}

AsyncScreenState.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string,
  empty: PropTypes.bool,
  error: PropTypes.string,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  title: PropTypes.string,
}

AsyncScreenState.defaultProps = {
  children: null,
  description: '',
  empty: false,
  error: '',
  loading: false,
  loadingLabel: 'Loading…',
  title: 'Nothing to show',
}
