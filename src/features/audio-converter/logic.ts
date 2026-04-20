/**
 * Pure logic for Audio Converter FFmpeg command generation.
 * Zero dependencies on Obsidian API or System.
 */

export interface AudioMetadata {
    title?: string;
    artist?: string;
    date?: string;
    genre?: string;
    album?: string;
}

/**
 * Generates the FFmpeg command arguments for conversion and metadata injection.
 */
export function getFfmpegArgs(
    inputPath: string, 
    outputPath: string, 
    format: string, 
    metadata: AudioMetadata
): string[] {
    const args = ['-i', inputPath];

    // Metadata injection
    if (metadata.title) args.push('-metadata', `title=${metadata.title}`);
    if (metadata.artist) args.push('-metadata', `artist=${metadata.artist}`);
    if (metadata.date) args.push('-metadata', `date=${metadata.date}`);
    if (metadata.genre) args.push('-metadata', `genre=${metadata.genre}`);
    if (metadata.album) args.push('-metadata', `album=${metadata.album}`);

    // Codec settings based on target format
    if (format === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-q:a', '2');
    } else if (format === 'wav') {
        args.push('-c:a', 'pcm_s16le');
    } else if (format === 'ogg') {
        args.push('-c:a', 'libvorbis', '-q:a', '4');
    } else if (format === 'flac') {
        args.push('-c:a', 'flac');
    } else if (format === 'm4a') {
        args.push('-c:a', 'aac', '-b:a', '192k');
    }

    args.push('-y', outputPath);
    return args;
}
