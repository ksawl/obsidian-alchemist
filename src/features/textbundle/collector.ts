import { TFile, App } from 'obsidian';
import { AlchemistSettings } from '../../../settings';

export interface TextBundleContext {
    visitedFiles: Set<string>;
    assetMap: Map<string, string>; // originalPath -> bundleName
    assets: Map<string, TFile>;    // bundleName -> TFile
    notes: TFile[];
}

export class TextBundleFeature {
    app: App;
    settings: AlchemistSettings;

    constructor(app: App, settings: AlchemistSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Collects all files (note itself + assets + linked notes) for TextBundle export.
     */
    async collectResources(startFile: TFile): Promise<TextBundleContext> {
        const context: TextBundleContext = {
            visitedFiles: new Set(),
            assetMap: new Map(),
            assets: new Map(),
            notes: []
        };

        await this.traverse(startFile, context, 0);
        return context;
    }

    private async traverse(file: TFile, context: TextBundleContext, depth: number) {
        if (context.visitedFiles.has(file.path)) return;
        context.visitedFiles.add(file.path);

        if (file.extension === 'md') {
            context.notes.push(file);
            
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return;

            // Collect embeds (images, pdfs, audio, etc.)
            if (cache.embeds) {
                for (const embed of cache.embeds) {
                    const assetFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
                    if (assetFile instanceof TFile && this.shouldIncludeAsset(assetFile)) {
                        this.addAssetToContext(assetFile, context);
                    }
                }
            }

            // Collect links (other notes) if recursion depth allows
            if (depth < this.settings.recursionDepth && cache.links) {
                for (const link of cache.links) {
                    const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
                    if (linkedFile instanceof TFile && linkedFile.extension === 'md') {
                        await this.traverse(linkedFile, context, depth + 1);
                    }
                }
            }
        } else {
            // If it's not a markdown file, it's an asset itself
            if (this.shouldIncludeAsset(file)) {
                this.addAssetToContext(file, context);
            }
        }
    }

    private addAssetToContext(file: TFile, context: TextBundleContext) {
        if (context.assetMap.has(file.path)) return;

        let bundleName = file.name;
        let counter = 1;
        const nameParts = file.name.split('.');
        const ext = nameParts.pop();
        const base = nameParts.join('.');

        while (context.assets.has(bundleName)) {
            bundleName = `${base}_${counter}.${ext}`;
            counter++;
        }

        context.assetMap.set(file.path, bundleName);
        context.assets.set(bundleName, file);
    }

    private shouldIncludeAsset(file: TFile): boolean {
        const ext = file.extension.toLowerCase();
        if (ext === 'md' || ext === 'markdown') return false;
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff'];
        const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm', 'opus'];
        const videoExtensions = ['mp4', 'webm', 'mkv', 'avi', 'mov'];
        const pdfExtensions = ['pdf'];

        if (imageExtensions.includes(ext)) return this.settings.includeImages;
        if (audioExtensions.includes(ext)) return this.settings.includeAudio;
        if (videoExtensions.includes(ext)) return this.settings.includeVideo;
        if (pdfExtensions.includes(ext)) return this.settings.includePDF;

        return true; // Include other types by default if not specifically filtered
    }
}
