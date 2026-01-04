import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, '../../content');

export interface Post {
  slug: string;
  title: string;
  date: Date;
  tags: string[];
  content: string;      // 原始 Markdown
  html: string;         // 渲染后的 HTML
  excerpt: string;      // 摘要（前 200 字符）
}

export interface PostMeta {
  slug: string;
  title: string;
  date: Date;
  tags: string[];
  excerpt: string;
}

function extractExcerpt(content: string, maxLength = 200): string {
  // 移除 Markdown 语法，提取纯文本
  const text = content
    .replace(/^#{1,6}\s+/gm, '')     // 标题
    .replace(/\*\*|__/g, '')          // 粗体
    .replace(/\*|_/g, '')             // 斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // 代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/\n+/g, ' ')             // 换行
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function getPost(slug: string): Post | null {
  const filePath = path.join(contentDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    slug,
    title: data.title || slug,
    date: data.date ? new Date(data.date) : new Date(),
    tags: data.tags || [],
    content,
    html: marked(content) as string,
    excerpt: extractExcerpt(content),
  };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const post = getPost(slug);
    if (!post) return null;

    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      tags: post.tags,
      excerpt: post.excerpt,
    };
  }).filter((p): p is PostMeta => p !== null);

  // 按日期倒序排列，日期相同时按 slug 倒序（确保排序稳定）
  return posts.sort((a, b) => {
    const dateDiff = b.date.getTime() - a.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    // 日期相同时，按 slug 倒序（新的 slug 如 note-20260104... 排在前面）
    return b.slug.localeCompare(a.slug);
  });
}
