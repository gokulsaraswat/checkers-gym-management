import React, { Fragment } from 'react';
import {
  Box,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

/* eslint-disable no-continue, no-cond-assign */

const INLINE_PATTERN = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;

const sanitizeUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : '';
};

const extractYouTubeId = (url) => {
  const sanitized = sanitizeUrl(url);

  if (!sanitized) {
    return '';
  }

  try {
    const parsed = new URL(sanitized);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
    }

    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v') || '';
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const markerIndex = pathParts.findIndex((part) => ['embed', 'shorts'].includes(part));

    if (markerIndex >= 0) {
      return pathParts[markerIndex + 1] || '';
    }

    return '';
  } catch (error) {
    return '';
  }
};

const extractVimeoId = (url) => {
  const sanitized = sanitizeUrl(url);

  if (!sanitized) {
    return '';
  }

  try {
    const parsed = new URL(sanitized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch (error) {
    return '';
  }
};

const extractLoomId = (url) => {
  const sanitized = sanitizeUrl(url);

  if (!sanitized) {
    return '';
  }

  try {
    const parsed = new URL(sanitized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch (error) {
    return '';
  }
};

const getEmbedConfig = (url = '') => {
  const sanitized = sanitizeUrl(url);

  if (!sanitized) {
    return {
      type: 'invalid',
      url: '',
      label: 'Invalid link',
    };
  }

  if (sanitized.includes('youtube.com') || sanitized.includes('youtu.be')) {
    const videoId = extractYouTubeId(sanitized);

    if (videoId) {
      return {
        type: 'video',
        label: 'YouTube video',
        url: sanitized,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      };
    }
  }

  if (sanitized.includes('vimeo.com')) {
    const videoId = extractVimeoId(sanitized);

    if (videoId) {
      return {
        type: 'video',
        label: 'Vimeo video',
        url: sanitized,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
      };
    }
  }

  if (sanitized.includes('loom.com')) {
    const videoId = extractLoomId(sanitized);

    if (videoId) {
      return {
        type: 'video',
        label: 'Loom video',
        url: sanitized,
        embedUrl: `https://www.loom.com/embed/${videoId}`,
      };
    }
  }

  if (sanitized.includes('x.com') || sanitized.includes('twitter.com')) {
    return { type: 'social', label: 'X / Twitter post', url: sanitized };
  }

  if (sanitized.includes('instagram.com')) {
    return { type: 'social', label: 'Instagram post', url: sanitized };
  }

  if (sanitized.includes('tiktok.com')) {
    return { type: 'social', label: 'TikTok post', url: sanitized };
  }

  if (sanitized.includes('facebook.com')) {
    return { type: 'social', label: 'Facebook post', url: sanitized };
  }

  return {
    type: 'link',
    label: 'External embed link',
    url: sanitized,
  };
};

const renderInline = (text = '', keyPrefix = 'inline') => {
  const value = String(text || '');
  INLINE_PATTERN.lastIndex = 0;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = INLINE_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      const plainText = value.slice(lastIndex, match.index);
      nodes.push(<Fragment key={`${keyPrefix}-text-${lastIndex}`}>{plainText}</Fragment>);
    }

    if (match[2] && match[3]) {
      const safeUrl = sanitizeUrl(match[3]);
      nodes.push(
        <Link
          key={`${keyPrefix}-link-${match.index}`}
          href={safeUrl || undefined}
          target="_blank"
          rel="noreferrer"
          underline="hover"
        >
          {match[2]}
        </Link>,
      );
    } else if (match[4]) {
      nodes.push(
        <Box key={`${keyPrefix}-strong-${match.index}`} component="strong" sx={{ fontWeight: 700 }}>
          {match[4]}
        </Box>,
      );
    } else if (match[5]) {
      nodes.push(
        <Box
          key={`${keyPrefix}-code-${match.index}`}
          component="code"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.92em',
          }}
        >
          {match[5]}
        </Box>,
      );
    } else if (match[6]) {
      nodes.push(
        <Box key={`${keyPrefix}-em-${match.index}`} component="em" sx={{ fontStyle: 'italic' }}>
          {match[6]}
        </Box>,
      );
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push(<Fragment key={`${keyPrefix}-tail`}>{value.slice(lastIndex)}</Fragment>);
  }

  return nodes.length ? nodes : value;
};

const isSpecialLine = (line = '') => {
  const value = String(line || '');

  return /^```/.test(value)
    || /^#{1,6}\s+/.test(value)
    || /^---+$/.test(value.trim())
    || /^@\[(embed|video)\]\((https?:\/\/[^\s)]+)\)$/i.test(value.trim())
    || /^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/.test(value.trim())
    || /^>\s?/.test(value)
    || /^\s*[-*+]\s+/.test(value)
    || /^\s*\d+\.\s+/.test(value);
};

const parseBlocks = (markdown = '') => {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const language = trimmed.replace(/^```/, '').trim();
      const codeLines = [];
      index += 1;

      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      index += 1;
      continue;
    }

    const embedMatch = trimmed.match(/^@\[(embed|video)\]\((https?:\/\/[^\s)]+)\)$/i);

    if (embedMatch) {
      blocks.push({
        type: 'embed',
        url: embedMatch[2],
      });
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);

    if (imageMatch) {
      blocks.push({
        type: 'image',
        alt: imageMatch[1],
        url: imageMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];

      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push({
        type: 'quote',
        text: quoteLines.join(' '),
      });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];

      while (
        index < lines.length
        && (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*+]\s+/.test(lines[index]))
      ) {
        items.push(lines[index].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''));
        index += 1;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraphLines = [];

    while (index < lines.length && lines[index].trim() && !isSpecialLine(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join(' '),
    });
  }

  return blocks;
};

