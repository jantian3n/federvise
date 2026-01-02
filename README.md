# Federvise

A single-user ActivityPub-enabled blog. Write in Markdown, publish to the Fediverse.

## Features

- Markdown-based content with frontmatter support
- ActivityPub federation (compatible with Mastodon, Misskey, etc.)
- RSS/JSON Feed
- Dark mode support
- Minimal dependencies

## Setup

```bash
# Install dependencies
npm install

# Initialize database (generates RSA keys)
npm run db:init

# Start development server
npm run dev
```

## Configuration

Set environment variables before starting:

```bash
export DOMAIN=yourdomain.com      # Your domain (required for federation)
export USERNAME=blog              # ActivityPub username
export DISPLAY_NAME="My Blog"     # Display name
export SUMMARY="A personal blog"  # Bio/description
export PORT=3000                  # Server port (default: 3000)
```

## Writing Posts

Add Markdown files to the `content/` directory:

```markdown
---
title: My First Post
date: 2026-01-02
tags: [blog, activitypub]
---

Your content here. Supports **bold**, *italic*, `code`, and more.
```

## Publishing to Fediverse

```bash
# List all posts and their publish status
npm run publish

# Publish a specific post
npm run publish hello-world

# Publish all unpublished posts
npm run publish --all
```

Once published, followers on Mastodon/Misskey will see your post in their timeline.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Blog homepage |
| `/posts/:slug` | Post page |
| `/feed.xml` | RSS feed |
| `/feed.json` | JSON feed |
| `/.well-known/webfinger` | WebFinger discovery |
| `/users/:username` | ActivityPub Actor |
| `/inbox` | Shared inbox |

## Following This Blog

From Mastodon or any Fediverse app, search for:

```
@blog@yourdomain.com
```

Then click Follow. New posts will appear in your timeline.

## Production Deployment

1. Set up HTTPS (required for ActivityPub)
2. Configure environment variables
3. Run with a process manager:

```bash
npm run build
npm start
```

Consider using a reverse proxy (nginx/caddy) for SSL termination.

## License

MIT
