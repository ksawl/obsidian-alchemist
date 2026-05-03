import { App, PluginSettingTab, Setting } from 'obsidian';
import AlchemistPlugin from './main';

export interface AlchemistSettings {
    lastDialogPath: string;
    // TextBundle
    enableTextBundle: boolean;
    compressionFormat: 'zip' | 'textpack' | 'textbundle';
    conflictStrategy: 'skip' | 'overwrite' | 'rename';
    defaultImportPath: string;
    restoreFolderStructure: boolean;
    recursionDepth: number;
    includeImages: boolean;
    includeAudio: boolean;
    includeVideo: boolean;
    includePDF: boolean;
    // Audio Converter
    enableAudioConverter: boolean;
    targetFolderStrategy: 'source' | 'specific' | 'dialog';
    specificTargetFolder: string;
    defaultAudioOutputFormat: 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac';
    deleteOriginalWebM: boolean;
    defaultAudioArtist: string;
    defaultAudioAlbum: string;
    defaultAudioGenre: string;
    // Smart Paste
    enableSmartPaste: boolean;
    stripTrackingParameters: boolean;
    // Dataview Export
    enableDataviewExport: boolean;
    dataviewExportStrategy: 'vault' | 'dialog';
    dataviewVaultPath: string;
}

export const DEFAULT_SETTINGS: AlchemistSettings = {
    lastDialogPath: '',
    enableTextBundle: true,
    compressionFormat: 'textbundle',
    conflictStrategy: 'rename',
    defaultImportPath: '',
    restoreFolderStructure: true,
    recursionDepth: 0,
    includeImages: true,
    includeAudio: true,
    includeVideo: true,
    includePDF: true,
    enableAudioConverter: true,
    targetFolderStrategy: 'source',
    specificTargetFolder: '',
    defaultAudioOutputFormat: 'mp3',
    deleteOriginalWebM: false,
    defaultAudioArtist: 'Obsidian',
    defaultAudioAlbum: 'Voice Notes',
    defaultAudioGenre: 'Speech',
    enableSmartPaste: true,
    stripTrackingParameters: true,
    enableDataviewExport: true,
    dataviewExportStrategy: 'vault',
    dataviewVaultPath: 'Exports'
};

export class AlchemistSettingTab extends PluginSettingTab {
    plugin: AlchemistPlugin;

