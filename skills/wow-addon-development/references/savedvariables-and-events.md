# SavedVariables And Events

Use this reference when the task involves state ownership, refresh timing, cache invalidation, event sequencing, or runtime error history.

## Offline Validation Boundaries

You can usually validate these without entering the game:

- `*.toc` declarations, include order, and file existence
- Lua syntax, stale field names, and obvious nil-shape issues
- SavedVariables defaulting and migration behavior
- sorting, filtering, formatting, and aggregation logic
- compatibility wrappers when they are isolated behind thin helper functions

You cannot fully validate these offline:

- event timing and sequencing under the real client
- secure/protected API restrictions
- combat lockdown behavior
- widget lifecycle quirks and template behavior
- interactions with other installed addons

Use offline checks to narrow the failure surface before asking the user to reload.

## State Ownership Checklist

Classify every persistent value before editing:

- account-wide settings or progress
- per-character settings or progress
- profile data
- runtime cache derived from other sources
- one-session debug or temp state

Questions to answer:

- where is the variable declared in `*.toc`
- where are defaults initialized
- where is migration or version-upgrade logic
- when does the addon consider saved variables available
- which runtime objects mirror the saved data

Also test these database shapes locally whenever practical:

- no saved data at all
- current schema with valid values
- older schema with renamed fields
- partially populated or malformed entries from previous development builds

## Runtime Error Files

If the user has runtime error capture addons installed, inspect these locations before guessing:

- `World of Warcraft\_retail_\WTF\Account\<account>\SavedVariables\!BugGrabber.lua`
- `World of Warcraft\_retail_\WTF\Account\<account>\SavedVariables\BugSack.lua`

Use them to locate:

- exact error messages
- stack traces
- timestamps or sessions
- duplicate counts
- error class: Lua error, warning, XML warning, taint, protected call

Notes:

- the `BugSack` addon folder under `Interface\AddOns` is source code only
- error history normally lives under `WTF\...\SavedVariables`
- old records can remain after a fix; confirm whether the user reproduced the issue again
- captured line numbers refer to the source loaded in that session, not necessarily the file as it exists on disk now

If the user does not have `!BugGrabber` and `BugSack`, recommend installing them.

When a captured error appears inconsistent with the current file:

- compare the captured locals to the current SavedVariables schema
- compare the reported line number to the current file contents
- if the stack and current source do not align, treat the record as historical until the user reproduces it again

## Common Failure Modes

### Value always resets

Likely causes:

- wrong SavedVariables scope
- defaults reapplied after load
- data written into runtime cache but never saved
- typo in saved variable root table name

### UI control crashes on initialization

Likely causes:

- slider, dropdown, or checkbox reads a setting before migration/defaulting has run
- old schema fields still exist and the new field is nil
- malformed persisted values are being passed directly into widget setters

Fix pattern:

- normalize settings first
- clamp and type-convert values before assigning to UI controls
- prefer versioned SavedVariables migration instead of scattered nil checks

### UI does not reflect updated state

Likely causes:

- value changed but no redraw event fired
- redraw event fired before state localization completed
- cached search/tooltip/list data not invalidated
- different character/account view is being shown than expected

### State looks correct but filters still hide data

Likely causes:

- settings object cached older values
- filter module reads different state root than UI code
- recompute path not triggered after settings change

## Event Tracing Checklist

Map these pieces:

- game event registration point
- internal wrapper or event bus
- startup sequence (`OnLoad`, `OnStartup`, `OnInit`, `OnReady`, or equivalent)
- refresh sequence (`OnRefresh*`, recalculation, redraw)
- post-settings hooks
- cache wipe hooks

When a bug is timing-sensitive, determine:

- what event first changes the state
- what event recalculates data
- what event redraws UI
- whether any of those are deferred or queued

If the bug can be reproduced with mocked inputs before the event layer is involved, fix that first. Do not jump to event changes while the data layer is still unverified.

## Local Verification Recipes

### `*.toc` and file consistency

Validate:

- every file listed in `*.toc` exists
- XML files load after any templates they depend on
- Lua files load before XML if the XML references global functions they define
- `SavedVariables` names match the root tables used in code

### SavedVariables migration

Run the startup/defaults path against:

- an empty table
- a table in the current schema
- one or more older schemas with missing/legacy fields

Confirm:

- required keys are created
- old keys are migrated or discarded intentionally
- numeric and boolean fields are normalized
- malformed child entries do not crash sort or render code
- widget-facing settings are valid before panel initialization

### Mocked API validation

For addons with non-trivial logic, separate:

- collection layer: raw Blizzard API calls
- transformation layer: normalize and store data
- presentation layer: convert normalized data into text, rows, or tooltip content

Mock the collection layer locally and verify the transformation/presentation layers with deterministic inputs.

This is especially useful for:

- instance/raid lockout trackers
- tooltip row builders
- account/character aggregation
- settings-driven filters

## Minimal Fix Strategy

Prefer fixes in this order:

1. correct state ownership
2. correct event sequencing
3. correct cache invalidation
4. correct UI redraw trigger
5. UI fallback only if upstream state is inherently async

Avoid direct UI force-refresh spam unless the addon has no structured refresh path.

Before step 2, verify step 1 locally if possible. Many apparent event bugs are actually stale-schema or malformed-state bugs.
