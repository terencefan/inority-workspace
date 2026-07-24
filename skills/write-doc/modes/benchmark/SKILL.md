---
name: benchmark
description: 编写、维护和校验性能压测、模型吞吐、延迟、资源利用率、硬件剖面、推理框架评估、基线晋升、统计显著性、精度门禁与优化实验报告。用户提到“压测”“benchmark”“吞吐优化”“性能基线”“实验矩阵”“GPU 利用率”“硬件瓶颈”“SGLang”“vLLM”“尾延迟”或需要比较控制组和实验组时使用。
---

# Benchmark

用于性能实验的设计、执行、记录和决策。

1. 先读取 [`../../SKILL.md`](../../SKILL.md) 中的 `Benchmark 文档格式`，遵循统一呈现契约。
2. 完整读取 [`MODE.md`](MODE.md)，按其中的方法冻结目标、约束、数据集、统计判定、资源和回收责任。
3. 新建文档使用 [`templates/benchmark-template.md`](templates/benchmark-template.md)。
4. `统计方法` 下每个指标使用独立 H4 子标题，并依次提供 callout、fenced `katex` 公式和符号/单位说明；不得只用散文描述统计口径。
5. 默认由单一主 agent 串行负责代码、镜像、部署、压测、验收、文档和回收；可并行运行隔离的后端服务、客户端和指标脚本，但不把候选拆给多个 agent 并行推进。
6. 每轮先形成同窗硬件剖面和瓶颈判断，再用 `剖面证据 → 优化机制 → 预期硬件变化与吞吐收益` 预注册下一候选；SGLang/vLLM 等框架替换按架构级候选执行兼容性、契约、配对 TOST、吞吐和硬件门禁。
7. Ray Serve 动态合批实验必须采集实际 batch size、batch utilization、batch wait、batch execution、batch queue 和 replica ongoing；不得用配置的 `max_batch_size` 代替有效合批证据。
8. 定稿前从 `write-doc` skill 根目录执行 `scripts/docctl validate <benchmark-path>`。

本入口不维护另一份 benchmark 规则。格式以主 `write-doc` skill 为准，实验方法以 `MODE.md` 为准。
