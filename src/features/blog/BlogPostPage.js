import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PATHS, getBlogPostPath } from '../../app/paths';
import { fetchBlogPostBySlug, fetchPublicBlogPosts } from './blogClient';
import MarkdownRenderer from './MarkdownRenderer';
import { formatBlogDate } from './blogHelpers';

const RelatedPostCard = ({ post }) => (
  <Paper
    component={RouterLink}
    to={getBlogPostPath(post.slug)}
    variant="outlined"
    sx={{
      display: 'block',
      p: 2.25,
      borderRadius: 4,
      textDecoration: 'none',
      color: 'inherit',
      height: '100%',
    }}
  >
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      <Typography variant="h6" fontWeight={800}>
        {post.title}
      </Typography>
      <Typography color="text.secondary" sx={{ lineHeight: 1.75, flex: 1 }}>
        {post.summary}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatBlogDate(post.published_at)} • {post.reading_time_minutes} min read
      </Typography>
    </Stack>
  </Paper>
);

const BlogPostPage = () => {
  const { slug = '' } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadArticle = async () => {
      try {
        setLoading(true);
        const [article, allPosts] = await Promise.all([
          fetchBlogPostBySlug(slug),
          fetchPublicBlogPosts({ limit: 24 }),
        ]);

        if (!active) {
          return;
        }

        if (!article) {
          setPost(null);
          setRelatedPosts([]);
          setError('This article is not available right now.');
          return;
        }

        setPost(article);
        setError('');
        setRelatedPosts(
          allPosts.filter((item) => item.slug !== article.slug).slice(0, 3),
        );
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load the article right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadArticle();

    return () => {
      active = false;
    };
  }, [slug]);

  const headerMeta = useMemo(() => {
    if (!post) {
      return [];
    }

    return [
      formatBlogDate(post.published_at),
      `${post.reading_time_minutes} min read`,
      post.author_name,
    ];
  }, [post]);

  if (loading) {
    return (
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Typography color="text.secondary">Loading article...</Typography>
        </Paper>
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {error || 'This article is not available right now.'}
        </Alert>
        <Button component={RouterLink} to={PATHS.blog} variant="contained">
          Back to blog
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3.5}>
        <Button component={RouterLink} to={PATHS.blog} variant="text" sx={{ alignSelf: 'flex-start', px: 0 }}>
          ← Back to blog
        </Button>

        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {headerMeta.map((meta) => (
              <Chip key={meta} size="small" variant="outlined" label={meta} />
            ))}
          </Stack>

          <Typography variant="h2" fontWeight={800} sx={{ fontSize: { xs: '34px', md: '54px' }, lineHeight: 1.1 }}>
            {post.title}
          </Typography>

          <Typography color="text.secondary" maxWidth="820px" sx={{ lineHeight: 1.85 }}>
            {post.summary}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {post.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} variant="outlined" />
            ))}
          </Stack>
        </Stack>

        {post.cover_image_url ? (
          <Box
            component="img"
            src={post.cover_image_url}
            alt={post.title}
            sx={{
              width: '100%',
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              aspectRatio: '16 / 8',
              objectFit: 'cover',
            }}
          />
        ) : null}

        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4 }}>
          <MarkdownRenderer markdown={post.content_markdown} />
        </Paper>

        {relatedPosts.length ? (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Continue reading
            </Typography>
            <Grid container spacing={3}>
              {relatedPosts.map((item) => (
                <Grid item xs={12} md={4} key={item.id}>
                  <RelatedPostCard post={item} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
};

export default BlogPostPage;
