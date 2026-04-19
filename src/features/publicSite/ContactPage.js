import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ContactPhoneRoundedIcon from '@mui/icons-material/ContactPhoneRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import {
  contactChannels,
  publicFaqs,
  visitPlanningSteps,
} from './publicSiteContent';
import { publicSectionCardSx } from './publicSiteHelpers';

const ContactPage = () => (
  <PublicPageShell
    eyebrow="Public website"
    title="Contact and visit planning"
    description="This page gives the public website a cleaner first-contact layer. Use it to explain who to talk to, what a first visit looks like, and how visitors should navigate the next step without mixing them into member-only flows."
    chips={['Contact paths', 'Visit planning', 'FAQ-friendly']}
    actions={[
      { label: 'Open feedback page', to: PATHS.feedback },
      { label: 'View gym map', to: PATHS.gymMap },
    ]}
    stats={[
      { label: 'Contact cards', value: contactChannels.length, caption: 'Each card can later connect to your live phone, email, or WhatsApp.' },
      { label: 'Visit steps', value: visitPlanningSteps.length, caption: 'Keeps first-time visitors from feeling lost.' },
      { label: 'FAQ prompts', value: publicFaqs.length, caption: 'Useful for public-site clarity before sign-up.' },
    ]}
  >
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {contactChannels.map((channel) => (
        <Grid key={channel.id} item xs={12} md={6}>
          <Paper variant="outlined" sx={publicSectionCardSx}>
            <Stack spacing={1.5} sx={{ height: '100%', p: { xs: 2.25, md: 2.5 } }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <ContactPhoneRoundedIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>
                  {channel.title}
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {channel.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {channel.supportWindow}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>

    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={5}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <RouteRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Best path for a first visit
              </Typography>
            </Stack>
            {visitPlanningSteps.map((step, index) => (
              <Stack key={step.title} direction="row" spacing={1.5} alignItems="flex-start">
                <Paper
                  variant="outlined"
                  sx={{
                    minWidth: 36,
                    height: 36,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 999,
                  }}
                >
                  <Typography fontWeight={800}>{index + 1}</Typography>
                </Paper>
                <Stack spacing={0.5}>
                  <Typography fontWeight={800}>{step.title}</Typography>
                  <Typography color="text.secondary">{step.description}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={7}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <MapRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Keep contact and location separate from the member app
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Public visitors need a simple explanation of where to start, who to ask, and what the
              gym experience looks like. Patch 31 keeps those public-facing questions inside the website,
              while member-only workflows stay in the authenticated product.
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Pair this page with the new gym map page for floor orientation, first-visit storytelling,
              and optional future embeds such as branch location maps or a 3D walkthrough.
            </Typography>
          </Stack>
        </Paper>
      </Grid>
    </Grid>

    <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 1.5, md: 2 } }}>
      <Stack spacing={1.25}>
        <Typography variant="h5" fontWeight={800} sx={{ px: { xs: 1, md: 1.5 }, pt: { xs: 1, md: 1.5 } }}>
          Public website FAQ
        </Typography>
        {publicFaqs.map((faq) => (
          <Accordion key={faq.question} disableGutters elevation={0} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography fontWeight={700}>{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Paper>
  </PublicPageShell>
);

export default ContactPage;
