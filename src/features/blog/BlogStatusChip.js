import React from 'react';
import { Chip } from '@mui/material';

import { getBlogStatusChipSx, getBlogStatusLabel } from './blogHelpers';

const BlogStatusChip = ({ status, size = 'small' }) => (
  <Chip
    size={size}
    label={getBlogStatusLabel(status)}
    sx={getBlogStatusChipSx(status)}
  />
);

export default BlogStatusChip;
