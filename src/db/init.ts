import { getDb, saveDb } from './index.js';
import { schema } from './schema.js';
import { generateKeyPair } from '../services/crypto.js';
import { config } from '../config.js';

export async function initDatabase() {
  console.log('Initializing database...');

  const db = await getDb();

  // 执行 schema
  db.run(schema);
  console.log('Schema created.');

  // 检查是否已有用户
  const result = db.exec(`SELECT id FROM users WHERE username = '${config.username}'`);
  const existingUser = result.length > 0 && result[0].values.length > 0;

  if (!existingUser) {
    console.log('Generating RSA key pair...');
    const { publicKey, privateKey } = await generateKeyPair();

    db.run(`
      INSERT INTO users (username, display_name, summary, public_key, private_key)
      VALUES (?, ?, ?, ?, ?)
    `, [
      config.username,
      config.displayName,
      config.summary,
      publicKey,
      privateKey
    ]);

    console.log(`User "${config.username}" created with new key pair.`);
  } else {
    console.log(`User "${config.username}" already exists.`);
  }

  saveDb();
  console.log('Database initialization complete.');
}

// 直接运行时执行初始化
initDatabase().catch(console.error);
