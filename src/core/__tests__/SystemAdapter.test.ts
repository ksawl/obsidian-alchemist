import { ISystemAdapter } from '../IAlchemistModule';

export class MockSystemAdapter implements ISystemAdapter {
    public fs = {
        writeFileSync: jest.fn(),
        readFileSync: jest.fn(),
        existsSync: jest.fn(),
        mkdirSync: jest.fn(),
    };
    public path = {
        join: (...args: string[]) => args.join('/'),
        dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
        basename: (p: string) => p.split('/').pop(),
        isAbsolute: (p: string) => p.startsWith('/'),
    };
    public os = {
        tmpdir: () => '/tmp',
        platform: () => 'linux',
    };

    async showSaveDialog(options: any) {
        return { canceled: false, filePath: '/tmp/test.txt' };
    }

    async showOpenDialog(options: any) {
        return { canceled: false, filePaths: ['/tmp/test.txt'] };
    }
}

describe('SystemAdapter Smoke Test', () => {
    it('should be able to instantiate MockSystemAdapter', () => {
        const adapter = new MockSystemAdapter();
        expect(adapter).toBeDefined();
        expect(adapter.path.join('a', 'b')).toBe('a/b');
    });
});
