# Federvise

A single-user ActivityPub-enabled blog. Write in Markdown, publish to the Fediverse.

## Features

- **Markdown-based content** with YAML frontmatter support
- **ActivityPub federation** compatible with Mastodon, Misskey, Pleroma, etc.
- **Web admin interface** for managing and publishing posts
- **REST API** for programmatic access
- **Obsidian plugin** for writing and publishing from Obsidian
- **RSS/JSON Feed** for traditional subscribers
- **Dark mode** following system preference

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jantian3n/federvise.git
cd federvise

# Install dependencies
npm install

# Initialize database (generates RSA keys)
npm run db:init

# Start development server
npm run dev

# Visit http://localhost:3000
```

## Configuration

Create a `.env` file or set environment variables:

```bash
DOMAIN=yourdomain.com           # Your domain (required)
USERNAME=blog                    # ActivityPub username
DISPLAY_NAME="My Blog"           # Display name
SUMMARY="A personal blog"        # Bio/description
ADMIN_PASSWORD=your-secret       # Password for admin and API
PORT=3000                        # Server port (default: 3000)
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

## Publishing

### Option 1: Web Admin Interface

Visit `https://yourdomain.com/admin`

- Username: `admin`
- Password: your `ADMIN_PASSWORD`

From here you can view all posts and publish with one click.

### Option 2: Command Line

```bash
# List all posts and their status
npm run publish

# Publish a specific post
npm run publish hello-world

# Publish all unpublished posts
npm run publish --all
```

### Option 3: REST API

```bash
# List posts
curl -H "Authorization: Bearer YOUR_PASSWORD" \
  https://yourdomain.com/api/posts

# Create and publish a post
curl -X POST -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-post", "content": "---\ntitle: My Post\ndate: 2026-01-03\n---\n\nHello!", "publish": true}' \
  https://yourdomain.com/api/posts

# Publish an existing post
curl -X POST -H "Authorization: Bearer YOUR_PASSWORD" \
  https://yourdomain.com/api/posts/my-post/publish
```

### Option 4: Obsidian Plugin

See [obsidian-plugin/README.md](obsidian-plugin/README.md) for installation and usage.

## Following This Blog

From Mastodon or any Fediverse app, search for:

```
@blog@yourdomain.com
```

Then click Follow. New posts will appear in your timeline.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Blog homepage |
| `/posts/:slug` | Post page |
| `/feed.xml` | RSS feed |
| `/feed.json` | JSON feed |
| `/admin` | Admin interface (Basic Auth) |
| `/api/posts` | API: List/create posts (Bearer Auth) |
| `/api/posts/:slug/publish` | API: Publish post |
| `/.well-known/webfinger` | WebFinger discovery |
| `/users/:username` | ActivityPub Actor |
| `/users/:username/outbox` | ActivityPub Outbox |
| `/inbox` | Shared inbox |

## Production Deployment

See [DEPLOY.md](DEPLOY.md) for detailed Linux VPS deployment instructions.

Quick overview:

```bash
# Build for production
npm run build

# Start with systemd (recommended)
sudo cp federvise.service /etc/systemd/system/
sudo systemctl enable federvise
sudo systemctl start federvise
```

Requirements:
- Node.js 20+
- HTTPS (required for ActivityPub)
- Reverse proxy (Nginx Proxy Manager, Caddy, etc.)

## Documentation

- [DEPLOY.md](DEPLOY.md) - Linux VPS deployment guide
- [README.zh-CN.md](README.zh-CN.md) - Chinese documentation

## License

MIT
