import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, requestUrl } from 'obsidian';

interface FederviseSettings {
  apiUrl: string;
  apiToken: string;
  autoPublish: boolean;
}

const DEFAULT_SETTINGS: FederviseSettings = {
  apiUrl: '',
  apiToken: '',
  autoPublish: false,
};

export default class FedervisePlugin extends Plugin {
  settings: FederviseSettings;

  async onload() {
    await this.loadSettings();

    // 添加发布命令
    this.addCommand({
      id: 'publish-to-federvise',
      name: 'Publish current note to Federvise',
      callback: () => this.publishCurrentNote(true),
    });

    // 添加保存命令（不发布到 Fediverse）
    this.addCommand({
      id: 'save-to-federvise',
      name: 'Save current note to Federvise (without publishing)',
      callback: () => this.publishCurrentNote(false),
    });

    // 添加设置页面
    this.addSettingTab(new FederviseSettingTab(this.app, this));

    // 添加右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Publish to Federvise')
              .setIcon('upload')
              .onClick(() => this.publishFile(file, true));
          });
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async publishCurrentNote(publish: boolean) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('No active file');
      return;
    }

    if (file.extension !== 'md') {
      new Notice('Current file is not a markdown file');
      return;
    }

    await this.publishFile(file, publish);
  }

  async publishFile(file: TFile, publish: boolean) {
    if (!this.settings.apiUrl || !this.settings.apiToken) {
      new Notice('Please configure Federvise settings first');
      return;
    }

    try {
      const content = await this.app.vault.read(file);

      // 使用文件名（不含扩展名）作为 slug
      const slug = file.basename.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

      new Notice(`${publish ? 'Publishing' : 'Saving'}: ${file.basename}...`);

      const response = await requestUrl({
        url: `${this.settings.apiUrl}/api/posts`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          content,
          publish,
        }),
      });

      const result = response.json;

      if (result.success) {
        if (publish && result.published) {
          new Notice(`Published: ${file.basename}`);
        } else if (publish && !result.published) {
          new Notice(`Saved but publish failed: ${result.message}`);
        } else {
          new Notice(`Saved: ${file.basename}`);
        }
      } else {
        new Notice(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Federvise publish error:', error);
      new Notice(`Failed to publish: ${error.message}`);
    }
  }
}

class FederviseSettingTab extends PluginSettingTab {
  plugin: FedervisePlugin;

  constructor(app: App, plugin: FedervisePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Federvise Settings' });

    new Setting(containerEl)
      .setName('API URL')
      .setDesc('Your Federvise blog URL (e.g., https://blog.example.com)')
      .addText((text) =>
        text
          .setPlaceholder('https://blog.example.com')
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.replace(/\/$/, ''); // Remove trailing slash
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('API Token')
      .setDesc('Your ADMIN_PASSWORD from Federvise')
      .addText((text) =>
        text
          .setPlaceholder('Your admin password')
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl('h3', { text: 'Usage' });
    containerEl.createEl('p', { text: 'Use the command palette (Ctrl/Cmd + P) and search for:' });
    containerEl.createEl('ul').innerHTML = `
      <li><strong>Publish current note to Federvise</strong> - Save and publish to Fediverse</li>
      <li><strong>Save current note to Federvise</strong> - Save only (no federation)</li>
    `;
    containerEl.createEl('p', { text: 'Or right-click a markdown file and select "Publish to Federvise".' });

    containerEl.createEl('h3', { text: 'Note Format' });
    containerEl.createEl('p', {
      text: 'Your note should have YAML frontmatter:'
    });
    containerEl.createEl('pre').innerHTML = `---
title: My Post Title
date: 2026-01-03
tags: [blog, test]
---

Your content here...`;
  }
}
