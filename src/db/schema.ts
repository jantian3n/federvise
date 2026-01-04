export const schema = `
-- 用户表（单用户，但保留扩展性）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  summary TEXT,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 关注者表
CREATE TABLE IF NOT EXISTS followers (
  id INTEGER PRIMARY KEY,
  actor_id TEXT NOT NULL UNIQUE,
  inbox TEXT NOT NULL,
  shared_inbox TEXT,
  accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表（记录已发布到 Fediverse 的文章）
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  activity_id TEXT UNIQUE,
  object_id TEXT UNIQUE,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  federated_at DATETIME
);

-- Activity 日志
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  object TEXT,
  raw TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 站点配置（替代 .env）
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 用户凭证（登录认证）
CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- 会话管理
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_followers_shared_inbox ON followers(shared_inbox);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;
