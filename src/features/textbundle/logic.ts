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
    content = content.replace(/!\[\[([^\]]+)\]\]/g, (match, link) => {
        const [path, alias] = link.split('|');
        const resolvedName = resolver.resolveAsset(path);
        
        if (resolvedName) {
            return `![${alias || resolvedName}](assets/${resolvedName})`;
        }
        return match;
    });

    // 2. Transform Regular Links [[link]] or [[link|alias]]
    content = content.replace(/\[\[([^\]]+)\]\]/g, (match, link) => {
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
