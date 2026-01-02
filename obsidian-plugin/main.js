var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FedervisePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiUrl: "",
  apiToken: "",
  autoPublish: false
};
var FedervisePlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "publish-to-federvise",
      name: "Publish current note to Federvise",
      callback: () => this.publishCurrentNote(true)
    });
    this.addCommand({
      id: "save-to-federvise",
      name: "Save current note to Federvise (without publishing)",
      callback: () => this.publishCurrentNote(false)
    });
    this.addSettingTab(new FederviseSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian.TFile && file.extension === "md") {
          menu.addItem((item) => {
            item.setTitle("Publish to Federvise").setIcon("upload").onClick(() => this.publishFile(file, true));
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
  async publishCurrentNote(publish) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active file");
      return;
    }
    if (file.extension !== "md") {
      new import_obsidian.Notice("Current file is not a markdown file");
      return;
    }
    await this.publishFile(file, publish);
  }
  async publishFile(file, publish) {
    if (!this.settings.apiUrl || !this.settings.apiToken) {
      new import_obsidian.Notice("Please configure Federvise settings first");
      return;
    }
    try {
      const content = await this.app.vault.read(file);
      const slug = file.basename.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
      new import_obsidian.Notice(`${publish ? "Publishing" : "Saving"}: ${file.basename}...`);
      const response = await (0, import_obsidian.requestUrl)({
        url: `${this.settings.apiUrl}/api/posts`,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.settings.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          slug,
          content,
          publish
        })
      });
      const result = response.json;
      if (result.success) {
        if (publish && result.published) {
          new import_obsidian.Notice(`Published: ${file.basename}`);
        } else if (publish && !result.published) {
          new import_obsidian.Notice(`Saved but publish failed: ${result.message}`);
        } else {
          new import_obsidian.Notice(`Saved: ${file.basename}`);
        }
      } else {
        new import_obsidian.Notice(`Error: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Federvise publish error:", error);
      new import_obsidian.Notice(`Failed to publish: ${error.message}`);
    }
  }
};
var FederviseSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Federvise Settings" });
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("Your Federvise blog URL (e.g., https://blog.example.com)").addText(
      (text) => text.setPlaceholder("https://blog.example.com").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
        this.plugin.settings.apiUrl = value.replace(/\/$/, "");
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("API Token").setDesc("Your ADMIN_PASSWORD from Federvise").addText(
      (text) => text.setPlaceholder("Your admin password").setValue(this.plugin.settings.apiToken).onChange(async (value) => {
        this.plugin.settings.apiToken = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Usage" });
    containerEl.createEl("p", { text: "Use the command palette (Ctrl/Cmd + P) and search for:" });
    containerEl.createEl("ul").innerHTML = `
      <li><strong>Publish current note to Federvise</strong> - Save and publish to Fediverse</li>
      <li><strong>Save current note to Federvise</strong> - Save only (no federation)</li>
    `;
    containerEl.createEl("p", { text: 'Or right-click a markdown file and select "Publish to Federvise".' });
    containerEl.createEl("h3", { text: "Note Format" });
    containerEl.createEl("p", {
      text: "Your note should have YAML frontmatter:"
    });
    containerEl.createEl("pre").innerHTML = `---
title: My Post Title
date: 2026-01-03
tags: [blog, test]
---

Your content here...`;
  }
};
