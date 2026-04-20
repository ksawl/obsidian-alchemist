import { containsTrackers, stripTrackers, purifyHtmlStructure } from '../logic';

describe('SmartPaste Logic: stripTrackers', () => {
    it('should remove UTM parameters', () => {
        const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&id=123';
        const expected = 'https://example.com/page?id=123';
        expect(stripTrackers(url)).toBe(expected);
    });

    it('should remove fbclid', () => {
        const url = 'https://example.com/?fbclid=IwAR123';
        const expected = 'https://example.com/';
        expect(stripTrackers(url)).toBe(expected);
    });

    it('should handle multiple URLs in text', () => {
        const text = 'Check out https://site1.com?utm_source=x and https://site2.com?gclid=y';
        const expected = 'Check out https://site1.com/ and https://site2.com/';
        expect(stripTrackers(text)).toBe(expected);
    });

    it('should handle &amp; entities', () => {
        const url = 'https://example.com/?a=1&amp;utm_source=2';
        const expected = 'https://example.com/?a=1';
        expect(stripTrackers(url)).toBe(expected);
    });
});

describe('SmartPaste Logic: purifyHtmlStructure', () => {
    it('should remove docs-internal-guid', () => {
        const html = '<b id="docs-internal-guid-123">Hello</b>';
        const expected = '<b>Hello</b>';
        expect(purifyHtmlStructure(html)).toBe(expected);
    });

    it('should remove zero-width spaces', () => {
        const html = 'H\u200Bello';
        const expected = 'Hello';
        expect(purifyHtmlStructure(html)).toBe(expected);
    });
});
