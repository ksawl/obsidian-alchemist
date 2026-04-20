import { Plugin } from 'obsidian';
import { AlchemistSettings, DEFAULT_SETTINGS, AlchemistSettingTab } from './settings';
import { IAlchemistModule, AlchemistContext } from './src/core/IAlchemistModule';
import { ElectronSystemAdapter } from './src/core/SystemAdapter';

// Modules
import { TextBundleModule } from './src/features/textbundle/TextBundleModule';
import { SmartPasteModule } from './src/features/paste-cleaner/SmartPasteModule';
import { DataviewModule } from './src/features/dataview-export/DataviewModule';
import { AudioModule } from './src/features/audio-converter/AudioModule';

export default class AlchemistPlugin extends Plugin {
    settings!: AlchemistSettings;
    private modules: IAlchemistModule[] = [];
    private systemAdapter = new ElectronSystemAdapter();

    async onload() {
        console.log('Loading Alchemist (Modular Purity Protocol)...');
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
                console.log(`Alchemist: Module [${module.id}] loaded`);
            } catch (e) {
                console.error(`Alchemist: Failed to load module [${module.id}]`, e);
            }
        }

        console.log('Alchemist: Modular Purity Protocol initiated');
    }

    async onunload() {
        for (const module of this.modules) {
            await module.unload();
        }
        console.log('Alchemist: Modular Purity Protocol terminated');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Notify all modules about settings change
        for (const module of this.modules) {
            await module.onSettingsChange(this.settings);
        }
    }
}
