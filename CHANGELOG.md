# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-04-21

### Added
- **Audio Converter**: Support for video containers (`mp4`, `mov`, `mkv`, `avi`) to extract audio directly from video files.
- **Audio Converter**: Recursive folder conversion. Now you can convert entire folders of audio/video files at once.
- **Audio Converter**: Support for multiple file selection in the context menu.
- **Audio Converter**: Enhanced metadata extraction. Now supports note H1 headings as titles and `creation_date` YAML field for date tags.
- **Automation**: Added `version-bump.mjs` script for automated version synchronization.

### Fixed
- **TextBundle**: Critical fix for broken links during import. Links now correctly point to the `assets/` folder, ensuring full symmetry between export and import.
- **TextBundle**: Removed redundant aliases in markdown links when importing (no more `[[image.png|image.png]]`).
- **TextBundle**: Improved handling of Cyrillic characters in filenames and links.
- **Documentation**: Cleaned up non-renderable symbols in `README.md`.

### Security & Hygiene
- Improved Pure Logic separation in TextBundle features for better testability and reliability.
- Added comprehensive roundtrip tests for link integrity.

---

## [1.0.0] - 2026-04-15
- Initial public release of Alchemist.
- Modular architecture with TextBundle, Audio Converter, and Dataview Export.
