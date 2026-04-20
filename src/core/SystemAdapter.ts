import { ISystemAdapter } from './IAlchemistModule';

export class ElectronSystemAdapter implements ISystemAdapter {
    public fs: any;
    public path: any;
    public os: any;
    private dialog: any;

    constructor() {
        const electron = (window as any).require('electron');
        let remote: any;
        try {
            remote = (window as any).require('@electron/remote');
        } catch (e) {
            remote = electron.remote;
        }

        this.dialog = remote ? remote.dialog : electron.dialog;
        this.fs = (window as any).require('fs');
        this.path = (window as any).require('path');
        this.os = (window as any).require('os');
    }

    async showSaveDialog(options: any): Promise<{ canceled: boolean; filePath?: string }> {
        return await this.dialog.showSaveDialog(options);
    }

    async showOpenDialog(options: any): Promise<{ canceled: boolean; filePaths: string[] }> {
        return await this.dialog.showOpenDialog(options);
    }
}
