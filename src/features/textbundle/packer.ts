import { TFile, App } from 'obsidian';
import * as fflate from 'fflate';
import { TextBundleContext } from './collector';
import { transformMarkdownLinks, LinkResolver } from './logic';

export class TextBundlePacker {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Zips the context into a TextBundle (single) or TextPack (multiple bundles) blob.
     */
    async pack(context: TextBundleContext): Promise<Uint8Array> {
        const zipData: fflate.Zippable = {};

        if (context.notes.length === 1) {
            // Standard TextBundle (flat structure)
            const note = context.notes[0];
            await this.buildBundleData(note, context, zipData, "");
        } else {
            // TextPack structure (ZIP of bundles)
            const usedNames = new Set<string>();
            const bundleMap = new Map<string, string>();

            // First pass: generate unique names
            for (const note of context.notes) {
                const baseName = note.basename;
                let bundleName = `${baseName}.textbundle`;
                let counter = 1;
                while (usedNames.has(bundleName)) {
                    bundleName = `${baseName} (${counter}).textbundle`;
                    counter++;
                }
                usedNames.add(bundleName);
                bundleMap.set(note.path, bundleName);
            }

            // Second pass: build data
            for (const note of context.notes) {
                const bundleName = bundleMap.get(note.path)!;
                const bundleData: fflate.Zippable = {};
                await this.buildBundleData(note, context, bundleData, "", bundleMap);
                zipData[bundleName] = bundleData;
            }
        }

        return new Promise((resolve, reject) => {
            fflate.zip(zipData, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    /**
     * Builds the internal structure of a single TextBundle.
     */
    private async buildBundleData(note: TFile, context: TextBundleContext, target: fflate.Zippable, prefix: string, bundleMap?: Map<string, string>) {
        // 1. info.json (with Traceability)
        const info = {
            "version": 2,
            "type": "net.daringfireball.markdown",
            "title": note.basename,
            "origin_vault": this.app.vault.getName(),
            "origin_path": note.path,
            "export_timestamp": new Date().toISOString()
        };
        target[`${prefix}info.json`] = fflate.strToU8(JSON.stringify(info, null, 2));

        // 2. assets
        const assetsObj: fflate.Zippable = {};
        const contentRaw = await this.app.vault.read(note);
        
        // Find which assets are actually used in THIS note
        const embeds = this.app.metadataCache.getFileCache(note)?.embeds || [];
        const links = this.app.metadataCache.getFileCache(note)?.links || [];
        
        for (const mention of [...embeds, ...links]) {
            const assetFile = this.app.metadataCache.getFirstLinkpathDest(mention.link, note.path);
            if (assetFile instanceof TFile && context.assetMap.has(assetFile.path)) {
                const bundleAssetName = context.assetMap.get(assetFile.path)!;
                const assetData = await this.app.vault.readBinary(assetFile);
                assetsObj[bundleAssetName] = new Uint8Array(assetData);
            }
        }
        
        if (Object.keys(assetsObj).length > 0) {
            target[`${prefix}assets`] = assetsObj;
        }

        // 3. text.md (with transformed links)
        const resolver: LinkResolver = {
            resolveAsset: (link: string) => {
                const assetFile = this.app.metadataCache.getFirstLinkpathDest(link, note.path);
                if (assetFile instanceof TFile) {
                    const ext = assetFile.extension.toLowerCase();
                    if (ext === 'md' || ext === 'markdown') return null;
                    return context.assetMap.get(assetFile.path) || assetFile.name;
                }
                return null;
            },
            resolveNote: (link: string) => {
                const targetFile = this.app.metadataCache.getFirstLinkpathDest(link, note.path);
                if (targetFile instanceof TFile) {
                    if (bundleMap && bundleMap.has(targetFile.path)) {
                        const bundleName = bundleMap.get(targetFile.path)!;
                        const encodedName = encodeURIComponent(bundleName);
                        return `../${encodedName}/text.md`;
                    }
                }
                return null;
            }
        };

        const content = transformMarkdownLinks(contentRaw, resolver);
        target[`${prefix}text.md`] = fflate.strToU8(content);
    }
}
