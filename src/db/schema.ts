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

-- 索引
CREATE INDEX IF NOT EXISTS idx_followers_shared_inbox ON followers(shared_inbox);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
`;
