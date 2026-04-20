import { App, PluginSettingTab, Setting } from 'obsidian';
import AlchemistPlugin from './main';

export interface AlchemistSettings {
    // Global Feature Toggles
    enableTextBundle: boolean;
    enableAudioConverter: boolean;
    enableDataviewExport: boolean;
    enableSmartPaste: boolean;

    // Global Persistence
    lastDialogPath: string;

    // Module 1: TextBundle
    defaultImportPath: string;
    includeImages: boolean;
    includeAudio: boolean;
    includeVideo: boolean;
    includePDF: boolean;
    recursionDepth: number;
    compressionFormat: 'zip' | 'textpack' | 'textbundle';
    conflictStrategy: 'skip' | 'overwrite' | 'rename';
    restoreFolderStructure: boolean;

    // Module 2: Audio Converter
    targetFolderStrategy: 'source' | 'specific' | 'dialog';
    specificTargetFolder: string;
    deleteOriginalWebM: boolean;
    defaultAudioOutputFormat: 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac';
    defaultAudioArtist: string;
    defaultAudioAlbum: string;
    defaultAudioGenre: string;

    // Module 3: Dataview
    dataviewExportStrategy: 'vault' | 'dialog';
    dataviewVaultPath: string;

    // Module 4: Smart Paste
    stripTrackingParameters: boolean;
    cleanMsoHtml: boolean;
}

export const DEFAULT_SETTINGS: AlchemistSettings = {
    enableTextBundle: true,
    enableAudioConverter: true,
    enableDataviewExport: true,
    enableSmartPaste: true,

    lastDialogPath: '',

    defaultImportPath: '',
    includeImages: true,
    includeAudio: true,
    includeVideo: true,
    includePDF: true,
    recursionDepth: 0,
    compressionFormat: 'zip',
    conflictStrategy: 'rename',
    restoreFolderStructure: true,

    targetFolderStrategy: 'source',
    specificTargetFolder: '',
    deleteOriginalWebM: false,
    defaultAudioOutputFormat: 'mp3',
    defaultAudioArtist: 'Alchemist',
    defaultAudioAlbum: 'Obsidian Vault',
    defaultAudioGenre: 'Voice Note',

    dataviewExportStrategy: 'dialog',
    dataviewVaultPath: 'Exports',

    stripTrackingParameters: true,
    cleanMsoHtml: true,
}

export class AlchemistSettingTab extends PluginSettingTab {
    plugin: AlchemistPlugin;

