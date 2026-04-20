# Alchemist for Obsidian

Alchemist is a modular super-plugin designed for seamless data transmutation and vault hygiene. It consolidates multiple powerful features into a single, high-performance toolkit for Obsidian power users.

## Features

### TextBundle Export/Import
Preserve the sovereignty of your data. Export your notes with all linked assets (images, audio, PDFs) into a standardized .textbundle or .textpack format. Perfect for sharing notes with other apps or creating portable backups.
- Recursion Depth: Include linked notes up to 5 levels deep.
- Conflict Resolution: Smart hashing to detect identical files and avoid duplicates.
- TextPack Support: Compressed multi-note archives.

### Audio Converter (Desktop Only)
Transform your voice recordings into high-quality MP3s or FLACs without leaving Obsidian.
- Meta-Sync: Automatically extracts ID3 tags (Title, Artist, Date, Genre) from the note's YAML frontmatter.
- Cleanup: Option to delete the original heavy .webm files after successful conversion.
- FFmpeg Powered: Uses the industry-standard FFmpeg engine for crystal-clear quality.

### Dataview Table Export
Turn your dynamic Dataview queries into static, shareable CSV files with a single click.
- One-Click Export: Adds a subtle CSV button to every Dataview table.
- Silent Save: Configure a target folder in your Vault for distraction-free exporting.
- Traceability: Injects source note information and export timestamps into the CSV.

### Smart Paste Hygiene
Keep your Vault clean from the "digital footprint" of the web.
- UTM Stripping: Automatically removes tracking parameters from pasted URLs.
- Pure Interception: Surgical cleaning that doesn't break Obsidian's native formatting or code blocks.
- Manual Cleanup: A dedicated command to clean an entire document from trackers in one go.

---

## Installation

1. Install via Community Plugins in Obsidian (Search for "Alchemist").
2. For Audio Converter: Ensure ffmpeg is installed on your system and available in your PATH.
3. Enable the modules you need in the Alchemist settings tab.

---

## Support & Sponsorship

Alchemist is a labor of love, dedicated to the pursuit of digital purity and knowledge sovereignty. If it helps you in your workflow, consider supporting its continued evolution:

- [Buy me a coffee (Ko-fi)](https://ko-fi.com/kharizma)
- [Support on Boosty](https://boosty.to/kharizma)

---

## License

This project is licensed under the MIT License.
