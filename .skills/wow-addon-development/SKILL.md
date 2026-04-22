---
name: wow-addon-development
description: Use when building, debugging, refactoring, reviewing, or documenting World of Warcraft addons. Covers .toc load order, Lua/XML addon structure, SavedVariables, event-driven UI code, Retail/Classic compatibility, Blizzard API wrappers, large-file Lua refactors, module extraction, and practical workflows for tracing bugs in addon data, filters, tooltips, windows, generated database files, and runtime error capture.
---

# WoW Addon Development

## Overview

Use this skill for World of Warcraft addon work: reading addon structure, adding features, debugging Lua/XML behavior, tracing SavedVariables issues, reviewing compatibility, documenting maintenance-relevant architecture, and doing low-risk Lua refactors.

Treat WoW addons as event-driven applications with strict load order. Diagnose in this order unless evidence points elsewhere:

1. `*.toc` load order and metadata
2. client/version compatibility
3. SavedVariables and runtime state
4. event registration and refresh flow
5. UI rendering and tooltip/window code
6. static data files and generated references
7. runtime error capture in BugGrabber/BugSack data

Treat offline validation as part of the normal workflow. Before asking the user to enter the game, first validate:

- `*.toc` structure, file existence, and load order
- Lua syntax and obvious undefined-global / nil-shape issues
- XML structure and template usage
- SavedVariables defaulting and migration logic
- pure data transformation code fed with mocked WoW API results

Do not claim offline validation proves runtime correctness. Event timing, protected APIs, combat lockdown, frame lifecycle, and client-specific widget behavior still require in-game verification.

## Quick Start

At the start of a WoW addon task, do these checks:

- read the root `*.toc`
- list top-level directories and identify `UI`, `Settings`, `Modules`, `Classes`, `Libs`, `Locales`, `db`, `assets`
- locate SavedVariables declarations
- locate slash command entry points
- locate minimap button, tooltip, and window/list files
- identify whether the addon uses wrapper APIs or direct Blizzard APIs
- identify whether data files are generated
- identify what can be validated offline before launching the game

If the addon is large, classify the codebase before editing:

- framework layer: init, wrappers, events, settings
- domain layer: objects, classes, modules
- presentation layer: windows, rows, tooltips, map buttons
- data layer: db, categories, generated references

Before entering the game, run the cheapest checks that fit the task:

- targeted searches for file existence, symbol ownership, and stale field names
- local lint/format/static validation if the repo has tools for it
- ensure local `lua` and `luac` are available for offline syntax/test checks; if they are missing, install them for the user before continuing with WoW addon validation
- `*.toc` consistency checks against actual file paths
- local tests for migration, sorting, filtering, and formatting code using mocked inputs
- for API-heavy WoW data flows, default to a mock-first closed loop: define the fixture contract, add or update an offline validator under `tools/validate_*.lua` or `tests/*.lua`, and only then ask the user for the smallest missing capture needed to complete that loop
- for changes in `API`, `Compute`, `Storage`, or compute-heavy filter logic in `Core.lua`, run at least one mocked path validation that exercises the changed branch before relying on `luac -p` alone
- if the change touches Blizzard API wrappers, verify the wrapper itself honors the mock override path instead of bypassing `API.UseMock()` through direct global calls
- inspection of previous runtime errors in `!BugGrabber` / `BugSack` when the user already reproduced the bug
- when touching a Blizzard API, look for current documentation first and prefer documented signatures over memory

## Refactor Workflow

Use this same skill for Lua refactors. Default to low-risk structural work over behavior changes.

1. Classify the target:
- `local-limit`: too many top-level locals or forward declarations
- `duplication`: repeated tables, enum maps, formatting logic, or cache helpers
- `module-split`: one file owns too many unrelated responsibilities
- `unsafe-refactor`: call contract, cache contract, or init order may break

2. Prefer the cheapest safe reduction first:
- remove unused top-level locals/constants
- inline single-use constants if readability does not suffer
- replace alias locals like `local X = addon.X` when they only save a few keystrokes
- move large static rule tables into a dedicated module
- move pure text/state helpers before moving UI render code

3. When splitting a large Lua file:
- extract pure functions and metadata tables first
- keep the original orchestrator file as the place that wires dependencies together
- load extracted files earlier in the `.toc` if the main file depends on them at load time
- if a helper is needed before its definition, either keep predeclaration or move it into a loaded module

4. Preserve contracts:
- multi-return helpers must keep the same positional returns
- cached-data readers and writers must agree on schema/version fields
- do not let display-order rules silently become scan-priority rules

5. Validate after each structural change:
- `luac -p` on every changed Lua file
- one mocked path for any changed compute/filter/cache branch
- search for old file paths or old symbol locations after moves

### Refactor heuristics

Prefer this order for top-level local reduction:
- delete unused locals
- replace alias locals with direct `addon.X` reads
- move static tables to modules
- move state/text helpers to modules
- only then split larger runtime logic

