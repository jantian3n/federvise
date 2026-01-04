/**
 * 快捷发布组件
 */
import type { FC } from 'hono/jsx';

export const QuickPublish: FC = () => {
  return (
    <div style="background: var(--border); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
      <form method="post" action="/api/notes" style="display: flex; flex-direction: column; gap: 1rem;">
        <input
          type="text"
          name="title"
          placeholder="Title (optional - leave empty for a quick note)"
          maxLength={100}
          style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text); font-family: inherit;"
        />
        <textarea
          name="content"
          placeholder="What's on your mind?"
          maxLength={500}
          required
          rows={3}
          style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; resize: vertical; background: var(--bg); color: var(--text); font-family: inherit;"
        />
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <small style="color: var(--text-secondary);">With title → Article | Without title → Note</small>
          <button
            type="submit"
            style="background: var(--accent); color: white; padding: 0.5rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;"
          >
            Publish
          </button>
        </div>
      </form>
    </div>
  );
};
