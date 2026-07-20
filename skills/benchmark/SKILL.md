---
name: benchmark
description: 编写、维护和校验性能压测、模型吞吐、延迟、资源利用率、基线晋升、统计显著性、精度门禁与优化实验报告。用户提到“压测”“benchmark”“吞吐优化”“性能基线”“实验矩阵”“GPU 利用率”“尾延迟”或需要比较控制组和实验组时使用。
---

# Benchmark

用于性能实验的设计、执行、记录和决策。

1. 先读取 [`../write-doc/SKILL.md`](../write-doc/SKILL.md) 中的 `Benchmark 文档格式`，遵循统一呈现契约。
2. 完整读取 [`../write-doc/modes/benchmark/MODE.md`](../write-doc/modes/benchmark/MODE.md)，按其中的方法冻结目标、约束、数据集、统计判定、资源和回收责任。
3. 新建文档使用 benchmark mode 内聚维护的 [`../write-doc/modes/benchmark/templates/benchmark-template.md`](../write-doc/modes/benchmark/templates/benchmark-template.md)，本 skill 不保存模板副本。
4. 定稿前从 `write-doc` skill 根目录执行 `scripts/docctl validate <benchmark-path>`。

本入口不维护另一份 benchmark 规则。格式以主 `write-doc` skill 为准，实验方法、模板和 validator 以 benchmark mode 为准。
