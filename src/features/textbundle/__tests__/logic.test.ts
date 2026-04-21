import { transformMarkdownLinks, LinkResolver } from '../logic';

// Note: reverseTransformLinks will be moved to logic.ts soon, but for now we test transform
describe('TextBundle Logic: transformMarkdownLinks', () => {
    const mockResolver: LinkResolver = {
        resolveAsset: (link: string) => {
            if (link === 'image.png') return 'image.png';
            if (link === 'Обучение.md') return null; // .md is NOT an asset
            if (link === 'photo') return 'real_photo.jpg';
            if (link === 'документ.pdf') return 'документ.pdf';
            return null;
        },
        resolveNote: (link: string) => {
            if (link === 'Other Note') return '../Other Note.textbundle/text.md';
            if (link === 'Обучение') return '../Обучение.textbundle/text.md';
            return null;
        }
    };

    it('should transform simple embeds', () => {
        const input = 'Check this out: ![[image.png]]';
        const expected = 'Check this out: ![image.png](assets/image.png)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should handle Cyrillic in assets', () => {
        const input = 'См. ![[документ.pdf]]';
        const expected = 'См. ![документ.pdf](assets/документ.pdf)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should transform links to other notes (even with Cyrillic)', () => {
        const input = 'Перейти к [[Обучение]]';
        const expected = 'Перейти к [Обучение](../Обучение.textbundle/text.md)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should handle aliases correctly', () => {
        const input = 'Check [[photo|This cool pic]]';
        const expected = 'Check [This cool pic](assets/real_photo.jpg)';
        expect(transformMarkdownLinks(input, mockResolver)).toBe(expected);
    });

    it('should not transform .md files as assets (bug check)', () => {
        const input = 'Lesson [[Обучение.md]]';
        // It should NOT be [Обучение.md](assets/Обучение.md) if it's not resolved as note or asset
        expect(transformMarkdownLinks(input, mockResolver)).toBe(input);
    });
});

