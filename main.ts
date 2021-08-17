import * as CodeMirror from 'codemirror';
import { App, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, CachedMetadata, FileSystemAdapter } from 'obsidian';
import { readdirSync, statSync } from "fs";
import * as path from 'path';

type GetSettings = (
  data: CachedMetadata,
  cursor: CodeMirror.Position
) => TocNotePluginSettings;
interface TocNotePluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: TocNotePluginSettings = {
  mySetting: 'default'
}

export default class TocNotePlugin extends Plugin {
  public settings: TocNotePluginSettings = DEFAULT_SETTINGS;

  async onload() {
    console.log('loading plugin');

    await this.loadSettings();

    // コマンド
    this.addCommand({
      id: 'add-toc-notes',
      name: 'Create table of contents page',
      callback: this.createTocForActiveFile(),
    });

    // 設定内容
    // this.addSettingTab(new TocNotePluginSettingTab(this.app, this));
  }

  private createTocForActiveFile = (
    settings: TocNotePluginSettings | GetSettings = this.settings
  ) => () => {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (activeView && activeView.file) {
      const cursor = activeView.editor.getCursor();
      const data = this.app.metadataCache.getFileCache(activeView.file) || {};
      const activeFile = activeView.file;
      const relativePath = activeFile.parent.path;
      if (this.app.vault.adapter instanceof FileSystemAdapter) {
        var absolutePath = path.join(this.app.vault.adapter.getBasePath(), relativePath);
      } else {
        var absolutePath = path.join(this.app.vault.getResourcePath(activeFile), relativePath);
      }
      console.log(absolutePath);

      var toc = "";
      var c = 1;
      const arr = this.getMarkdownFileList(absolutePath);
      arr.forEach(v => {
        toc += c + ". " + "[[" + v.name + "]]" + "\n";
        c++;
      });

      if (toc) {
        activeView.editor.replaceRange(toc, cursor);
      }
    }
  };

  private getMarkdownFileList(dirPath: string) {
    let fileList = readdirSync(dirPath, {
      withFileTypes: true,
    })
      .filter(dirent => dirent.isFile())
      .filter(dirent => dirent.name.endsWith(".md"))
      .map(dirent => {
        return {
          name: dirent.name,
          ctime: statSync(path.join(dirPath, dirent.name)).ctime,
          mtime: statSync(path.join(dirPath, dirent.name)).mtime,
        }
      });
    // ソートして返却
    // fileList.sort((a, b) => b.mtime.getMilliseconds() - a.mtime.getMilliseconds());
    fileList.sort((a, b) => b.ctime.getTime() - a.ctime.getTime());

    return fileList;
  }

  onunload() {
    console.log('unloading plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class TocNotePluginSettingTab extends PluginSettingTab {
  plugin: TocNotePlugin;

  constructor(app: App, plugin: TocNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: '目次ノートを作成 - Settings' });

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue('')
        .onChange(async (value) => {
          console.log('Secret: ' + value);
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
