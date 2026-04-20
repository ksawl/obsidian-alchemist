/**
 * Pure logic for Smart Paste cleaning.
 * Zero dependencies on Obsidian API.
 */

const BLACKLIST = [
    'utm_', 'fbclid', 'gclid', 'yclid', 'msclkid', 'mc_cid', 'mc_eid', 
    '_hsenc', '_hsmi', 'sca_esv', 'sxsrf', 'ei', 'biw', 'bih', 'oq', 
    'gs_lp', 'sclient', 'ved', 'uact'
];

/**
 * Checks if a string contains any tracking parameters.
 */
export function containsTrackers(input: string): boolean {
    if (!input) return false;
    return BLACKLIST.some(b => input.toLowerCase().includes(b));
}

/**
 * Strips tracking parameters from all URLs found in the text.
 */
export function stripTrackers(input: string): string {
    const urlRegex = /(https?:\/\/[^\s"'>]+)/g;

    return input.replace(urlRegex, (url) => {
        try {
            // Handle HTML encoded entities
            const decodedUrl = url.replace(/&amp;/g, '&');
            const urlObj = new URL(decodedUrl);
            const params = urlObj.searchParams;
            
            const toRemove: string[] = [];
            params.forEach((_, key) => {
                if (BLACKLIST.some(b => key.toLowerCase().startsWith(b))) {
                    toRemove.push(key);
                }
            });

            if (toRemove.length > 0) {
                toRemove.forEach(k => params.delete(k));
                return urlObj.toString();
            }
            return url;
        } catch (e) {
            return url;
        }
    });
}

/**
 * Sanitizes HTML content structure and removes invisible trackers.
 * (Note: Uses DOMParser which is available in Obsidian/Electron but not in pure Node)
 */
export function purifyHtmlStructure(html: string): string {
    // Structural Cleaning (MS Office / Google Docs noise)
    let content = html;
    
    // Remove zero-width spaces
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // Clean specific junk IDs and styles
    content = content.replace(/\sid="docs-internal-guid-[^"]*"/g, '');
    content = content.replace(/\sstyle="[^"]*"/g, '');
    
    // Remove double spaces and non-breaking spaces
    content = content.replace(/&nbsp;/g, ' ').replace(/\s\s+/g, ' ');

    return content.trim();
}
