---
name: benchmark
description: 编写、维护和校验性能压测、模型吞吐、延迟、资源利用率、基线晋升、统计显著性、精度门禁与优化实验报告。用户提到“压测”“benchmark”“吞吐优化”“性能基线”“实验矩阵”“GPU 利用率”“尾延迟”或需要比较控制组和实验组时使用。
---

# Benchmark

用于性能实验的设计、执行、记录和决策。

1. 先读取 [`../../SKILL.md`](../../SKILL.md) 中的 `Benchmark 文档格式`，遵循统一呈现契约。
2. 完整读取 [`MODE.md`](MODE.md)，按其中的方法冻结目标、约束、数据集、统计判定、资源和回收责任。
3. 新建文档使用 report mode 统一维护的 [`../report/templates/report-template.md`](../report/templates/report-template.md)，只保留文件前半部分的 Benchmark 主模板。
4. 定稿前从 `write-doc` skill 根目录执行 `scripts/docctl validate <benchmark-path>`。

本入口不维护另一份 benchmark 规则。格式以主 `write-doc` skill 为准，实验方法以 `MODE.md` 为准。
