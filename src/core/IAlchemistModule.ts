import { AlchemistSettings } from '../../settings';

export interface AlchemistContext {
    app: any; // Obsidian App
    settings: AlchemistSettings;
    system: ISystemAdapter;
    plugin: any; // AlchemistPlugin
}

export interface IAlchemistModule {
    id: string;
    load(context: AlchemistContext): Promise<void>;
    unload(): Promise<void>;
    onSettingsChange(newSettings: AlchemistSettings): Promise<void>;
}

export interface ISystemAdapter {
    fs: any;
    path: any;
    os: any;
    showSaveDialog(options: any): Promise<{ canceled: boolean; filePath?: string }>;
    showOpenDialog(options: any): Promise<{ canceled: boolean; filePaths: string[] }>;
}
