import { TFile, Notice, normalizePath, FileSystemAdapter } from 'obsidian';
import { spawn } from 'child_process';
import { IAlchemistModule, AlchemistContext } from '../../core/IAlchemistModule';
import { AlchemistSettings } from '../../../settings';
import { getFfmpegArgs, AudioMetadata } from './logic';

export class AudioModule implements IAlchemistModule {
    public id = 'audio-converter';
    private context!: AlchemistContext;
    private statusBarItem: HTMLElement | null = null;

    async load(context: AlchemistContext): Promise<void> {
        this.context = context;
        this.statusBarItem = this.context.plugin.addStatusBarItem();
        if (this.statusBarItem) this.statusBarItem.hide();
        this.registerEvents();
    }

    async unload(): Promise<void> {
        // Events are cleaned up automatically
    }

    async onSettingsChange(newSettings: AlchemistSettings): Promise<void> {
        this.context.settings = newSettings;
    }

    private registerEvents() {
        // Single file menu
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('file-menu', (menu: any, abstractFile: any) => {
                if (!this.context.settings.enableAudioConverter) return;
                const format = this.context.settings.defaultAudioOutputFormat || 'mp3';
                
                if (abstractFile instanceof TFile) {
                    const ext = abstractFile.extension.toLowerCase();
                    const audioExtensions = ['webm', 'ogg', 'wav', 'mp3', 'm4a', 'flac', 'aac', 'opus'];
                    
                    if (audioExtensions.includes(ext) && ext !== format) {
                        menu.addItem((item: any) => {
                            item
                                .setTitle(`Alchemist: Convert to ${format.toUpperCase()}`)
                                .setIcon('music')
                                .onClick(() => this.runConversion([abstractFile], format));
                        });
                    }
                }
            })
        );

