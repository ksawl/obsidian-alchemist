import { Plugin } from 'obsidian';
import { AlchemistSettings, DEFAULT_SETTINGS, AlchemistSettingTab } from './settings';
import { IAlchemistModule, AlchemistContext } from './core/IAlchemistModule';
import { ElectronSystemAdapter } from './core/SystemAdapter';

// Modules
import { TextBundleModule } from './features/textbundle/TextBundleModule';
import { SmartPasteModule } from './features/paste-cleaner/SmartPasteModule';
import { DataviewModule } from './features/dataview-export/DataviewModule';
import { AudioModule } from './features/audio-converter/AudioModule';

export default class AlchemistPlugin extends Plugin {
    settings!: AlchemistSettings;
    private modules: IAlchemistModule[] = [];
    private systemAdapter = new ElectronSystemAdapter();

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new AlchemistSettingTab(this.app, this));

        const context: AlchemistContext = {
            app: this.app,
            settings: this.settings,
            system: this.systemAdapter,
            plugin: this
        };

        // Initialize Modules
        this.modules = [
            new TextBundleModule(),
            new SmartPasteModule(),
            new DataviewModule(),
            new AudioModule()
        ];

        for (const module of this.modules) {
            try {
                await module.load(context);
            } catch (e) {
                console.error(`Alchemist: Failed to load module [${module.id}]`, e);
            }
        }
    }

    onunload() {
        // Use Promise.all to handle cleanup if needed, 
        // but Plugin.onunload is expected to be synchronous or non-blocking.
        this.modules.forEach(module => {
            module.unload().catch(e => console.error(`Alchemist: Error unloading module [${module.id}]`, e));
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as AlchemistSettings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Notify all modules about settings change
        for (const module of this.modules) {
            await module.onSettingsChange(this.settings);
        }
    }
}
