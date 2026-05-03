import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue, Dialog } from 'electron';
import { ISystemAdapter } from './IAlchemistModule';

interface NodeRequire {
    (moduleName: string): unknown;
}

export class ElectronSystemAdapter implements ISystemAdapter {
    public fs: typeof import('fs');
    public path: typeof import('path');
    public os: typeof import('os');
    public spawn: typeof import('child_process').spawn;
    private dialog: Dialog;

    constructor() {
        const nodeRequire = (window as unknown as { require: NodeRequire }).require;
        const electron = nodeRequire('electron') as { dialog: Dialog; remote?: { dialog: Dialog } };
        let remote: { dialog: Dialog } | undefined;
        try {
            remote = nodeRequire('@electron/remote') as { dialog: Dialog } | undefined;
        } catch {
            remote = electron.remote;
        }

        this.dialog = (remote ? remote.dialog : electron.dialog);
        this.fs = nodeRequire('fs') as typeof import('fs');
        this.path = nodeRequire('path') as typeof import('path');
        this.os = nodeRequire('os') as typeof import('os');
        const childProcess = nodeRequire('child_process') as { spawn: typeof import('child_process').spawn };
        this.spawn = childProcess.spawn;
    }

    async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
        return await this.dialog.showSaveDialog(options);
    }

    async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
        return await this.dialog.showOpenDialog(options);
    }
}
