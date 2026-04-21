import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  PlaceRounded,
  PlayCircleOutlineRounded,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import useReducedMotionPreference from '../accessibility/useReducedMotionPreference';
import {
  contactChannels,
  galleryCollections,
  testimonials,
  upcomingEvents,
} from './publicSiteContent';
import { formatEventDateRange } from './publicSiteHelpers';

const buildSlides = () => {
  const firstEvent = upcomingEvents[0];
  const secondEvent = upcomingEvents[1];

  return [
    {
      id: 'first-impression',
      eyebrow: 'Patch 32 / homepage polish',
      title: 'Stronger first impressions with a cleaner public homepage.',
      description:
        'A polished hero, better media storytelling, and clearer visitor pathways help the public site feel intentional while still routing members into the real app experience.',
      imageUrl: galleryCollections[0]?.imageUrl || galleryCollections[1]?.imageUrl || '',
      accentLabel: 'Hero slider ready',
      metrics: [
        {
          label: 'Featured zone',
          value: galleryCollections[0]?.title || 'Strength floor',
        },
        {
          label: 'Theme mode',
          value: 'Light and dark aware',
        },
        {
          label: 'Primary goal',
          value: 'Visitor confidence',
        },
      ],
      chips: ['Homepage polish', 'Responsive media', 'Visitor flow'],
    },
    {
      id: 'community-visibility',
      eyebrow: 'Events and social proof',
      title: 'Turn events, wins, and stories into homepage momentum.',
      description:
        'Use upcoming events, testimonials, and gallery media together so the homepage keeps telling a living community story instead of feeling like a static poster.',
      imageUrl: galleryCollections[3]?.imageUrl || galleryCollections[2]?.imageUrl || '',
      accentLabel: 'Community spotlight',
      metrics: [
        {
          label: 'Next event',
          value: firstEvent ? formatEventDateRange(firstEvent.startDate, firstEvent.endDate) : 'Dates ready to publish',
        },
        {
          label: 'Story source',
          value: testimonials[0]?.name ? `${testimonials[0].name} testimonial` : 'Member highlights',
        },
        {
          label: 'Secondary event',
          value: secondEvent?.title || 'More campaigns can slot in here',
        },
      ],
      chips: ['Events', 'Testimonials', 'Gallery'],
    },
    {
      id: 'visit-planning',
      eyebrow: 'First visit clarity',
      title: 'Show what the gym feels like before a visitor walks in.',
      description:
        'Use theme-aware visual cards, lightweight media banners, and simple contact cues so new visitors can understand what to expect and where to go next.',
      imageUrl: galleryCollections[5]?.imageUrl || galleryCollections[4]?.imageUrl || '',
      accentLabel: 'Video-ready banner',
      metrics: [
        {
          label: 'Public contact lane',
          value: contactChannels[0]?.title || 'Front desk and first visits',
        },
        {
          label: 'Support track',
          value: contactChannels[1]?.title || 'Coach consultations',
        },
        {
          label: 'Media use',
          value: 'Images, posters, and short clips',
        },
      ],
      chips: ['Theme-aware assets', 'Contact clarity', 'Media polish'],
    },
  ];
};

