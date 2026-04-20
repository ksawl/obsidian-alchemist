import { getFfmpegArgs } from '../logic';

describe('Audio Logic: getFfmpegArgs', () => {
    it('should generate basic args for mp3', () => {
        const args = getFfmpegArgs('input.webm', 'output.mp3', 'mp3', {});
        expect(args).toContain('input.webm');
        expect(args).toContain('output.mp3');
        expect(args).toContain('libmp3lame');
    });

    it('should include metadata args if provided', () => {
        const metadata = { title: 'Test Title', artist: 'Test Artist' };
        const args = getFfmpegArgs('in.wav', 'out.mp3', 'mp3', metadata);
        expect(args).toContain('title=Test Title');
        expect(args).toContain('artist=Test Artist');
    });

    it('should set overwrite flag', () => {
        const args = getFfmpegArgs('in.wav', 'out.wav', 'wav', {});
        expect(args).toContain('-y');
    });

    it('should use pcm_s16le for wav', () => {
        const args = getFfmpegArgs('in.webm', 'out.wav', 'wav', {});
        expect(args).toContain('pcm_s16le');
    });
});
