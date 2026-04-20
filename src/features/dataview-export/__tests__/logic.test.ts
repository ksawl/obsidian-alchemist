import { escapeCsvCell, arrayToCsv } from '../logic';

describe('Dataview Logic: escapeCsvCell', () => {
    it('should escape double quotes', () => {
        expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    });

    it('should wrap in quotes if contains comma', () => {
        expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
    });

    it('should wrap in quotes if contains newline', () => {
        expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should return empty string for null/undefined', () => {
        expect(escapeCsvCell('')).toBe('');
    });
});

describe('Dataview Logic: arrayToCsv', () => {
    it('should convert 2D array to CSV', () => {
        const data = [
            ['Name', 'Age'],
            ['Alice', '30'],
            ['Bob, the Great', '25']
        ];
        const expected = 'Name,Age\nAlice,30\n"Bob, the Great",25';
        expect(arrayToCsv(data)).toBe(expected);
    });
});