Good first extraction targets:
- difficulty/order rule tables
- constant label maps
- cache-schema helpers
- dashboard bulk-scan state/text helpers
- loot type / class metadata tables
- normalization helpers with no frame access

Bad first extraction targets:
- mixed UI render + state mutation blocks
- frame construction with many shared upvalues
- code that relies heavily on long chains of local forward references

Refactor guardrails:
- do not change gameplay semantics just to make the file smaller
- do not use `and/or` ternary style when the true branch may be `nil` or `false`
- do not refactor a helper behind `addon.*` if that changes return shape
- after file moves, update `.toc`, XML paths, `loadfile(...)` tests, and tools that read source by path

## Research-Backed Methodology

Use this five-round methodology when building or refactoring a non-trivial WoW addon. It is based on current public API references, Blizzard UI source, official forum guidance, and recurring patterns in mature local addons such as `SavedInstances`, `CanIMogIt`, `AllTheThings`, and `ElvUI`.

### Round 1. Bootstrap from the real load lifecycle

Treat the addon load lifecycle as the first architecture boundary:

- let the `.toc` define ownership and load order; do not treat it as boilerplate
- initialize or migrate SavedVariables in `ADDON_LOADED` for the specific addon
- use `PLAYER_LOGIN` for work that depends on the player world being ready and all startup addons already loaded
- if startup order feels confusing, inspect the AddOn loading process docs and the current `.toc` before touching runtime code

Practical rule:

- if a feature depends on persisted state, slash commands, frames, and other addon-owned modules, first decide which parts belong in file load, `ADDON_LOADED`, and `PLAYER_LOGIN`; many “UI bugs” are really bootstrap-order bugs

### Round 2. Prefer modern UI primitives and isolate legacy paths

For Retail UI work, do not guess from old snippets first:

- check current Blizzard UI source and modern menu guidance before copying older `UIDropDownMenu` patterns
- prefer the new Blizzard menu system where practical on modern Retail
- if the addon must support legacy dropdown/menu code, isolate that behind a compatibility helper instead of spreading `EasyMenu` / `UIDropDownMenu_*` calls through the codebase
- treat taint and protected-call bugs as architecture bugs, not cosmetic issues; once a path is tainted, the visible failure may happen far downstream

Practical rule:

- if a menu, map pin, or secure-ish widget starts throwing `ADDON_ACTION_BLOCKED`, inspect the taint source and widget family before adding more hooks or skins

### Round 3. Use events for truth and queue work for cost

Blizzard performance guidance and mature addon practice both converge on the same pattern:

- prefer events over repeated scans or broad `OnUpdate` work
- when Blizzard adds richer event payloads, use the payload to early-out instead of re-walking all state
- if an addon must handle bursty work, queue low-priority refreshes and process them with an explicit time budget
- use session-stable UI baselines when the user is actively reading a panel; do not let every runtime event immediately rewrite the visible page

Practical rule:

- classify refresh work into immediate, deferred, and user-confirmed buckets before wiring more events; if a panel feels “jumpy”, the problem is often over-eager event application, not missing data

### Round 4. Put Blizzard API drift behind wrappers and explicit data contracts

Retail, Classic, and patch-level drift make direct API use expensive:

- centralize Blizzard API compatibility in wrapper helpers instead of scattering `C_*` vs legacy global fallbacks everywhere
- select exact return positions from multi-return APIs; do not rely on memory for tuple shapes
- for data-heavy systems such as Encounter Journal, transmog, mounts, and pets, capture one real payload before designing the consuming logic
- treat “observed runtime state” and “capability” as different things: observed lockouts should annotate valid difficulties, not replace the valid difficulty list

Practical rule:

- build data flow as `raw API -> normalized helper -> compute -> render`; if the render needs to know a field, that field should be named and normalized before it reaches UI code

### Round 5. Debug against current source, real captures, and reusable fixtures

The old AddOn kit is not enough on its own:

- use exported/current UI source and live API docs as the primary reference before trusting old snippets or memory
- give the addon an in-game debug surface with copyable raw and normalized output
- prefer a slash-command-driven debug mode that enables the exact sections needed for the current bug and then switches the UI straight to the debug panel, so the user can produce one focused capture without manual checkbox setup
- convert recurring user-provided logs into reusable mocked fixtures for compute-layer validation
- distinguish historical runtime errors from current regressions by checking whether stack lines, locals, and SavedVariables shape still match the current source

Practical rule:

- if a bug touches filtering, sorting, lockout aggregation, collection state, or set progress, require one mocked or captured-path validation before calling the fix done
- when asking a user to reproduce an in-game bug, prefer one dedicated slash command like `/addon debug` that auto-enables the relevant debug sections for that path, captures the dump, and opens the debug view in one step

## Done Criteria

A WoW addon implementation or refactor is only done when:
- the file structure is simpler than before when structure changed
- path references are updated after moves
- syntax validation passes
- at least one changed behavior path is mock-validated when compute/state logic moved
- any remaining in-game-only checks are called out explicitly

