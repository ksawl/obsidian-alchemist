/**
 * Pure functions for TextBundle processing.
 * These functions have ZERO dependencies on Obsidian API.
 */

export interface LinkResolver {
    resolveAsset(link: string): string | null; // Returns bundle asset name if found
    resolveNote(link: string): string | null;  // Returns relative path to other note if found
}

/**
 * Transforms Obsidian-style links [[link]] and ![[embed]] to Markdown-style [link](assets/link)
 */
export function transformMarkdownLinks(
    content: string, 
    resolver: LinkResolver
): string {
    // 1. Transform Embeds ![[link]] or ![[link|alias]]
    content = content.replace(/!\[\[([^\]]+)\]\]/g, (match: string, link: string) => {
        const [path, alias] = link.split('|');
        const resolvedName = resolver.resolveAsset(path);
        
        if (resolvedName) {
            return `![${alias || resolvedName}](assets/${resolvedName})`;
        }
        return match;
    });

    // 2. Transform Regular Links [[link]] or [[link|alias]]
    content = content.replace(/\[\[([^\]]+)\]\]/g, (match: string, link: string) => {
        const [path, alias] = link.split('|');
        
        // 1. Try resolving as another note in TextPack FIRST
        const notePath = resolver.resolveNote(path);
        if (notePath) {
            const parts = notePath.split('/');
            const bundleName = parts[parts.length - 2] || '';
            const decodedBundle = decodeURIComponent(bundleName);
            const basename = decodedBundle.replace('.textbundle', '').split(' - ').pop() || 'Note';
            return `[${alias || basename}](${notePath})`;
        }

        // 2. Try resolving as asset
        const assetName = resolver.resolveAsset(path);
        if (assetName) {
            return `[${alias || assetName}](assets/${assetName})`;
        }

        return match;
    });

    return content;
}

/**
 * Transforms Markdown-style links [link](assets/link) back to Obsidian-style [[link]]
 * @param content Markdown content
 * @param assetsFolder The folder where assets were imported into (e.g. 'media')
 */
export function reverseTransformLinks(
    content: string, 
    assetsFolder: string
): string {
    const targetPrefix = assetsFolder ? `${assetsFolder}/` : '';

    // 1. Embeds: ![alt](assets/filename) -> ![[targetPrefix/filename|alt]]
    content = content.replace(/!\[([^\]]*)\]\(assets\/([^)]+)\)/g, (_match: string, alt: string, filename: string) => {
        const isRedundant = alt === filename;
        return (alt && !isRedundant) ? `![[${targetPrefix}${filename}|${alt}]]` : `![[${targetPrefix}${filename}]]`;
    });

    // 2. Links: [text](assets/filename) -> [[targetPrefix/filename|text]]
    content = content.replace(/\[([^\]]+)\]\(assets\/([^)]+)\)/g, (_match: string, text: string, filename: string) => {
        const isRedundant = text === filename;
        return (text && !isRedundant) ? `[[${targetPrefix}${filename}|${text}]]` : `[[${targetPrefix}${filename}]]`;
    });


    // 3. Cross-Bundle Links: [Label](../BundleName.textbundle/text.md) -> [[NoteName|Label]]
    content = content.replace(/\[([^\]]+)\]\(\.\.\/([^/]+)\/text\.(md|markdown|txt)\)/g, (_match: string, text: string, folderName: string) => {
        const decodedBundle = decodeURIComponent(folderName);
        const bundleBase = decodedBundle.replace(/\.textbundle$/i, '');
        // Handle collision suffixes like "Note (1)"
        const noteName = bundleBase.replace(/ \(\d+\)$/, '');
        
        return text === noteName ? `[[${noteName}]]` : `[[${noteName}|${text}]]`;
    });

    return content;
}
