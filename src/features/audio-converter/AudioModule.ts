import { TFile, TFolder, Notice, normalizePath, FileSystemAdapter, Menu, TAbstractFile, MenuItem } from 'obsidian';
import { IAlchemistModule, AlchemistContext } from '../../core/IAlchemistModule';
import { AlchemistSettings } from '../../settings';
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
        const audioExtensions = ['webm', 'ogg', 'wav', 'mp3', 'm4a', 'flac', 'aac', 'opus', 'mp4', 'mov', 'mkv', 'avi'];

        // Handler for single file or folder
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('file-menu', (menu: Menu, abstractFile: TAbstractFile) => {
                if (!this.context.settings.enableAudioConverter) return;
                const format = (this.context.settings.defaultAudioOutputFormat || 'mp3').toLowerCase();

                const audioFiles: TFile[] = [];

                if (abstractFile instanceof TFile) {
                    const ext = abstractFile.extension.toLowerCase();
                    if (audioExtensions.includes(ext) && ext !== format) {
                        audioFiles.push(abstractFile);
                    }
                } else if (abstractFile instanceof TFolder) {
                    const collect = (f: TAbstractFile) => {
                        if (f instanceof TFile) {
                            const ext = f.extension.toLowerCase();
                            if (audioExtensions.includes(ext) && ext !== format) {
                                audioFiles.push(f);
                            }
                        } else if (f instanceof TFolder) {
                            f.children.forEach((child: TAbstractFile) => collect(child));
                        }
                    };
                    collect(abstractFile);
                }

                if (audioFiles.length === 0) return;

                menu.addItem((item: MenuItem) => {
                    const title = audioFiles.length === 1 
                        ? `Convert to ${format.toUpperCase()}` 
                        : `Convert folder (${audioFiles.length} files) to ${format.toUpperCase()}`;
                    
                    item
                        .setTitle(title)
                        .setIcon('music')
                        .onClick(() => {
                            void this.runConversion(audioFiles, format);
                        });
                });
            })
        );

        // Handler for multiple selection
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('files-menu', (menu: Menu, files: TAbstractFile[]) => {
                if (!this.context.settings.enableAudioConverter) return;
                const format = (this.context.settings.defaultAudioOutputFormat || 'mp3').toLowerCase();

                const audioFiles = files.filter(f => 
                    f instanceof TFile && 
                    audioExtensions.includes(f.extension.toLowerCase()) && 
                    f.extension.toLowerCase() !== format
                ) as TFile[];

                if (audioFiles.length <= 1) return; // Single file handled by file-menu

                menu.addItem((item: MenuItem) => {
                    item
                        .setTitle(`Convert selected (${audioFiles.length} files) to ${format.toUpperCase()}`)
                        .setIcon('music')
                        .onClick(() => {
                            void this.runConversion(audioFiles, format);
                        });
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

        new Notice(`Converting ${total} file(s)...`);

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
        new Notice(`Finished processing ${processed}/${total} files.`);
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
                if (frontmatter.title) metadata.title = String(frontmatter.title);
                if (frontmatter.artist) metadata.artist = String(frontmatter.artist);
                if (frontmatter.album) metadata.album = String(frontmatter.album);
                if (frontmatter.genre) metadata.genre = String(frontmatter.genre);
                
                // Date logic: date > creation_date > now
                if (frontmatter.date) metadata.date = String(frontmatter.date);
                else if (frontmatter.creation_date) metadata.date = String(frontmatter.creation_date);
                
                // Fallback for tags -> genre
                if (!frontmatter.genre && frontmatter.tags) {
                    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
                    if (tags.length > 0) metadata.genre = String(tags[0]);
                }
            }

            // H1 Fallback for title
            if (!frontmatter?.title) {
                const content = await this.context.app.vault.read(mdFile);
                const h1Match = content.match(/^#\s+(.+)$/m);
                if (h1Match) metadata.title = h1Match[1].trim();
            }
        }


        return metadata;
    }

    private convert(file: TFile, format: string, metadata: AudioMetadata): Promise<void> {
        return new Promise((resolve, reject) => {
            const system = this.context.system;
            const app = this.context.app;
            const settings = this.context.settings;

            const adapter = app.vault.adapter as FileSystemAdapter;
            const basePath = adapter.getBasePath();
            const inputPath = system.path.join(basePath, file.path);
            
            const tempOutputPath = system.path.join(system.os.tmpdir(), `alchemist_${Date.now()}.${format}`);
            const args = getFfmpegArgs(inputPath, tempOutputPath, format, metadata);

            const child = system.spawn('ffmpeg', args);
            
            let stderr = '';
            child.stderr?.on('data', (data: Buffer | string) => { stderr += data.toString(); });

            child.on('close', (code) => {
                if (code === 0) {
                    void (async () => {
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
                                    const result = await system.showOpenDialog({
                                        title: 'Save converted audio',
                                        defaultPath: system.path.join(settings.lastDialogPath, outputName),
                                        properties: ['openFile', 'promptToCreate']
                                    });
                                    if (result.canceled || result.filePaths.length === 0) {
                                        system.fs.unlinkSync(tempOutputPath);
                                        resolve();
                                        return;
                                    }
                                    const savePath = result.filePaths[0];
                                    settings.lastDialogPath = system.path.dirname(savePath);
                                    await this.context.plugin.saveSettings();
                                    system.fs.writeFileSync(savePath, new Uint8Array(data));
                                    system.fs.unlinkSync(tempOutputPath);
                                    if (settings.deleteOriginalWebM && file.extension === 'webm') {
                                        await app.fileManager.trashFile(file);
                                    }
                                    resolve();
                                    return;
                                }
                                default: // 'source'
                                    finalVaultPath = file.path.replace(new RegExp(`\\.${file.extension}$`), `.${format}`);
                            }
                            
                            const existingFile = app.vault.getAbstractFileByPath(finalVaultPath);
                            const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
                            if (existingFile instanceof TFile) {
                                await app.vault.modifyBinary(existingFile, arrayBuffer);
                            } else {
                                await app.vault.createBinary(finalVaultPath, arrayBuffer);
                            }

                            if (settings.deleteOriginalWebM && file.extension === 'webm') {
                                await app.fileManager.trashFile(file);
                            }
                            
                            system.fs.unlinkSync(tempOutputPath);
                            resolve();
                        } catch (e) {
                            reject(e instanceof Error ? e : new Error(String(e)));
                        }
                    })();
                } else {
                    reject(new Error(`FFmpeg failed: ${stderr}`));
                }
            });

            child.on('error', (err) => reject(err));
        });
    }
}
