# Changelog

## [1.5.0](https://github.com/hsqStephenZhang/vscode-onetab/compare/v0.5.2...v1.5.0) (2026-01-23)

### Features

* add default keybindings ([0726281](https://github.com/hsqStephenZhang/vscode-onetab/commit/0726281ee7781391996f7ca95b472baf0c7e74de))
* add menu to file explorer view ([8f040a1](https://github.com/hsqStephenZhang/vscode-onetab/commit/8f040a168e9dcc9b135460a4e6477b49c2983986))
* better icons ([d7455d2](https://github.com/hsqStephenZhang/vscode-onetab/commit/d7455d2d51b06840a80e40df415c4191ebe22ddf))
* blacklist ([1907a0b](https://github.com/hsqStephenZhang/vscode-onetab/commit/1907a0be24d5b50dca0f3d3e90eb2f51395ed0b3))
* collapse group's tabs ([fd8c6df](https://github.com/hsqStephenZhang/vscode-onetab/commit/fd8c6df4a763cb1bb6f74ec5bcf7b4a46cb38ce5))
* friendly tags ([9f12058](https://github.com/hsqStephenZhang/vscode-onetab/commit/9f12058ed440e4b6e9af038bbad48073e7471c3c))
* reorder all tabs ([4bdf741](https://github.com/hsqStephenZhang/vscode-onetab/commit/4bdf741da7c157da933376b3f804dcec652ed85f))
* support drag for editor tabs into tabgroups ([6f3e974](https://github.com/hsqStephenZhang/vscode-onetab/commit/6f3e974bacbaf95e3d8f26999dbb3fbcc6a19177))
* support force remove tabitem ([d07c38d](https://github.com/hsqStephenZhang/vscode-onetab/commit/d07c38d2df0a903b3454a1e4993e62fd54293f4f))
* support import db ([e59d064](https://github.com/hsqStephenZhang/vscode-onetab/commit/e59d0648730dd6446fa83210830ab7595962a7de))
* support more tab types ([03f4fee](https://github.com/hsqStephenZhang/vscode-onetab/commit/03f4feee01a8e1f900bc148a73e0e563c8f6215b))
* support reorder tabs within the same group ([575d9f4](https://github.com/hsqStephenZhang/vscode-onetab/commit/575d9f4d4e9a64269f6cf8d710eb101faba1a249))
* support restore tab without removing from the group ([e36cdc6](https://github.com/hsqStephenZhang/vscode-onetab/commit/e36cdc60e691b0e9c815ea2f1f1bb6b4dcee351c))
* support restore tabs in a new window or column ([30e026a](https://github.com/hsqStephenZhang/vscode-onetab/commit/30e026a4e35193dd0651ef63e97aa6824849e20d))
* support trash tags from TagsProvider ([2cb0d22](https://github.com/hsqStephenZhang/vscode-onetab/commit/2cb0d2280c484a6d211e45dc7b8d748fdfad3f2a))
* use sqlite as storage ([2dea7b5](https://github.com/hsqStephenZhang/vscode-onetab/commit/2dea7b547fa9877a662b4a0c65421271516bc280))
* use vscode's language model to autogroup ([bab0409](https://github.com/hsqStephenZhang/vscode-onetab/commit/bab04097c9609f54e3724d01dba1660d8c455426))

### Bug Fixes

* add cmd to context subscriptions ([6e88bb8](https://github.com/hsqStephenZhang/vscode-onetab/commit/6e88bb8e27a8df4a88c778be8fc1b5e9c6cf6b23))
* adjust view sequence ([cfc8f5b](https://github.com/hsqStephenZhang/vscode-onetab/commit/cfc8f5b66b318cf9fbed7814dfaadb4dcf351033))
* allow user choose language model for autogroup ([1bebfb1](https://github.com/hsqStephenZhang/vscode-onetab/commit/1bebfb10f1bf68e969a8c2149d50e11c5cedfae9))
* always persist data after change ([2d6ec18](https://github.com/hsqStephenZhang/vscode-onetab/commit/2d6ec18c0cb8e25f6501d6ce1fb82708869aa0da))
* await close tabGroup task ([dc4311c](https://github.com/hsqStephenZhang/vscode-onetab/commit/dc4311c44566e9959187de2b50bc9bfc2fd9be6e))
* await sendTabs ([ee954f0](https://github.com/hsqStephenZhang/vscode-onetab/commit/ee954f06ac76bfe3796bf0ca69253f32c4a4c59f))
* branch restore ([5f576b8](https://github.com/hsqStephenZhang/vscode-onetab/commit/5f576b8c112db1e108c903a98774c31179b3888b))
* branch switch ([928a0c8](https://github.com/hsqStephenZhang/vscode-onetab/commit/928a0c83f2816c8ccca357685c2e3cbaf15d0876))
* clone tabs before merge ([60fca70](https://github.com/hsqStephenZhang/vscode-onetab/commit/60fca70aa1f3736fdcf11afcf479af5f604407ef))
* don't remove pinned group and tabs in merge ([93bf50a](https://github.com/hsqStephenZhang/vscode-onetab/commit/93bf50a461e0dc37ea1539e3a8027f12b8da27f2))
* downgrade @types/vscode version ([eab5919](https://github.com/hsqStephenZhang/vscode-onetab/commit/eab59193387cd971ef1bde6a127edc4df7643869))
* file watcher pattern for .git ([97565aa](https://github.com/hsqStephenZhang/vscode-onetab/commit/97565aad001896eac7a59e2b496d00f72070bedf))
* include selected tab in send left/right ([dc07c0c](https://github.com/hsqStephenZhang/vscode-onetab/commit/dc07c0c4d97081aae58261deb9a15ae49a0af255))
* increment default number or untitled group always by 1 ([d0e4827](https://github.com/hsqStephenZhang/vscode-onetab/commit/d0e48273db25c750207563e8b4c3e9e642af3e69))
* lint ([ba76311](https://github.com/hsqStephenZhang/vscode-onetab/commit/ba7631160d0910e9b10fbfa75aedac950268ff51))
* only remove dup tabs when it's morged ([1a8dc4e](https://github.com/hsqStephenZhang/vscode-onetab/commit/1a8dc4e7bee57de525af00e27471f493723ebab3))
* remove unused command ([1f3909c](https://github.com/hsqStephenZhang/vscode-onetab/commit/1f3909c1fa3a5209cb9c64dc128d2be6a939a49f))
* return actual group in getParent in TabsProvider ([4947e10](https://github.com/hsqStephenZhang/vscode-onetab/commit/4947e10d0872d70cd401386884b8eb047f6bed2f))
* select tabgroups(vscode) before operations ([a22f7e6](https://github.com/hsqStephenZhang/vscode-onetab/commit/a22f7e665dbdd533afe3e3a13ae7b2d2f9ca1ead))
* update group's access timestamp in cmds ([dabee65](https://github.com/hsqStephenZhang/vscode-onetab/commit/dabee6594905be3865524cd85fc709de6b9ee906))
* use deep clone in git branch switch ([0e008ec](https://github.com/hsqStephenZhang/vscode-onetab/commit/0e008ecddb3a88c7c837ea68d1e2d4fece6539ef))
* use relative path as the label ([5504e8e](https://github.com/hsqStephenZhang/vscode-onetab/commit/5504e8e706b8940239b7bba41d7f39a33fca6689))

### Reverts

* use vscode's storage instead of sql ([936948a](https://github.com/hsqStephenZhang/vscode-onetab/commit/936948a8f7d441eec73742a2586729deb10ce0bc))

### Code Refactoring

* remove class-transformer ([a6917b8](https://github.com/hsqStephenZhang/vscode-onetab/commit/a6917b8c85ceabcc17b187faf4ba7621b703de3d))
* update structure ([50318cf](https://github.com/hsqStephenZhang/vscode-onetab/commit/50318cfd2b3b55875250c572e4e1e9f9b64c77be))
* use category field for commands ([afc859c](https://github.com/hsqStephenZhang/vscode-onetab/commit/afc859ca3d942292227512811b02df91d4ac0083))
* use sqlite schema instead of json for storage ([271bd41](https://github.com/hsqStephenZhang/vscode-onetab/commit/271bd4106c5cfd73e1956a5ecc2fddfa1977ade6))

# Change Log

All notable changes to the "better-vscode-onetab" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.0] - 2026-01-19

### Added

- **Restore tab without removing** - New "Open(Keep in Group)" command allows you to restore tabs while keeping them in the group
- **Context menu support** - All inline button commands now available in right-click context menus for tab groups and tab items
- **Force remove tab** - New force remove command that allows removing tabs even from pinned groups (with confirmation dialog)

### Improved

- Enhanced user experience with more accessible commands through context menus
- Consistent confirmation dialogs for destructive operations

## [1.1.0] - 2026-01-18

### Added

- **Reorder tabs** - Reorganize tabs within the same group using drag and drop or selection
- **Reorder all tabs by groups** - Command to select and reorder multiple tab groups at once
- **Collapse tabs group** - Close all open tabs that belong to a specific group with one click

### Improved

- Better tab organization capabilities

## [1.0.1] - 2026-01-18

### Added

- **Blacklist support** - Added blacklist functionality to exclude specific files from being saved to OneTab

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
