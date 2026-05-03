import { Editor, Notice } from 'obsidian';
import { IAlchemistModule, AlchemistContext } from '../../core/IAlchemistModule';
import { AlchemistSettings } from '../../settings';
import { stripTrackers } from './logic';

export class SmartPasteModule implements IAlchemistModule {
    public id = 'smart-paste';
    private context!: AlchemistContext;

    async load(context: AlchemistContext): Promise<void> {
        this.context = context;
        this.registerPasteHandler();
        this.registerCommands();
    }

    async unload(): Promise<void> {
        // Commands and events are automatically cleaned up if registered via plugin
    }

    async onSettingsChange(newSettings: AlchemistSettings): Promise<void> {
        this.context.settings = newSettings;
    }

    private registerCommands() {
        this.context.plugin.addCommand({
            id: 'clean-trackers-in-document',
            name: 'Clean trackers in current document',
            editorCallback: (editor: Editor) => {
                const content = editor.getValue();
                const cleaned = stripTrackers(content);
                if (content !== cleaned) {
                    editor.setValue(cleaned);
                    new Notice('Document cleaned from trackers');
                } else {
                    new Notice('No trackers found');
                }
            }
        });
    }

    private registerPasteHandler() {
        this.context.plugin.registerEvent(
            this.context.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
                if (evt.defaultPrevented) return;
                if (!this.context.settings.enableSmartPaste) return;

                const clipboardData = evt.clipboardData;
                if (!clipboardData) return;

                const text = clipboardData.getData('text/plain')?.trim() || '';

                // SURGICAL INTERCEPTION: Only intercept pure URLs
                const urlRegex = /^(https?:\/\/[^\s"'>]+)$/;
                if (text.match(urlRegex) && this.context.settings.stripTrackingParameters) {
                    const cleanUrl = stripTrackers(text);
                    if (cleanUrl !== text) {
                        evt.preventDefault();
                        editor.replaceSelection(cleanUrl);
                        new Notice('URL cleaned');
                    }
                }
                
                // Note: We no longer intercept rich HTML pastes to avoid breaking 
                // Obsidian's native formatting (like code blocks or auto-linking).
                // Users can use the "Clean trackers in current document" command instead.
            })
        );
    }
}