    constructor(app: App, plugin: AlchemistPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Alchemist: Central Command' });

        // --- SECTION: GLOBAL ---
        containerEl.createEl('h3', { text: 'Core Modules' });
        
        new Setting(containerEl)
            .setName('Enable TextBundle')
            .setDesc('Export/Import notes as TextBundle.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTextBundle)
                .onChange(async (value) => {
                    this.plugin.settings.enableTextBundle = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable Audio Converter')
            .setDesc('Convert WebM recordings to MP3/WAV/OGG (Desktop).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAudioConverter)
                .onChange(async (value) => {
                    this.plugin.settings.enableAudioConverter = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable Dataview Export')
            .setDesc('Add CSV export button to Dataview tables.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDataviewExport)
                .onChange(async (value) => {
                    this.plugin.settings.enableDataviewExport = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable Smart Paste')
            .setDesc('Clean clipboard content from trackers and junk HTML.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableSmartPaste)
                .onChange(async (value) => {
                    this.plugin.settings.enableSmartPaste = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // --- SECTION: TEXTBUNDLE ---
        if (this.plugin.settings.enableTextBundle) {
            containerEl.createEl('h3', { text: 'TextBundle Strategy' });

            new Setting(containerEl)
                .setName('Default Import Path')
                .setDesc('Folder where TextBundles will be unpacked by default.')
                .addText(text => text
                    .setPlaceholder('e.g. Imports/TextBundle')
                    .setValue(this.plugin.settings.defaultImportPath)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultImportPath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include Images')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeImages)
                    .onChange(async (value) => {
                        this.plugin.settings.includeImages = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include Audio')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeAudio)
                    .onChange(async (value) => {
                        this.plugin.settings.includeAudio = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include Video')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeVideo)
                    .onChange(async (value) => {
                        this.plugin.settings.includeVideo = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include PDFs')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includePDF)
                    .onChange(async (value) => {
                        this.plugin.settings.includePDF = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Recursion Depth')
                .setDesc('How many levels of linked notes to include (0 = current note only).')
                .addSlider(slider => slider
                    .setLimits(0, 5, 1)
                    .setValue(this.plugin.settings.recursionDepth)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.recursionDepth = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Compression Format')
                .setDesc('Target file extension for exports.')
                .addDropdown(dropdown => dropdown
                    .addOption('zip', '.zip (Standard)')
                    .addOption('textbundle', '.textbundle')
                    .addOption('textpack', '.textpack')
                    .setValue(this.plugin.settings.compressionFormat)
                    .onChange(async (value: any) => {
                        this.plugin.settings.compressionFormat = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Conflict Strategy')
                .setDesc('What to do if a file with the same name already exists during import.')
                .addDropdown(dropdown => dropdown
                    .addOption('rename', 'Auto-rename (Versioning)')
                    .addOption('skip', 'Skip Existing')
                    .addOption('overwrite', 'Overwrite (CAUTION)')
                    .setValue(this.plugin.settings.conflictStrategy)
                    .onChange(async (value: any) => {
                        this.plugin.settings.conflictStrategy = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Restore Folder Structure')
                .setDesc('Try to recreate the original vault path using metadata.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.restoreFolderStructure)
                    .onChange(async (value) => {
                        this.plugin.settings.restoreFolderStructure = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: AUDIO ---
        if (this.plugin.settings.enableAudioConverter) {
            containerEl.createEl('h3', { text: 'Audio Transformation' });

            new Setting(containerEl)
                .setName('Target Folder Strategy')
                .setDesc('Where to save converted files.')
                .addDropdown(dropdown => dropdown
                    .addOption('source', 'Same as source')
                    .addOption('specific', 'Specific folder')
                    .addOption('dialog', 'Always ask with dialog')
                    .setValue(this.plugin.settings.targetFolderStrategy)
                    .onChange(async (value: any) => {
                        this.plugin.settings.targetFolderStrategy = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide specific folder setting
                    }));

            if (this.plugin.settings.targetFolderStrategy === 'specific') {
                new Setting(containerEl)
                    .setName('Specific Target Folder')
                    .addText(text => text
                        .setValue(this.plugin.settings.specificTargetFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.specificTargetFolder = value;
                            await this.plugin.saveSettings();
                        }));
            }

            new Setting(containerEl)
                .setName('Default Output Format')
                .setDesc('Target format for audio conversion.')
                .addDropdown(dropdown => dropdown
                    .addOption('mp3', 'MP3')
                    .addOption('wav', 'WAV')
                    .addOption('ogg', 'OGG')
                    .addOption('m4a', 'M4A')
                    .addOption('flac', 'FLAC')
                    .setValue(this.plugin.settings.defaultAudioOutputFormat)
                    .onChange(async (value: any) => {
                        this.plugin.settings.defaultAudioOutputFormat = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            new Setting(containerEl)
                .setName('Delete original WebM')
                .setDesc('Remove the original file after successful conversion.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.deleteOriginalWebM)
                    .onChange(async (value) => {
                        this.plugin.settings.deleteOriginalWebM = value;
                        await this.plugin.saveSettings();
                    }));

            containerEl.createEl('h4', { text: 'Default Metadata' });

            new Setting(containerEl)
                .setName('Default Artist')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioArtist)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioArtist = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default Album')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioAlbum)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioAlbum = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default Genre')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioGenre)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioGenre = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: DATAVIEW ---
        if (this.plugin.settings.enableDataviewExport) {
            containerEl.createEl('h3', { text: 'Dataview Export' });

            new Setting(containerEl)
                .setName('Export Strategy')
                .setDesc('How to handle CSV generation.')
                .addDropdown(dropdown => dropdown
                    .addOption('dialog', 'System Save Dialog')
                    .addOption('vault', 'Silent Save to Vault')
                    .setValue(this.plugin.settings.dataviewExportStrategy)
                    .onChange(async (value: any) => {
                        this.plugin.settings.dataviewExportStrategy = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.dataviewExportStrategy === 'vault') {
                new Setting(containerEl)
                    .setName('Vault Target Folder')
                    .setDesc('Folder where Dataview CSVs will be saved.')
                    .addText(text => text
                        .setPlaceholder('Exports')
                        .setValue(this.plugin.settings.dataviewVaultPath)
                        .onChange(async (value) => {
                            this.plugin.settings.dataviewVaultPath = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // --- SECTION: SMART PASTE ---
        if (this.plugin.settings.enableSmartPaste) {
            containerEl.createEl('h3', { text: 'Hygiene & Sanitization (Paste)' });

            new Setting(containerEl)
                .setName('Strip Marketing Trackers')
                .setDesc('Remove UTM, fbclid, and other trackers from pasted URLs.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.stripTrackingParameters)
                    .onChange(async (value) => {
                        this.plugin.settings.stripTrackingParameters = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Clean HTML Artifacts')
                .setDesc('Remove proprietary meta-tags from Google Docs/MS Office pastes.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.cleanMsoHtml)
                    .onChange(async (value) => {
                        this.plugin.settings.cleanMsoHtml = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: SUPPORT ---
        containerEl.createEl('hr');
        const supportDiv = containerEl.createDiv({ cls: 'alchemist-support-container' });
        supportDiv.style.textAlign = 'center';
        supportDiv.style.padding = '20px';

        supportDiv.createEl('h3', { text: 'Support the Alchemist' });
        supportDiv.createEl('p', { text: 'If you find this tool useful, consider supporting its development.' });

        const buttonsDiv = supportDiv.createDiv();
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.justifyContent = 'center';
        buttonsDiv.style.gap = '15px';

        const kofiBtn = buttonsDiv.createEl('a', {
            href: 'https://ko-fi.com/kharizma',
            cls: 'alchemist-donate-btn'
        });
        kofiBtn.innerText = 'Buy me a coffee';
        kofiBtn.style.cssText = 'background: #29abe0; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;';

        const boostyBtn = buttonsDiv.createEl('a', {
            href: 'https://boosty.to/kharizma',
            cls: 'alchemist-donate-btn'
        });
        boostyBtn.innerText = 'Support on Boosty';
        boostyBtn.style.cssText = 'background: #f15f2c; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;';
    }
}
