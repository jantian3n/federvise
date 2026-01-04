import type { FC, PropsWithChildren } from 'hono/jsx';
import { config } from '../config.js';

export const Layout: FC<PropsWithChildren<{ title?: string; isLoggedIn?: boolean }>> = ({ title, children, isLoggedIn }) => {
  const pageTitle = title ? `${title} - ${config.displayName}` : config.displayName;

  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml" />
        <style>{`
          :root {
            --bg: #fafafa;
            --text: #333;
            --text-secondary: #666;
            --border: #eee;
            --accent: #0066cc;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #1a1a1a;
              --text: #e0e0e0;
              --text-secondary: #999;
              --border: #333;
              --accent: #66b3ff;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
            max-width: 720px;
            margin: 0 auto;
            padding: 2rem 1rem;
          }
          a { color: var(--accent); text-decoration: none; }
          a:hover { text-decoration: underline; }
          header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
          header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
          header p { color: var(--text-secondary); font-size: 0.9rem; }
          nav { margin-top: 0.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
          .nav-right { margin-left: auto; }
          main { min-height: 60vh; }
          footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: 0.85rem; }
          article { margin-bottom: 2rem; }
          article h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
          article time { color: var(--text-secondary); font-size: 0.85rem; }
          .post-content { margin-top: 1.5rem; }
          .post-content h1, .post-content h2, .post-content h3 { margin: 1.5rem 0 0.75rem; }
          .post-content p { margin-bottom: 1rem; }
          .post-content pre { background: var(--border); padding: 1rem; overflow-x: auto; border-radius: 4px; }
          .post-content code { font-family: "SF Mono", Monaco, monospace; font-size: 0.9em; }
          .post-content ul, .post-content ol { margin: 1rem 0; padding-left: 1.5rem; }
          .tags { margin-top: 0.5rem; }
          .tag { display: inline-block; background: var(--border); padding: 0.1rem 0.5rem; border-radius: 3px; font-size: 0.8rem; margin-right: 0.5rem; }
          .fediverse-info { background: var(--border); padding: 1rem; border-radius: 4px; margin-top: 1rem; font-size: 0.9rem; }
        `}</style>
      </head>
      <body>
        <header>
          <h1><a href="/">{config.displayName}</a></h1>
          <p>{config.summary}</p>
          <nav>
            <a href="/">Home</a>
            <a href="/feed.xml">RSS</a>
            {isLoggedIn && <a href="/admin">Admin</a>}
            <span class="nav-right">
              {isLoggedIn ? (
                <a href="/logout">Logout</a>
              ) : (
                <a href="/login">Login</a>
              )}
            </span>
          </nav>
        </header>
        <main>
          {children}
        </main>
        <footer>
          <p>Powered by <a href="https://github.com/anthropics/claude-code">Federvise</a> | Follow on Fediverse: @{config.username}@{config.domain}</p>
        </footer>
      </body>
    </html>
  );
};
