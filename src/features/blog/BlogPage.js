import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS, getBlogPostPath } from '../../app/paths';
import { fetchPublicBlogPosts } from './blogClient';
import { filterBlogPosts, formatBlogDate } from './blogHelpers';

const PublicPostCard = ({ post, featured = false }) => (
  <Paper
    component={RouterLink}
    to={getBlogPostPath(post.slug)}
    variant="outlined"
    sx={{
      display: 'block',
      p: featured ? { xs: 2.5, md: 3 } : 2.5,
      borderRadius: 4,
      textDecoration: 'none',
      color: 'inherit',
      height: '100%',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 6,
      },
    }}
  >
    <Stack spacing={2} sx={{ height: '100%' }}>
      {post.cover_image_url ? (
        <Box
          component="img"
          src={post.cover_image_url}
          alt={post.title}
          sx={{
            width: '100%',
            borderRadius: 3,
            aspectRatio: featured ? '16 / 8.5' : '16 / 10',
            objectFit: 'cover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {post.is_featured ? <Chip size="small" color="primary" label="Featured" /> : null}
        <Chip size="small" variant="outlined" label={formatBlogDate(post.published_at)} />
        <Chip size="small" variant="outlined" label={`${post.reading_time_minutes} min read`} />
      </Stack>

      <Stack spacing={1} sx={{ flex: 1 }}>
        <Typography variant={featured ? 'h4' : 'h5'} fontWeight={800}>
          {post.title}
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
          {post.summary}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {post.tags.map((tag) => (
          <Chip key={tag} size="small" variant="outlined" label={tag} />
        ))}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        By {post.author_name}
      </Typography>
    </Stack>
  </Paper>
);

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPosts = async () => {
      try {
        setLoading(true);
        const rows = await fetchPublicBlogPosts({ limit: 60 });

        if (active) {
          setPosts(rows);
          setError('');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load the blog right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const filteredPosts = useMemo(
    () => filterBlogPosts(posts, {
      query,
      onlyPublished: true,
    }),
    [posts, query],
  );

  const featuredPost = filteredPosts.find((post) => post.is_featured) || filteredPosts[0] || null;
  const remainingPosts = featuredPost
    ? filteredPosts.filter((post) => post.id !== featuredPost.id)
    : filteredPosts;

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2} mb={4}>
        <Typography color="primary.main" fontWeight={700}>
          Public blog
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '48px' } }}>
          Training notes, community stories, and gym updates
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          Explore public articles from the Checkers Gym team: coaching explainers, event recaps,
          member stories, and operational updates that help members stay connected to the gym.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts, tags, coaches, or topics"
            sx={{ minWidth: { xs: '100%', sm: 360 } }}
          />
          <Button component={RouterLink} to={PATHS.auth} variant="contained">
            Join now
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Typography color="text.secondary">Loading the latest articles...</Typography>
        </Paper>
      ) : null}

      {!loading && !filteredPosts.length ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={800}>
              No matching articles yet
            </Typography>
            <Typography color="text.secondary">
              Try a broader search or come back after the next publishing cycle.
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {!loading && featuredPost ? (
        <Stack spacing={3}>
          <PublicPostCard post={featuredPost} featured />

          {remainingPosts.length ? (
            <Grid container spacing={3}>
              {remainingPosts.map((post) => (
                <Grid key={post.id} item xs={12} md={6} lg={4}>
                  <PublicPostCard post={post} />
                </Grid>
              ))}
            </Grid>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
};

export default BlogPage;
