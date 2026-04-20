import { transformMarkdownLinks, LinkResolver } from '../logic';

describe('TextBundle Logic: transformMarkdownLinks', () => {
    const mockResolver: LinkResolver = {
        resolveAsset: (link: string) => {
            if (link === 'image.png') return 'image.png';
            if (link === 'photo') return 'real_photo.jpg';
            return null;
        },
        resolveNote: (link: string) => {
            if (link === 'Other Note') return '../Other Note.textbundle/text.md';
            return null;
        }
    };

    it('should transform simple embeds', () => {
        const input = 'Check this out: ![[image.png]]';
        const expected = 'Check this out: ![image.png](assets/image.png)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should transform embeds with aliases', () => {
        const input = 'Check this out: ![[photo|My Cool Photo]]';
        const expected = 'Check this out: ![My Cool Photo](assets/real_photo.jpg)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should transform regular links to assets', () => {
        const input = 'Download [[image.png]]';
        const expected = 'Download [image.png](assets/image.png)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should transform links to other notes in TextPack', () => {
        const input = 'See [[Other Note]]';
        const expected = 'See [Other Note](../Other Note.textbundle/text.md)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should not transform unknown links', () => {
        const input = 'See [[Unknown Note]] and ![[unknown.png]]';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(input);
    });
});
