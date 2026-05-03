import { Notice, TFolder, normalizePath } from 'obsidian';
import { IAlchemistModule, AlchemistContext } from '../../core/IAlchemistModule';
import { AlchemistSettings } from '../../settings';
import { escapeCsvCell } from './logic';

interface ObsidianAppWithPlugins {
    plugins: {
        enabledPlugins: Set<string>;
    };
}

export class DataviewModule implements IAlchemistModule {
    public id = 'dataview-export';
    private context!: AlchemistContext;
    private observer: MutationObserver | null = null;
    private injectTimeout: number | null = null;

    async load(context: AlchemistContext): Promise<void> {
        this.context = context;
        this.setupGlobalObserver();
        this.start();
    }

    async unload(): Promise<void> {
        this.stop();
    }

    async onSettingsChange(newSettings: AlchemistSettings): Promise<void> {
        const wasEnabled = this.context.settings.enableDataviewExport;
        this.context.settings = newSettings;
        
        if (wasEnabled !== newSettings.enableDataviewExport) {
            if (newSettings.enableDataviewExport) this.start();
            else this.stop();
        }
    }

    private setupGlobalObserver() {
        this.observer = new MutationObserver(() => {
            if (!this.context.settings.enableDataviewExport) return;
            
            if (this.injectTimeout) activeWindow.clearTimeout(this.injectTimeout);
            this.injectTimeout = activeWindow.setTimeout(() => {
                this.injectAll();
            }, 300);
        });
    }

    private start() {
        if (this.context.settings.enableDataviewExport && this.observer) {
            this.observer.observe(activeDocument.body, { childList: true, subtree: true });
            this.injectAll();
        }
    }

    private stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.injectTimeout) activeWindow.clearTimeout(this.injectTimeout);
        activeDocument.querySelectorAll('.alchemist-export-btn').forEach(btn => btn.remove());
    }

    private injectAll() {
        const app = this.context.app as unknown as ObsidianAppWithPlugins;
        const isDataviewEnabled = app.plugins?.enabledPlugins?.has('dataview');
        if (!isDataviewEnabled) return;

        const containers = activeDocument.querySelectorAll('.block-language-dataview, .dataview.table-view-table, .dataview-container');
        containers.forEach(c => this.injectButton(c as HTMLElement));
    }

    private injectButton(container: HTMLElement) {
        if (container.querySelector('.alchemist-export-btn')) return;
        if (!container.querySelector('table') && !container.classList.contains('block-language-dataview')) return;

        const btn = createEl('button');
        btn.className = 'alchemist-export-btn clickable-icon';
        btn.innerText = '💾 CSV';
        
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            void this.exportTable(container);
        };

        container.appendChild(btn);
        if (getComputedStyle(container).position === 'static') {
            container.classList.add('alchemist-relative-container');
        }
    }

    private async exportTable(el: HTMLElement) {
        const table = el.querySelector('table');
        if (!table) {
            new Notice('No table found to export');
            return;
        }

        const rows = Array.from(table.querySelectorAll('tr'));
        const csvRows = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => escapeCsvCell((cell as HTMLElement).innerText)).join(',');
        });

        const sourceFile = this.context.app.workspace.getActiveFile();
        csvRows.push(''); // Empty row separation
        csvRows.push(`"Source","[[${sourceFile?.path || 'unknown'}]]"`);
        csvRows.push(`"Exported","${new Date().toLocaleString()}"`);
        
        await this.handleSave(csvRows.join('\n'));
    }

    private async handleSave(content: string) {
        const settings = this.context.settings;
        
        if (settings.dataviewExportStrategy === 'vault') {
            const folderPath = normalizePath(settings.dataviewVaultPath || 'Exports');
            await this.ensureFolder(folderPath);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `dataview_export_${timestamp}.csv`;
            const fullPath = `${folderPath}/${fileName}`;
            
            await this.context.app.vault.create(fullPath, content);
            new Notice(`CSV saved to vault: ${fullPath}`);
        } else {
            const result = await this.context.system.showSaveDialog({
                title: 'Export dataview to CSV',
                defaultPath: this.context.system.path.join(this.context.settings.lastDialogPath, 'dataview_export.csv'),
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });

            if (!result.canceled && result.filePath) {
                this.context.settings.lastDialogPath = this.context.system.path.dirname(result.filePath);
                await this.context.plugin.saveSettings();
                this.context.system.fs.writeFileSync(result.filePath, content);
                new Notice('CSV exported successfully');
            }
        }
    }

    private async ensureFolder(path: string) {
        const folder = this.context.app.vault.getAbstractFileByPath(path);
        if (folder instanceof TFolder) return;
        
        await this.context.app.vault.createFolder(path);
    }
}
