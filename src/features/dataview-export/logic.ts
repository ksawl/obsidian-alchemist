/**
 * Pure logic for Dataview CSV export.
 * Zero dependencies on DOM or Obsidian API.
 */

/**
 * Escapes a cell value for RFC-4180 CSV compliance.
 */
export function escapeCsvCell(text: string): string {
    if (!text) return '';
    let result = text.trim();
    if (result.includes('"')) {
        result = result.replace(/"/g, '""');
    }
    if (result.includes(',') || result.includes('\n') || result.includes('"')) {
        result = `"${result}"`;
    }
    return result;
}

/**
 * Converts a 2D array of strings into a CSV string.
 */
export function arrayToCsv(data: string[][]): string {
    return data.map(row => row.map(escapeCsvCell).join(',')).join('\n');
}
