create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  cover_image_url text,
  content_markdown text not null default '',
  tags text[] not null default array[]::text[],
  author_user_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Checkers Gym Team',
  author_role text not null default 'staff',
  status text not null default 'draft',
  review_notes text,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid references public.profiles(id) on delete set null,
  published_at timestamp with time zone,
  is_featured boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint blog_posts_author_role_check check (author_role in ('staff', 'admin')),
  constraint blog_posts_status_check check (status in ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'))
);

create index if not exists blog_posts_status_published_at_idx
  on public.blog_posts (status, published_at desc);

create index if not exists blog_posts_author_user_id_updated_at_idx
  on public.blog_posts (author_user_id, updated_at desc);

create index if not exists blog_posts_featured_published_at_idx
  on public.blog_posts (is_featured, published_at desc);

create index if not exists blog_posts_tags_gin_idx
  on public.blog_posts using gin (tags);

create index if not exists blog_posts_search_idx
  on public.blog_posts using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content_markdown, '')
    )
  );

drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
before update on public.blog_posts
for each row
execute function public.touch_access_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts
for select
using (
  status = 'published'
  and published_at is not null
);

drop policy if exists "Staff can read own or published blog posts" on public.blog_posts;
create policy "Staff can read own or published blog posts"
on public.blog_posts
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_staff()
    and author_user_id = auth.uid()
  )
  or (
    status = 'published'
    and published_at is not null
  )
);

drop policy if exists "Staff can insert their own blog drafts" on public.blog_posts;
create policy "Staff can insert their own blog drafts"
on public.blog_posts
for insert
to authenticated
with check (
  public.is_staff()
  and author_user_id = auth.uid()
);

drop policy if exists "Admin or author can update blog posts" on public.blog_posts;
create policy "Admin or author can update blog posts"
on public.blog_posts
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_staff()
    and author_user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or (
    public.is_staff()
    and author_user_id = auth.uid()
    and status in ('draft', 'pending_review', 'rejected', 'archived')
  )
);

drop policy if exists "Admin or author can delete draft blog posts" on public.blog_posts;
create policy "Admin or author can delete draft blog posts"
on public.blog_posts
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_staff()
    and author_user_id = auth.uid()
    and status in ('draft', 'rejected', 'archived')
  )
);
