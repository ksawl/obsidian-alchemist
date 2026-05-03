import { App, Plugin } from 'obsidian';
import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from 'electron';
import { AlchemistSettings } from '../settings';

export interface IAlchemistPlugin extends Plugin {
    settings: AlchemistSettings;
    saveSettings(): Promise<void>;
}

export interface AlchemistContext {
    app: App;
    settings: AlchemistSettings;
    system: ISystemAdapter;
    plugin: IAlchemistPlugin;
}

export interface IAlchemistModule {
    id: string;
    load(context: AlchemistContext): Promise<void>;
    unload(): Promise<void>;
    onSettingsChange(newSettings: AlchemistSettings): Promise<void>;
}

export interface ISystemAdapter {
    fs: typeof import('fs');
    path: typeof import('path');
    os: typeof import('os');
    spawn: typeof import('child_process').spawn;
    showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue>;
    showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
}
