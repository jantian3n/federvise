#!/usr/bin/env tsx
/**
 * 发布文章到 Fediverse
 *
 * 用法:
 *   npm run publish              # 列出未发布的文章
 *   npm run publish hello-world  # 发布指定文章
 *   npm run publish --all        # 发布所有未发布的文章
 */

import { publishPost, getUnpublishedPosts } from './services/publish.js';
import { getAllPosts } from './services/markdown.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 列出所有文章及其状态
    console.log('\n📝 Available posts:\n');

    const allPosts = getAllPosts();
    const unpublished = await getUnpublishedPosts();

    for (const post of allPosts) {
      const status = unpublished.includes(post.slug) ? '[ ]' : '[✓]';
      console.log(`  ${status} ${post.slug}`);
      console.log(`      "${post.title}" (${post.date.toISOString().split('T')[0]})`);
    }

    if (unpublished.length > 0) {
      console.log(`\n💡 Run 'npm run publish <slug>' to publish a post`);
      console.log(`   Run 'npm run publish --all' to publish all unpublished posts\n`);
    } else {
      console.log('\n✨ All posts have been published!\n');
    }

    return;
  }

  if (args[0] === '--all') {
    // 发布所有未发布的文章
    const unpublished = await getUnpublishedPosts();

    if (unpublished.length === 0) {
      console.log('\n✨ No unpublished posts found.\n');
      return;
    }

    console.log(`\n📤 Publishing ${unpublished.length} post(s)...\n`);

    for (const slug of unpublished) {
      console.log(`Publishing: ${slug}`);
      const result = await publishPost(slug);
      console.log(`  → ${result.message}\n`);
    }

    console.log('✅ Done!\n');
    return;
  }

  // 发布指定文章
  const slug = args[0];
  console.log(`\n📤 Publishing: ${slug}\n`);

  const result = await publishPost(slug);

  if (result.success) {
    console.log(`✅ ${result.message}\n`);
  } else {
    console.log(`❌ ${result.message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
