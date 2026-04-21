import { transformMarkdownLinks, reverseTransformLinks, LinkResolver } from '../logic';

describe('TextBundle: Roundtrip Link Symmetry', () => {
    const assetsFolder = 'assets';

    // 1. Export Mock Resolver
    const exportResolver: LinkResolver = {
        resolveAsset: (link: string) => {
            if (link === 'Обучение.png') return 'Обучение.png';
            if (link === 'images/photo.jpg') return 'photo.jpg';
            return null;
        },
        resolveNote: (link: string) => {
            if (link === 'Target Note') return '../Target Note.textbundle/text.md';
            return null;
        }
    };

    it('should maintain symmetry for internal assets with Cyrillic', () => {
        const original = 'Check this: ![[Обучение.png]]';
        
        // Step 1: Export
        const exported = transformMarkdownLinks(original, exportResolver);
        expect(exported).toBe('Check this: ![Обучение.png](assets/Обучение.png)');
        
        // Step 2: Import
        const imported = reverseTransformLinks(exported, assetsFolder);
        expect(imported).toBe('Check this: ![[assets/Обучение.png]]');
    });

    it('should maintain symmetry for assets with paths', () => {
        const original = 'Photo: ![[images/photo.jpg|My Photo]]';
        
        // Step 1: Export
        const exported = transformMarkdownLinks(original, exportResolver);
        expect(exported).toBe('Photo: ![My Photo](assets/photo.jpg)');
        
        // Step 2: Import
        const imported = reverseTransformLinks(exported, assetsFolder);
        expect(imported).toBe('Photo: ![[assets/photo.jpg|My Photo]]');
    });

    it('should maintain symmetry for cross-note links', () => {
        const original = 'Read [[Target Note|click here]]';
        
        // Step 1: Export
        const exported = transformMarkdownLinks(original, exportResolver);
        expect(exported).toBe('Read [click here](../Target Note.textbundle/text.md)');
        
        // Step 2: Import
        const imported = reverseTransformLinks(exported, assetsFolder);
        expect(imported).toBe('Read [[Target Note|click here]]');
    });

    it('should NOT break existing markdown links that are not assets', () => {
        const original = '[Google](https://google.com)';
        const exported = transformMarkdownLinks(original, exportResolver);
        const imported = reverseTransformLinks(exported, assetsFolder);
        expect(imported).toBe(original);
    });
});
