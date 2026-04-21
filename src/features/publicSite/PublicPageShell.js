import React, { useId } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const ActionButton = ({ action, primary = false }) => {
  const variant = action.variant || (primary ? 'contained' : 'outlined');

  if (action.href) {
    return (
      <Button
        variant={variant}
        component="a"
        href={action.href}
        target={action.external ? '_blank' : undefined}
        rel={action.external ? 'noreferrer' : undefined}
      >
        {action.label}
      </Button>
    );
  }

  return (
    <Button variant={variant} component={RouterLink} to={action.to}>
      {action.label}
    </Button>
  );
};

const PublicPageShell = ({
  eyebrow,
  title,
  description,
  chips = [],
  actions = [],
  stats = [],
  children,
}) => {
  const theme = useTheme();
  const headingId = useId();

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ py: { xs: 3, md: 5 } }}>
      <Paper
        component="header"
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 4, md: 5 },
          p: { xs: 2.5, md: 4 },
          mb: 4,
          bgcolor: 'background.paper',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)}, transparent 45%), radial-gradient(circle at bottom left, ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)}, transparent 40%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Stack spacing={3} sx={{ position: 'relative' }}>
          <Stack spacing={1.5}>
            <Typography color="primary.main" fontWeight={700}>
              {eyebrow}
            </Typography>
            <Typography id={headingId} variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '48px' } }}>
              {title}
            </Typography>
            <Typography color="text.secondary" maxWidth="900px" sx={{ lineHeight: 1.8 }}>
              {description}
            </Typography>
          </Stack>

          {chips.length ? (
            <Stack component="ul" direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {chips.map((chip) => (
                <Box component="li" key={chip}>
                  <Chip label={chip} variant="outlined" size="small" />
                </Box>
              ))}
            </Stack>
          ) : null}

          {actions.length ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {actions.map((action, index) => (
                <ActionButton key={action.label} action={action} primary={index === 0} />
              ))}
            </Stack>
          ) : null}

          {stats.length ? (
            <Box
              component="dl"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                m: 0,
              }}
            >
              {stats.map((stat) => (
                <Paper
                  key={stat.label}
                  component="div"
                  variant="outlined"
                  sx={{
                    minWidth: { xs: '100%', sm: 170 },
                    px: 2,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.9),
                  }}
                >
                  <Typography component="dt" variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    {stat.label}
                  </Typography>
                  <Typography component="dd" variant="h5" fontWeight={800} sx={{ m: 0 }}>
                    {stat.value}
                  </Typography>
                  {stat.caption ? (
                    <Typography variant="body2" color="text.secondary">
                      {stat.caption}
                    </Typography>
                  ) : null}
                </Paper>
              ))}
            </Box>
          ) : null}
        </Stack>
      </Paper>

      {children}
    </Box>
  );
};

export default PublicPageShell;