        // Multiple files menu
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('files-menu', (menu: any, files: any[]) => {
                if (!this.context.settings.enableAudioConverter) return;
                const audioExtensions = ['webm', 'ogg', 'wav', 'mp3', 'm4a', 'flac', 'aac', 'opus'];
                const audioFiles = files.filter(f => f instanceof TFile && audioExtensions.includes(f.extension.toLowerCase()) && f.extension.toLowerCase() !== format);
                if (audioFiles.length <= 1) return;

                const format = this.context.settings.defaultAudioOutputFormat || 'mp3';
                menu.addItem((item: any) => {
                    item
                        .setTitle(`Alchemist: Convert ${audioFiles.length} files to ${format.toUpperCase()}`)
                        .setIcon('music')
                        .onClick(() => this.runConversion(audioFiles, format));
                });
            })
        );
    }

    private async runConversion(files: TFile[], format: string) {
        if (files.length === 0) return;
        
        const total = files.length;
        let processed = 0;

        if (this.statusBarItem) {
            this.statusBarItem.show();
            this.updateStatus(processed, total);
        }

        new Notice(`Alchemist: Converting ${total} file(s)...`);

        for (const file of files) {
            try {
                const metadata = await this.extractMetadata(file);
                await this.convert(file, format, metadata);
                processed++;
                this.updateStatus(processed, total);
            } catch (e) {
                console.error(`Alchemist Audio Error (${file.name}):`, e);
                new Notice(`Conversion failed for ${file.name}: ${(e as Error).message}`);
            }
        }

        if (this.statusBarItem) this.statusBarItem.hide();
        new Notice(`Alchemist: Finished processing ${processed}/${total} files.`);
    }

    private updateStatus(current: number, total: number) {
        if (!this.statusBarItem) return;
        this.statusBarItem.setText(`🧪 Alchemist: ${current}/${total} [${Math.round((current / total) * 100)}%]`);
    }

    private async extractMetadata(file: TFile): Promise<AudioMetadata> {
        const metadata: AudioMetadata = {
            title: file.basename,
            artist: this.context.settings.defaultAudioArtist,
            album: this.context.settings.defaultAudioAlbum,
            genre: this.context.settings.defaultAudioGenre,
            date: new Date().getFullYear().toString()
        };

        // Try to find a companion .md file with the same name
        const mdPath = file.path.replace(/\.[^/.]+$/, ".md");
        const mdFile = this.context.app.vault.getAbstractFileByPath(mdPath);

        if (mdFile instanceof TFile) {
            const cache = this.context.app.metadataCache.getFileCache(mdFile);
            const frontmatter = cache?.frontmatter;

            if (frontmatter) {
                if (frontmatter.title) metadata.title = frontmatter.title;
                if (frontmatter.artist) metadata.artist = frontmatter.artist;
                if (frontmatter.album) metadata.album = frontmatter.album;
                if (frontmatter.genre) metadata.genre = frontmatter.genre;
                if (frontmatter.date) metadata.date = String(frontmatter.date);
                
                // Fallback for tags -> genre
                if (!frontmatter.genre && frontmatter.tags) {
                    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
                    if (tags.length > 0) metadata.genre = tags[0];
                }
            }
        }

        return metadata;
    }

    private async convert(file: TFile, format: string, metadata: AudioMetadata): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const system = this.context.system;
            const app = this.context.app;
            const settings = this.context.settings;

            const adapter = app.vault.adapter as FileSystemAdapter;
            const basePath = adapter.getBasePath();
            const inputPath = system.path.join(basePath, file.path);
            
            const tempOutputPath = system.path.join(system.os.tmpdir(), `alchemist_${Date.now()}.${format}`);
            const args = getFfmpegArgs(inputPath, tempOutputPath, format, metadata);

            const child = spawn('ffmpeg', args);
            
            let stderr = '';
            child.stderr.on('data', (data) => { stderr += data.toString(); });

            child.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const data = system.fs.readFileSync(tempOutputPath);
                        const outputName = file.basename + '.' + format;
                        let finalVaultPath: string;

                        switch (settings.targetFolderStrategy) {
                            case 'specific': {
                                const folder = settings.specificTargetFolder || '';
                                finalVaultPath = normalizePath(`${folder}/${outputName}`);
                                if (folder) {
                                    const existing = app.vault.getAbstractFileByPath(folder);
                                    if (!existing) await app.vault.createFolder(folder);
                                }
                                break;
                            }
                            case 'dialog': {
                                const result = await system.showSaveDialog({
                                    title: 'Save Converted Audio',
                                    defaultPath: system.path.join(settings.lastDialogPath, outputName),
                                    filters: [{ name: format.toUpperCase(), extensions: [format] }]
                                });
                                if (result.canceled || !result.filePath) {
                                    system.fs.unlinkSync(tempOutputPath);
                                    resolve();
                                    return;
                                }
                                settings.lastDialogPath = system.path.dirname(result.filePath);
                                await this.context.plugin.saveSettings();
                                system.fs.writeFileSync(result.filePath, data);
                                system.fs.unlinkSync(tempOutputPath);
                                if (settings.deleteOriginalWebM && file.extension === 'webm') {
                                    await app.vault.trash(file, true);
                                }
                                resolve();
                                return;
                            }
                            default: // 'source'
                                finalVaultPath = file.path.replace(new RegExp(`\\.${file.extension}$`), `.${format}`);
                        }
                        
                        const existingFile = app.vault.getAbstractFileByPath(finalVaultPath);
                        if (existingFile instanceof TFile) {
                            await app.vault.modifyBinary(existingFile, data.buffer);
                        } else {
                            await app.vault.createBinary(finalVaultPath, data.buffer);
                        }

                        if (settings.deleteOriginalWebM && file.extension === 'webm') {
                            await app.vault.trash(file, true);
                        }
                        
                        system.fs.unlinkSync(tempOutputPath);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`FFmpeg failed: ${stderr}`));
                }
            });

            child.on('error', (err) => reject(err));
        });
    }
}