const HomepageHeroSlider = ({ primaryCtaLabel, primaryCtaPath, onExploreClick }) => {
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotionPreference();
  const slides = useMemo(() => buildSlides(), []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || slides.length <= 1) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(timerId);
  }, [prefersReducedMotion, slides.length]);

  const activeSlide = slides[activeIndex];

  const jumpToSlide = (index) => {
    const normalizedIndex = (index + slides.length) % slides.length;
    setActiveIndex(normalizedIndex);
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 2, md: 3 } }}>
      <Paper
        className="homepage-hero-card surface-card"
        role="region"
        aria-roledescription="carousel"
        aria-label="Homepage hero highlights"
        sx={{
          overflow: 'hidden',
          borderRadius: { xs: 4, md: 5 },
          position: 'relative',
          borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.12),
        }}
      >
        <Box
          className="homepage-hero-art"
          aria-hidden="true"
          sx={{
            backgroundImage: [
              `linear-gradient(135deg, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.78 : 0.68)} 5%, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.24 : 0.18)} 45%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.26)} 100%)`,
              activeSlide.imageUrl ? `url(${activeSlide.imageUrl})` : 'none',
            ].join(','),
          }}
        />

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}
          spacing={{ xs: 3, md: 4 }}
          sx={{
            position: 'relative',
            px: { xs: 2.25, sm: 3, md: 4 },
            py: { xs: 2.5, md: 4 },
          }}
        >
          <Stack spacing={2.25} sx={{ flex: 1.15, minWidth: 0 }}>
            <Box className="sr-only" aria-live={prefersReducedMotion ? 'polite' : 'off'} aria-atomic="true">
              {`Slide ${activeIndex + 1} of ${slides.length}: ${activeSlide.title}`}
            </Box>
            <Chip
              icon={<AutoAwesomeRounded />}
              label={activeSlide.eyebrow}
              className="homepage-hero-chip"
              sx={{
                alignSelf: 'flex-start',
                fontWeight: 700,
                color: 'text.primary',
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.1),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.14),
              }}
            />

            <Box>
              <Typography
                variant="h2"
                fontWeight={900}
                sx={{
                  fontSize: { xs: '2rem', sm: '2.6rem', md: '3.3rem' },
                  lineHeight: 1.04,
                  letterSpacing: '-0.04em',
                  maxWidth: '12ch',
                }}
              >
                {activeSlide.title}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1.75, maxWidth: '64ch', fontSize: { xs: '0.98rem', md: '1.04rem' } }}
              >
                {activeSlide.description}
              </Typography>
            </Box>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {activeSlide.chips.map((chipLabel) => (
                <Chip
                  key={chipLabel}
                  size="small"
                  label={chipLabel}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.68 : 0.92),
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                to={primaryCtaPath}
                variant="contained"
                size="large"
                sx={{ borderRadius: 999, px: 3.25, py: 1.35, textTransform: 'none' }}
              >
                {primaryCtaLabel}
              </Button>

              <Button
                onClick={onExploreClick}
                variant="outlined"
                size="large"
                startIcon={<PlayCircleOutlineRounded />}
                sx={{ borderRadius: 999, px: 3.25, py: 1.35, textTransform: 'none' }}
              >
                Browse movement library
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button component={RouterLink} to={PATHS.gallery} size="small" sx={{ textTransform: 'none' }}>
                Gallery
              </Button>
              <Button component={RouterLink} to={PATHS.blog} size="small" sx={{ textTransform: 'none' }}>
                Blog
              </Button>
              <Button component={RouterLink} to={PATHS.events} size="small" sx={{ textTransform: 'none' }}>
                Events
              </Button>
              <Button component={RouterLink} to={PATHS.contact} size="small" sx={{ textTransform: 'none' }}>
                Contact
              </Button>
            </Stack>
          </Stack>

          <Stack spacing={2} sx={{ flex: 0.95, minWidth: 0 }}>
            <Paper
              className="homepage-hero-visual surface-card"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: { xs: 3.5, md: 4 },
                backdropFilter: 'blur(10px)',
                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.88),
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Chip
                    icon={<CalendarMonthRounded />}
                    label={activeSlide.accentLabel}
                    size="small"
                    sx={{
                      color: 'text.primary',
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                    }}
                  />

                  <Stack direction="row" spacing={1}>
                    <IconButton
                      aria-label={`Show previous slide. Current slide ${activeIndex + 1} of ${slides.length}.`}
                      onClick={() => jumpToSlide(activeIndex - 1)}
                      size="small"
                      sx={{ bgcolor: alpha(theme.palette.background.default, 0.75) }}
                    >
                      <ArrowBackRounded fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={`Show next slide. Current slide ${activeIndex + 1} of ${slides.length}.`}
                      onClick={() => jumpToSlide(activeIndex + 1)}
                      size="small"
                      sx={{ bgcolor: alpha(theme.palette.background.default, 0.75) }}
                    >
                      <ArrowForwardRounded fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                <Box className="homepage-media-poster">
                  <Box
                    className="homepage-media-poster__image"
                    aria-hidden="true"
                    sx={{
                      backgroundImage: [
                        `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.06)} 0%, ${alpha(theme.palette.common.black, 0.42)} 100%)`,
                        activeSlide.imageUrl ? `url(${activeSlide.imageUrl})` : 'none',
                      ].join(','),
                    }}
                  />

                  <Stack className="homepage-media-poster__content" spacing={1.25}>
                    <Box className="sr-only">
                      {`Visual banner for ${activeSlide.title}`}
                    </Box>
                    <Typography variant="overline" sx={{ letterSpacing: '0.16em', color: 'rgba(255,255,255,0.76)' }}>
                      Theme-aware visual banner
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="common.white" sx={{ maxWidth: '12ch' }}>
                      Media assets that look calmer in light mode and stronger in dark mode.
                    </Typography>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <PlayCircleOutlineRounded sx={{ color: 'common.white' }} />
                      <Typography color="common.white" fontWeight={600}>
                        Image, poster, and short-video ready hero area
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Stack spacing={1.1}>
                  {activeSlide.metrics.map((metric) => (
                    <Stack
                      key={metric.label}
                      direction="row"
                      spacing={1.5}
                      justifyContent="space-between"
                      sx={{
                        px: 1.5,
                        py: 1.2,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.56 : 0.74),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 1 : 0.72),
                      }}
                    >
                      <Typography color="text.secondary">{metric.label}</Typography>
                      <Typography fontWeight={700} textAlign="right">
                        {metric.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
              {slides.map((slide, index) => (
                <Button
                  key={slide.id}
                  onClick={() => jumpToSlide(index)}
                  className={`homepage-slide-indicator${index === activeIndex ? ' is-active' : ''}`}
                  aria-label={`Show slide ${index + 1}: ${slide.title}`}
                  aria-pressed={index === activeIndex}
                  sx={{
                    minWidth: 0,
                    px: 1.4,
                    py: 1,
                    borderRadius: 999,
                    textTransform: 'none',
                    color: 'text.primary',
                    justifyContent: 'flex-start',
                    bgcolor: index === activeIndex
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14)
                      : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.76 : 0.92),
                    border: '1px solid',
                    borderColor: index === activeIndex
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.34 : 0.2)
                      : 'divider',
                  }}
                >
                  <Stack direction="row" spacing={0.9} alignItems="center">
                    {index === 2 ? (
                      <PlaceRounded fontSize="small" />
                    ) : (
                      <CalendarMonthRounded fontSize="small" />
                    )}
                    <Typography variant="body2" fontWeight={700}>
                      {slide.eyebrow}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default HomepageHeroSlider;
