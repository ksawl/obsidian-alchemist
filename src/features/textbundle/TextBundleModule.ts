import { TFile, TFolder, Notice, Menu, TAbstractFile, MenuItem } from 'obsidian';
import { IAlchemistModule, AlchemistContext } from '../../core/IAlchemistModule';
import { AlchemistSettings } from '../../settings';
import { TextBundleFeature } from './collector';
import { TextBundlePacker } from './packer';
import { TextBundleImporter } from './importer';

export class TextBundleModule implements IAlchemistModule {
    public id = 'textbundle';
    private context!: AlchemistContext;
    
    private collector!: TextBundleFeature;
    private packer!: TextBundlePacker;
    private importer!: TextBundleImporter;

    async load(context: AlchemistContext): Promise<void> {
        this.context = context;
        this.collector = new TextBundleFeature(context.app, context.settings);
        this.packer = new TextBundlePacker(context.app);
        this.importer = new TextBundleImporter(context.app, context.settings, context.system);

        this.registerCommands();
        this.registerEvents();
        this.registerRibbonIcons();
    }

    async unload(): Promise<void> {
        // Clean up if necessary
    }

    async onSettingsChange(newSettings: AlchemistSettings): Promise<void> {
        this.context.settings = newSettings;
    }

    private registerRibbonIcons() {
        this.context.plugin.addRibbonIcon('package-plus', 'Import textbundle', () => {
            if (!this.context.settings.enableTextBundle) {
                new Notice('Textbundle module is disabled in settings.');
                return;
            }
            void this.runImport();
        });
    }

    private registerCommands() {
        this.context.plugin.addCommand({
            id: 'import-textbundle',
            name: 'Import textbundle',
            callback: () => {
                if (!this.context.settings.enableTextBundle) return;
                void this.runImport();
            }
        });

        this.context.plugin.addCommand({
            id: 'export-current-textbundle',
            name: 'Export current file as textbundle',
            checkCallback: (checking: boolean) => {
                if (!this.context.settings.enableTextBundle) return false;
                const activeFile = this.context.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        void this.runExport(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });
    }

    private registerEvents() {
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('file-menu', (menu: Menu, abstractFile: TAbstractFile) => {
                if (!this.context.settings.enableTextBundle) return;

                if (abstractFile instanceof TFile && abstractFile.extension === 'md') {
                    menu.addItem((item: MenuItem) => {
                        item
                            .setTitle('Export as textbundle')
                            .setIcon('package')
                            .onClick(() => {
                                void this.runExport(abstractFile);
                            });
                    });
                } else if (abstractFile instanceof TFolder) {
                    menu.addItem((item: MenuItem) => {
                        item
                            .setTitle('Export folder as textbundle')
                            .setIcon('package')
                            .onClick(async () => {
                                const files: TFile[] = [];
                                const collect = (f: TAbstractFile) => {
                                    if (f instanceof TFile && f.extension === 'md') files.push(f);
                                    else if (f instanceof TFolder) f.children.forEach(collect);
                                };
                                collect(abstractFile);
                                
                                if (files.length === 0) {
                                    new Notice('No Markdown files found in this folder.');
                                    return;
                                }

                                // Bulk Export Strategy: Ask for a folder once
                                const result = await this.context.system.showOpenDialog({
                                    title: 'Select destination for bulk export',
                                    defaultPath: this.context.settings.lastDialogPath,
                                    properties: ['openDirectory', 'createDirectory']
                                });

                                if (!result.canceled && result.filePaths.length > 0) {
                                    const targetDir = result.filePaths[0];
                                    this.context.settings.lastDialogPath = targetDir;
                                    await this.context.plugin.saveSettings();

                                    new Notice(`Bulk exporting ${files.length} notes...`);
                                    let successCount = 0;
                                    for (const f of files) {
                                        try {
                                            const context = await this.collector.collectResources(f);
                                            const blob = await this.packer.pack(context);
                                            const extension = this.context.settings.compressionFormat || 'textbundle';
                                            const fullPath = this.context.system.path.join(targetDir, `${f.basename}.${extension}`);
                                            
                                            this.context.system.fs.writeFileSync(fullPath, new Uint8Array(blob));
                                            successCount++;
                                        } catch (e) {
                                            console.error(`Export failed for ${f.name}:`, e);
                                        }
                                    }
                                    new Notice(`Successfully exported ${successCount}/${files.length} notes to ${targetDir}`);
                                }
                            });
                    });

                    menu.addItem((item: MenuItem) => {
                        item
                            .setTitle('Import into here')
                            .setIcon('package-plus')
                            .onClick(() => {
                                void this.runImport(abstractFile.path);
                            });
                    });
                }
            })
        );
    }

    private async runImport(targetPath?: string) {
        const result = await this.context.system.showOpenDialog({
            title: targetPath ? `Import into ${targetPath}` : 'Import textbundle',
            defaultPath: this.context.settings.lastDialogPath,
            filters: [{ name: 'Textbundle', extensions: ['textbundle', 'zip', 'textpack'] }],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            this.context.settings.lastDialogPath = this.context.system.path.dirname(filePath);
            await this.context.plugin.saveSettings();
            const sourceName = filePath.split(/[\\/]/).pop()?.replace(/\.(zip|textpack|textbundle)$/i, '') || 'Imported_Note';
            
            try {
                const data = this.context.system.fs.readFileSync(filePath);
                // Convert Node Buffer to ArrayBuffer
                const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
                await this.importer.importZip(arrayBuffer, targetPath, sourceName);
                new Notice('Successfully imported textbundle');
            } catch (e) {
                console.error('Alchemist Import Error:', e);
                new Notice(`Import failed: ${(e as Error).message}`);
            }
        }
    }

    private async runExport(file: TFile) {
        try {
            const context = await this.collector.collectResources(file);
            const blob = await this.packer.pack(context);
            const extension = this.context.settings.compressionFormat || 'textbundle';

            const result = await this.context.system.showSaveDialog({
                title: 'Save textbundle',
                defaultPath: this.context.system.path.join(this.context.settings.lastDialogPath, `${file.basename}.${extension}`),
                filters: [{ name: 'Textbundle', extensions: [extension, 'zip'] }]
            });

            if (!result.canceled && result.filePath) {
                this.context.settings.lastDialogPath = this.context.system.path.dirname(result.filePath);
                await this.context.plugin.saveSettings();
                this.context.system.fs.writeFileSync(result.filePath, new Uint8Array(blob));
                new Notice(`Successfully exported: ${file.basename}`);
            }
        } catch (e) {
            console.error('Alchemist Export Error:', e);
            new Notice(`Export failed: ${(e as Error).message}`);
        }
    }
}
