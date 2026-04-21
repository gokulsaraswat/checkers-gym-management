import PropTypes from 'prop-types';
import { Card, CardContent, Stack, Typography } from '@mui/material';

import { sectionCardSx } from '../../../theme/responsiveTokens';

export default function SectionCard({ title, subtitle, actions, children }) {
  return (
    <Card sx={sectionCardSx}>
      <CardContent>
        <Stack spacing={3}>
          <Stack
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">{title}</Typography>
              {subtitle ? (
                <Typography color="text.secondary" variant="body2">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {actions}
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

SectionCard.propTypes = {
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
  subtitle: PropTypes.string,
  title: PropTypes.string.isRequired,
};

SectionCard.defaultProps = {
  actions: null,
  subtitle: '',
};
