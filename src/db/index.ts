import initSqlJs, { Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/blog.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) {
    console.log('[DB] Returning cached database instance');
    return db;
  }

  console.log('[DB] Creating new database instance');
  console.log('[DB] Database path:', dbPath);
  console.log('[DB] Database file exists:', fs.existsSync(dbPath));

  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    console.log('[DB] Loading existing database from file');
    const buffer = fs.readFileSync(dbPath);
    console.log('[DB] Database file size:', buffer.length, 'bytes');
    db = new SQL.Database(buffer);
  } else {
    console.log('[DB] Creating new in-memory database');
    db = new SQL.Database();
  }

  return db;
}

export function saveDb(): void {
  if (!db) return;

  const data = db.export();
  const buffer = Buffer.from(data);

  // 确保目录存在
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(dbPath, buffer);
}

// 在进程退出时保存
process.on('exit', saveDb);
process.on('SIGINT', () => {
  saveDb();
  process.exit();
});
