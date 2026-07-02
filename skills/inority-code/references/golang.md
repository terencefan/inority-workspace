# Go / Golang

Use this reference when touching Go code in Inority repositories.

## Module Documentation

- Every meaningful Go module or independently owned package directory needs a `README.md`.
- For `internal/<module>` packages, treat each package directory as a module boundary when it has its own public responsibility, IO contract, pipeline stage group, shard/filter/rcloneio component, or test surface.
- Write or update these READMEs with `$write-doc` in README mode, using the `Module README` structure:
  `模块简介 / 职责边界 / 入口与公共接口 / 依赖关系 / 扩展方式 / 相关文件 / 参考资料`.
- A module README must explain what the module does, what it does not do, its entrypoints, its public types or functions, and where tests live.
- Do not copy a full spec into a module README. Link the spec and keep the README as a directory map.

## Constants

- Put package-level defaults, thresholds, stable names, mode strings, stage names, and config key names in `constants.go`.
- Prefer explicit constant names that show the domain and unit, for example `DefaultTargetShardSizeBytes` instead of `DefaultSize`.
- If a constructor needs a threshold or policy, pass the value explicitly from constants or config instead of hiding it inside the implementation.
- Do not scatter default values across `main.go`, stage files, tests, or flag definitions unless the value is test-local.

## Errors

- Put sentinel errors, stable error reason strings, and reusable validation errors in `errors.go`.
- Keep error names domain-specific, for example `ErrInvalidShardTargetSize` or `ErrUnsupportedImageFormat`.
- Use wrapping at call sites to add runtime context, but keep stable definitions in `errors.go`.
- If rejected records need machine-readable reasons, define the stable reason constants in `errors.go` or near the error definitions, not inline in filters.

## Package Layout

- Keep `main.go` light: parse CLI/config, validate top-level inputs, assemble modules, call the runner, and map errors to exit codes.
- For command packages, keep config structs, flag parsing, validation, and module config adapters in `config.go` instead of growing `main.go`.
- Split IO adapters, domain logic, filters, and shard writing into sibling `internal/<module>` packages when they can be tested independently.
- Each package should own one reason to change. Avoid packages that mix rclone IO, filtering policy, tar writing, and CLI parsing.

## Pipeline Stages

- Name stage implementation files with the `stage_` prefix, for example `stage_decode.go` or `stage_filter_size.go`.
- For filter pipelines, model results as `accepted` and `rejected` streams instead of ambiguous `in` / `out` names.
- Define a small filter interface when stages need to be freely composed. Constructors should receive all judging criteria explicitly, typically from constants or config.
- Keep each stage in its own file when the stage has independent policy, concurrency, metrics, or tests.

## Tests

- Add focused unit tests for constants-driven filtering behavior and error paths.
- Put tests for `foo.go` in the corresponding `foo_test.go` file. Avoid catch-all test files that group unrelated source files, for example `stage_filters_test.go`.
- Keep shared test helpers in a narrowly named helper file such as `test_helpers_test.go` or `<domain>_test_helpers_test.go` only when multiple `_test.go` files reuse them.
- Prefer table-driven tests for filters and shard grouping.
- Test package boundaries through exported constructors and interfaces rather than reaching into unrelated internals.