const renderEmbedBlock = (block, key) => {
  const config = getEmbedConfig(block.url);

  if (config.type === 'video') {
    return (
      <Stack key={key} spacing={1.25}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            pt: '56.25%',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            component="iframe"
            src={config.embedUrl}
            title={config.label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {config.label}
        </Typography>
      </Stack>
    );
  }

  return (
    <Paper key={key} variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
      <Stack spacing={1}>
        <Typography fontWeight={700}>{config.label}</Typography>
        <Typography variant="body2" color="text.secondary">
          Hosted video embeds render inline. Social links are shown as safe external cards in this patch.
        </Typography>
        <Link href={config.url} target="_blank" rel="noreferrer" underline="hover">
          {config.url}
        </Link>
      </Stack>
    </Paper>
  );
};

const headingVariantMap = {
  1: 'h3',
  2: 'h4',
  3: 'h5',
  4: 'h6',
  5: 'subtitle1',
  6: 'subtitle2',
};

const MarkdownRenderer = ({ markdown = '' }) => {
  const blocks = parseBlocks(markdown);

  if (!blocks.length) {
    return (
      <Typography color="text.secondary">
        No content yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'heading') {
          return (
            <Typography
              key={key}
              variant={headingVariantMap[block.level] || 'h6'}
              fontWeight={800}
              sx={{ mt: block.level <= 2 ? 1.5 : 0.5 }}
            >
              {renderInline(block.text, key)}
            </Typography>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <Typography key={key} variant="body1" sx={{ lineHeight: 1.9 }}>
              {renderInline(block.text, key)}
            </Typography>
          );
        }

        if (block.type === 'list') {
          return (
            <Box
              key={key}
              component={block.ordered ? 'ol' : 'ul'}
              sx={{
                pl: 3,
                my: 0,
              }}
            >
              {block.items.map((item, itemIndex) => (
                <Box component="li" key={`${key}-${itemIndex}`} sx={{ mb: 0.85 }}>
                  <Typography component="span" sx={{ lineHeight: 1.9 }}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </Typography>
                </Box>
              ))}
            </Box>
          );
        }

        if (block.type === 'quote') {
          return (
            <Paper key={key} variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
              <Typography sx={{ lineHeight: 1.85 }}>
                {renderInline(block.text, key)}
              </Typography>
            </Paper>
          );
        }

        if (block.type === 'code') {
          return (
            <Stack key={key} spacing={1}>
              {block.language ? (
                <Typography variant="caption" color="text.secondary">
                  {block.language}
                </Typography>
              ) : null}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  overflowX: 'auto',
                  borderRadius: 3,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                }}
              >
                <Box component="code">{block.code}</Box>
              </Box>
            </Stack>
          );
        }

        if (block.type === 'image') {
          return (
            <Stack key={key} spacing={1}>
              <Box
                component="img"
                src={block.url}
                alt={block.alt || 'Embedded visual'}
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              {block.alt ? (
                <Typography variant="caption" color="text.secondary">
                  {block.alt}
                </Typography>
              ) : null}
            </Stack>
          );
        }

        if (block.type === 'embed') {
          return renderEmbedBlock(block, key);
        }

        return (
          <Box key={key} sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
        );
      })}
    </Stack>
  );
};

export default MarkdownRenderer;
