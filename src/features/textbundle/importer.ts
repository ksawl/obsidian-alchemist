import { App, TFile, TFolder, normalizePath, Notice } from 'obsidian';
import * as fflate from 'fflate';
import { AlchemistSettings } from '../../../settings';
import { ISystemAdapter } from '../../core/IAlchemistModule';
import { reverseTransformLinks } from './logic';

export class TextBundleImporter {
    app: App;
    settings: AlchemistSettings;
    system: ISystemAdapter;

    constructor(app: App, settings: AlchemistSettings, system: ISystemAdapter) {
        this.app = app;
        this.settings = settings;
        this.system = system;
    }

    /**
     * Entry point for ZIP import.
     */
    async importZip(data: ArrayBuffer, targetPath?: string, sourceName?: string) {
        try {
            const unzipped = fflate.unzipSync(new Uint8Array(data));
            await this.processUnzipped(unzipped, targetPath, sourceName);
            new Notice('Alchemist: Import successful');
        } catch (e) {
            console.error('Alchemist: Import failed', e);
            new Notice('Alchemist: Import failed. Check console for details.');
        }
    }

    private async processUnzipped(unzipped: Record<string, Uint8Array>, targetPath?: string, sourceName?: string) {
        const allKeys = Object.keys(unzipped);
        
        // Identify bundles (.textbundle folders)
        const bundleFolders = new Set<string>();
        allKeys.forEach(k => {
            const match = k.match(/(.*\.textbundle)\//);
            if (match) bundleFolders.add(match[1]);
        });

        if (bundleFolders.size === 0) {
            // Flat structure
            await this.importSingleBundle(unzipped, targetPath, sourceName);
        } else {
            // TextPack structure
            new Notice(`Alchemist: Importing ${bundleFolders.size} notes from TextPack...`);
            for (const folder of bundleFolders) {
                const prefix = `${folder}/`;
                const bundleFiles: Record<string, Uint8Array> = {};
                for (const key of allKeys) {
                    if (key.startsWith(prefix)) {
                        bundleFiles[key.replace(prefix, '')] = unzipped[key];
                    }
                }
                const cleanName = folder.replace('.textbundle', '');
                await this.importSingleBundle(bundleFiles, targetPath, cleanName);
            }
        }
    }

    private async importSingleBundle(files: Record<string, Uint8Array>, targetPath?: string, sourceName?: string) {
        const allKeys = Object.keys(files);
        
        const textKey = allKeys.find(k => 
            k.endsWith('text.md') || k.endsWith('text.markdown') || k.endsWith('text.txt') ||
            k === 'text.md' || k === 'text.markdown' || k === 'text.txt'
        );
        
        if (!textKey) return; 
        
        const textData = files[textKey];
        let content = fflate.strFromU8(textData);
        
        const importRoot = targetPath || this.settings.defaultImportPath || '/';
        
        let noteName = sourceName ? `${sourceName}.md` : `Imported_Note.md`;
        let finalImportFolder = normalizePath(importRoot);

        // 1. Read info.json FIRST to determine structure
        const infoKey = allKeys.find(k => k === 'info.json');
        if (infoKey) {
            try {
                const info = JSON.parse(fflate.strFromU8(files[infoKey]));
                if (info.title) noteName = `${info.title}.md`;
                
                if (info.origin_path && this.settings.restoreFolderStructure) {
                    const relativeDir = this.system.path.dirname(info.origin_path);
                    if (relativeDir !== '.') {
                        finalImportFolder = normalizePath(`${importRoot}/${relativeDir}`);
                    }
                }
            } catch (e) {}
        }

        await this.ensureFolder(finalImportFolder);
        // Put assets in a central "assets" folder within the import root (or relative root)
        const assetsFolderName = 'assets';
        const attachmentFolderPath = normalizePath(`${finalImportFolder}/${assetsFolderName}`);
        await this.ensureFolder(attachmentFolderPath);

        const assetsBase = 'assets/';
        const assetRenameMap = new Map<string, string>();

        // 2. Import Assets
        for (const [path, assetData] of Object.entries(files)) {
            if (path.startsWith(assetsBase) && path !== assetsBase) {
                const originalFileName = path.replace(assetsBase, '');
                const actualFileName = await this.importAssetWithSafety(originalFileName, assetData, attachmentFolderPath);
                
                if (actualFileName !== originalFileName) {
                    assetRenameMap.set(originalFileName, actualFileName);
                }
            }
        }

        // 3. Link Restoration
        content = reverseTransformLinks(content, assetsFolderName);
        
        for (const [oldName, newName] of assetRenameMap.entries()) {
            const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const linkRegex = new RegExp(`\\[\\[${assetsFolderName}/${escapedOldName}(\\|[^\\]]+)?\\]\\]`, 'g');
            content = content.replace(linkRegex, (match, alias) => {
                return `[[${assetsFolderName}/${newName}${alias || ''}]]`;
            });
        }

        await this.createNoteWithSafety(finalImportFolder, noteName, content);
    }

    private async importAssetWithSafety(fileName: string, data: Uint8Array, folderPath: string): Promise<string> {
        await this.ensureFolder(folderPath);
        
        let actualName = fileName;
        let fullPath = normalizePath(`${folderPath}/${actualName}`);
        let counter = 1;

        const nameParts = fileName.split('.');
        const ext = nameParts.pop();
        const base = nameParts.join('.');

        while (await this.app.vault.adapter.exists(fullPath)) {
            const existingData = await this.app.vault.adapter.readBinary(fullPath);
            
            // If identical, reuse
            if (this.areBuffersEqual(new Uint8Array(existingData), data)) {
                return actualName;
            }

            // Otherwise rename
            actualName = `${base} (${counter}).${ext}`;
            fullPath = normalizePath(`${folderPath}/${actualName}`);
            counter++;
        }

        await this.app.vault.createBinary(fullPath, data.buffer as ArrayBuffer);
        return actualName;
    }

    private areBuffersEqual(buf1: Uint8Array, buf2: Uint8Array): boolean {
        if (buf1.length !== buf2.length) return false;
        for (let i = 0; i < buf1.length; i++) {
            if (buf1[i] !== buf2[i]) return false;
        }
        return true;
    }

    private async createNoteWithSafety(folderPath: string, fileName: string, content: string) {
        let finalPath = normalizePath(`${folderPath}/${fileName}`);
        let counter = 1;

        const nameParts = fileName.split('.');
        const ext = nameParts.pop();
        const base = nameParts.join('.');

        while (this.app.vault.getAbstractFileByPath(finalPath)) {
            if (this.settings.conflictStrategy === 'skip') return;
            if (this.settings.conflictStrategy === 'overwrite') {
                const existing = this.app.vault.getAbstractFileByPath(finalPath);
                if (existing instanceof TFile) {
                    await this.app.vault.modify(existing, content);
                }
                return;
            }
            // Default or rename strategy
            finalPath = normalizePath(`${folderPath}/${base} (${counter}).${ext}`);
            counter++;
        }

        await this.app.vault.create(finalPath, content);
    }

    private async ensureFolder(path: string) {
        if (!path || path === '/' || path === '.') return;
        const normalized = normalizePath(path);
        if (this.app.vault.getAbstractFileByPath(normalized)) return;

        const parts = normalized.split('/');
        let currentPath = '';
        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!this.app.vault.getAbstractFileByPath(currentPath)) {
                await this.app.vault.createFolder(currentPath);
            }
        }
    }

    private getAttachmentFolder(): string {
        return (this.app.vault as any).getConfig?.('attachmentFolderPath') || '';
    }
}

