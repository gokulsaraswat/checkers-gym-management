import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

import { isSupabaseConfigured } from '../../lib/supabaseClient';

const SetupNotice = ({ title = 'Supabase connection required' }) => {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
      <Typography fontWeight={700} mb={0.5}>
        {title}
      </Typography>
      <Box component="span">
        Add <strong>REACT_APP_SUPABASE_URL</strong> and either <strong>REACT_APP_SUPABASE_PUBLISHABLE_KEY</strong> or
        <strong> REACT_APP_SUPABASE_ANON_KEY</strong> in your <code>.env</code> file, then run the SQL in
        <code> supabase/schema.sql</code>.
      </Box>
    </Alert>
  );
};

export default SetupNotice;
