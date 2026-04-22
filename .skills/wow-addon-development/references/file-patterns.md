# File Patterns

Use this reference to map common WoW addon filenames to likely responsibilities.

## Root Files

- `Addon.toc`: load order, metadata, interface version, SavedVariables
- `Bindings.xml`: keybindings
- `embeds.xml`: embedded library includes
- `Localization*.lua`: locale tables, abbreviations, strings
- `Core.lua`, `base.lua`, `Init.lua`: top-level runtime setup
- `Commands.lua`: slash commands, link handling, debugging commands
- `Events.lua`: event registration and sequencing
- `DataHandling.lua`, `Cache.lua`: refresh, aggregation, cache management

## Directories

- `Libs/`, `lib/`: wrappers, utility code, third-party libs
- `Modules/`: behavior subsystems
- `Classes/`, `Types/`: object-specific logic
- `UI/`: shared rendering logic
- `UI/Windows/`: concrete windows and list definitions
- `Settings/`, `Options/`: configuration UI and defaults
- `Locales/`: localization modules
- `db/`, `Data/`: static data or generated databases
- `assets/`, `Media/`, `Textures/`: icons, sounds, fonts, art

## Heuristics For Large Addons

If a bug concerns:

- list rows, icons, progress text: check `Window Definitions`, row builders, color/icon helpers
- tooltip text or source path: check tooltip modules and object parent/source-parent relationships
- collection state: check classes for the specific object type plus account/character state handlers
- missing objects: check DB file loaded by `*.toc`, object construction, then filters
- settings toggles: check settings defaults, setting application hooks, then filter recompute paths
- cross-client issues: check wrapper APIs and `GameBuildVersion` gates first

## Generated Data Warnings

Treat files as generated unless proven otherwise when they include cues like:

- `DO NOT MODIFY MANUALLY`
- parser-generated headers
- huge flat lookup tables
- data-only files loaded by XML manifests

If a generated file appears wrong, identify the source-of-truth location before editing.
