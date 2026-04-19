import React from 'react';
import {
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import { galleryCollections, publicWebsiteHighlights } from './publicSiteContent';
import { publicSectionCardSx } from './publicSiteHelpers';

const GalleryPage = () => (
  <PublicPageShell
    eyebrow="Public website"
    title="Gallery and visual story spaces"
    description="Build a cleaner public-facing gallery for first impressions, event recaps, trainer storytelling, and branch atmosphere. The seeded cards below are ready to be swapped with real media from the older website or new shoots."
    chips={['Media-ready sections', 'Event recaps', 'Legacy content migration']}
    actions={[
      { label: 'Plan a visit', to: PATHS.contact },
      { label: 'See events', to: PATHS.events },
    ]}
    stats={publicWebsiteHighlights}
  >
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {galleryCollections.map((collection) => (
        <Grid key={collection.id} item xs={12} md={6}>
          <Paper variant="outlined" sx={publicSectionCardSx}>
            <Stack spacing={2.5} sx={{ height: '100%', p: { xs: 2, md: 2.5 } }}>
              <Box
                component="img"
                src={collection.imageUrl}
                alt={collection.title}
                sx={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 3,
                  objectFit: 'cover',
                }}
              />

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip icon={<PhotoLibraryRoundedIcon />} label="Gallery set" size="small" color="primary" />
                <Chip icon={<CollectionsRoundedIcon />} label={collection.tags[0]} size="small" variant="outlined" />
                <Chip icon={<PlaceRoundedIcon />} label={collection.tags[1]} size="small" variant="outlined" />
              </Stack>

              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={800}>
                  {collection.title}
                </Typography>
                <Typography fontWeight={700} color="text.secondary">
                  {collection.subtitle}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {collection.bullets[0]}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {collection.tags.map((tag) => (
                  <Chip key={tag} size="small" variant="outlined" label={tag} />
                ))}
              </Stack>

              <Stack spacing={1.25}>
                {collection.bullets.slice(1).map((bullet) => (
                  <Typography key={bullet} variant="body2" color="text.secondary">
                    • {bullet}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>

    <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={800}>
          How this patch helps old-site content migration
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
          Instead of one long brochure page, the public site now has dedicated slots for floor photos,
          community media, trainer moments, recovery highlights, and signage details. That makes it easier
          to migrate older website media in smaller, more purposeful groups.
        </Typography>
      </Stack>
    </Paper>
  </PublicPageShell>
);

export default GalleryPage;