    constructor(app: App, plugin: AlchemistPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();



        new Setting(containerEl)
            .setName('Enable textbundle')
            .setDesc('Enable support for .textbundle and .textpack formats.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTextBundle)
                .onChange(async (value) => {
                    this.plugin.settings.enableTextBundle = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable audio converter')
            .setDesc('Enable context menu options to convert audio files via ffmpeg.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAudioConverter)
                .onChange(async (value) => {
                    this.plugin.settings.enableAudioConverter = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable smart paste')
            .setDesc('Automatically clean trackers and improve pasted content.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableSmartPaste)
                .onChange(async (value) => {
                    this.plugin.settings.enableSmartPaste = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Enable dataview export')
            .setDesc('Add export buttons to dataview tables.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDataviewExport)
                .onChange(async (value) => {
                    this.plugin.settings.enableDataviewExport = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // --- SECTION: TEXTBUNDLE ---
        if (this.plugin.settings.enableTextBundle) {
            new Setting(containerEl).setName('Textbundle configuration').setHeading();

            new Setting(containerEl)
                .setName('Default compression format')
                .setDesc('Used when exporting notes.')
                .addDropdown(dropdown => dropdown
                    .addOption('zip', '.zip (standard)')
                    .addOption('textbundle', '.textbundle')
                    .addOption('textpack', '.textpack')
                    .setValue(this.plugin.settings.compressionFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.compressionFormat = value as 'zip' | 'textpack' | 'textbundle';
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Conflict strategy')
                .setDesc('What to do if a file with the same name already exists during import.')
                .addDropdown(dropdown => dropdown
                    .addOption('rename', 'Auto-rename (versioning)')
                    .addOption('skip', 'Skip existing')
                    .addOption('overwrite', 'Overwrite (caution)')
                    .setValue(this.plugin.settings.conflictStrategy)
                    .onChange(async (value) => {
                        this.plugin.settings.conflictStrategy = value as 'skip' | 'overwrite' | 'rename';
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default import path')
                .setDesc('Folder where textbundles will be unpacked by default.')
                .addText(text => text
                    .setPlaceholder('E.g. Imports/textbundle')
                    .setValue(this.plugin.settings.defaultImportPath)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultImportPath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Restore folder structure')
                .setDesc('Try to recreate the original vault path using metadata.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.restoreFolderStructure)
                    .onChange(async (value) => {
                        this.plugin.settings.restoreFolderStructure = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Export recursion depth')
                .setDesc('How many levels of linked notes to include in the bundle (0 = only the note itself).')
                .addSlider(slider => slider
                    .setLimits(0, 5, 1)
                    .setValue(this.plugin.settings.recursionDepth)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.recursionDepth = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Asset inclusion')
                .setDesc('Which types of embedded assets should be included in the bundle.')
                .setHeading();

            new Setting(containerEl)
                .setName('Include images')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeImages)
                    .onChange(async (value) => {
                        this.plugin.settings.includeImages = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include audio')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeAudio)
                    .onChange(async (value) => {
                        this.plugin.settings.includeAudio = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include video')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includeVideo)
                    .onChange(async (value) => {
                        this.plugin.settings.includeVideo = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include PDF')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.includePDF)
                    .onChange(async (value) => {
                        this.plugin.settings.includePDF = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: AUDIO ---
        if (this.plugin.settings.enableAudioConverter) {
            new Setting(containerEl).setName('Audio transformation').setHeading();

            new Setting(containerEl)
                .setName('Target folder strategy')
                .setDesc('Where to save converted files.')
                .addDropdown(dropdown => dropdown
                    .addOption('source', 'Same as source')
                    .addOption('specific', 'Specific folder')
                    .addOption('dialog', 'Always ask with dialog')
                    .setValue(this.plugin.settings.targetFolderStrategy)
                    .onChange(async (value) => {
                        this.plugin.settings.targetFolderStrategy = value as 'source' | 'specific' | 'dialog';
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide specific folder setting
                    }));

            if (this.plugin.settings.targetFolderStrategy === 'specific') {
                new Setting(containerEl)
                    .setName('Specific target folder')
                    .addText(text => text
                        .setValue(this.plugin.settings.specificTargetFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.specificTargetFolder = value;
                            await this.plugin.saveSettings();
                        }));
            }

            new Setting(containerEl)
                .setName('Default output format')
                .setDesc('Target format for audio conversion.')
                .addDropdown(dropdown => dropdown
                    .addOption('mp3', 'MP3')
                    .addOption('wav', 'WAV')
                    .addOption('ogg', 'OGG')
                    .addOption('m4a', 'M4A')
                    .addOption('flac', 'FLAC')
                    .setValue(this.plugin.settings.defaultAudioOutputFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioOutputFormat = value as 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac';
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            new Setting(containerEl)
                .setName('Delete original webm')
                .setDesc('Remove the original file after successful conversion.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.deleteOriginalWebM)
                    .onChange(async (value) => {
                        this.plugin.settings.deleteOriginalWebM = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default metadata')
                .setDesc('Fallback values for audio tags.')
                .setHeading();

            new Setting(containerEl)
                .setName('Default artist')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioArtist)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioArtist = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default album')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioAlbum)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioAlbum = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Default genre')
                .addText(text => text
                    .setValue(this.plugin.settings.defaultAudioGenre)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultAudioGenre = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: HYGIENE ---
        if (this.plugin.settings.enableSmartPaste) {
            new Setting(containerEl).setName('Hygiene and sanitization').setHeading();

            new Setting(containerEl)
                .setName('Strip marketing trackers')
                .setDesc('Remove utm, fbclid, and other trackers from pasted urls.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.stripTrackingParameters)
                    .onChange(async (value) => {
                        this.plugin.settings.stripTrackingParameters = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- SECTION: DATAVIEW ---
        if (this.plugin.settings.enableDataviewExport) {
            new Setting(containerEl).setName('Dataview exports').setHeading();

            new Setting(containerEl)
                .setName('Export strategy')
                .setDesc('Where to save CSV files.')
                .addDropdown(dropdown => dropdown
                    .addOption('vault', 'To vault folder')
                    .addOption('dialog', 'Always ask with dialog')
                    .setValue(this.plugin.settings.dataviewExportStrategy)
                    .onChange(async (value) => {
                        this.plugin.settings.dataviewExportStrategy = value as 'vault' | 'dialog';
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.dataviewExportStrategy === 'vault') {
                new Setting(containerEl)
                    .setName('Vault export folder')
                    .addText(text => text
                        .setValue(this.plugin.settings.dataviewVaultPath)
                        .onChange(async (value) => {
                            this.plugin.settings.dataviewVaultPath = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // --- FOOTER ---
        containerEl.createEl('hr');
        const footer = containerEl.createDiv({ cls: 'alchemist-settings-footer' });
        footer.createSpan({ text: 'The alchemist: Crafted with love by kharizma & latreia ' });
        
        const donateLink = footer.createEl('a', { 
            text: '💖 Support development',
            href: 'https://boosty.to/obsidian-alchemist'
        });
        donateLink.setAttr('target', '_blank');
    }
}
