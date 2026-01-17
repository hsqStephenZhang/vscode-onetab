# Change Log

All notable changes to the "better-vscode-onetab" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2026-01-17

### 🎉 First Major Release

This is the first stable release of better-vscode-onetab! A powerful tab management extension for VS Code.

### Features

#### Core Tab Management
- **Send tabs to OneTab** - Save individual, multiple, or all tabs with right-click context menu
- **Restore tabs** - Quickly reopen saved tabs and tab groups
- **Organize tab groups** - Rename, pin, tag, and categorize your saved tabs
- **Blacklist support** - Exclude specific files from being saved to OneTab

#### Advanced Features
- **Advanced send** - Send tabs to specific named groups
- **Search & filter** - List and search tab groups by name or tags
- **Drag & drop** - Reorganize tabs and groups with intuitive drag-and-drop
- **Import/Export** - Backup and restore your entire OneTab database

#### Smart Grouping
- **AI-powered auto-grouping** - Use Claude API to automatically categorize tabs by:
  - Directory hierarchy
  - File extension
  - File name patterns
  - Or mix multiple strategies

#### Git Integration
- **Branch tracking** - Automatically track and save tab state per Git branch
- **Branch switching** - Restore tab state when switching between branches
- **Branch migration** - Migrate tab state from one branch to another
- **Non-active branches view** - Browse and restore tabs from other branches

#### User Experience
- **Multiple tree views** - Separate views for active groups, branches, and tags
- **Inline actions** - Quick access buttons for common operations
- **Command palette integration** - All features accessible via commands
- **Localization ready** - Internationalization support (package.nls.json)

### Technical
- Built with TypeScript and webpack for optimal performance
- Comprehensive test suite with integration and unit tests
- Git extension integration for branch tracking
- Persistent storage using VS Code's storage API
- Support for VS Code 1.90.0 and above

### Known Limitations
- Blacklist logic has minor edge cases (tracked in code TODOs)

## [Unreleased]a

### Planned
- Support for additional LLM APIs (OpenAI, Gemini, etc.)
- Copilot integration for auto-grouping
- Theme-aware icons
- Enhanced serialization/deserialization code