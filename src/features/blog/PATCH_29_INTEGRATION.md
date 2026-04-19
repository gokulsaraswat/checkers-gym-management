# Patch 29 Integration Notes

## Scope

Patch 29 adds the blog system track without mixing it into hardware/access work:

- public blog listing page
- public blog article page
- staff blog drafting and review submission workspace
- admin blog moderation and publishing workspace
- markdown rendering with hosted video and safe social link embeds
- search, featured post support, and approval states

## Routes added

- `/blog`
- `/blog/:slug`
- `/staff/blog`
- `/admin/blog`

## Frontend files added

- `src/features/blog/blogHelpers.js`
- `src/features/blog/blogClient.js`
- `src/features/blog/MarkdownRenderer.js`
- `src/features/blog/BlogStatusChip.js`
- `src/features/blog/BlogEditorForm.js`
- `src/features/blog/BlogPage.js`
- `src/features/blog/BlogPostPage.js`
- `src/features/blog/StaffBlogEditorPage.js`
- `src/features/blog/AdminBlogManagementPage.js`

## Database migration

Apply:

- `supabase/migrations/20260407002900_blog_system.sql`

This migration creates `public.blog_posts`, indexes, and RLS policies for:

- public read access to published posts
- staff insert/update access for their own drafts and submissions
- admin moderation and publish controls

## Markdown and embeds

Supported content patterns include:

- headings
- paragraphs
- bullet and numbered lists
- blockquotes
- fenced code blocks
- images using standard markdown image syntax
- links
- embed blocks using:

```md
@[embed](https://www.youtube.com/watch?v=...)
```

Hosted video links (YouTube, Vimeo, Loom) render inline.
Social links (X/Twitter, Instagram, TikTok, Facebook) render as safe external cards in this patch.

## Notes

- `blogClient.js` uses Supabase when available.
- If Supabase is not configured yet, the workspace falls back to seeded local browser storage so the UI can still be previewed.
- Navbar, footer, staff home, and admin home include blog entry points.
