# Profiling 模块

仅在 benchmark 需要定位 CPU、内存、锁、调度、I/O、系统调用或运行时热点时加载。Profiler 窗口属于诊断实验，不代替无探针性能基线。

## 先冻结问题

执行前只选择能改变下一决策的问题，例如：

- CPU 配额未打满，是下游等待、供给不足、锁/GIL、线程池还是串行阶段导致；
- CPU 已打满，时间主要消耗在业务代码、运行时、序列化、内存分配还是原生库；
- RSS、heap、分配速率或 GC 是否构成容量与尾延迟瓶颈；
- 是否存在 off-CPU 等待、锁竞争、磁盘/网络系统调用或调度抖动；
- profiler 证据是否足以把 Go、Rust、原生扩展或库替换登记为候选。

同时冻结目标进程/容器、资源 request/limit、输入集、请求契约、并发、上游/下游模型、采样时长、工具版本、停止条件、输出路径和清理 allowlist。

## 保持组件隔离

- 单组件 profiling 继续使用 Go 上游 loadgen，以及独立 Pod、独立资源配额和独立节点的下游 mock。
- 复现真实上游的 multipart/payload、数据分布、并发与背压；复现真实下游的响应契约、延迟分布、抖动、错误和限流语义。
- 目标组件固定 request=limit；同时采集 cgroup CPU、throttling、RSS、active、queue、吞吐、失败和延迟，避免只看火焰图。
- 不 attach 生产 Pod，不为生产容器临时放宽 `SYS_PTRACE`、`PERFMON`、seccomp、hostPID 或其他安全边界。需要权限时构建专用 profiler 镜像并部署独立资源。
- profiler 与无 profiler 窗口不可直接比较吞吐；探针开销必须单独记录。方向判断以无探针窗口为性能事实，以 profiler 窗口解释机制。

## 选择最小工具

| 问题 | 首选证据 | 说明 |
| --- | --- | --- |
| Python CPU 热点 | `py-spy` sampling flamegraph / speedscope | 优先无代码侵入采样；同时保留 native frame 能力与采样频率 |
| Python 调用次数与累计时间 | `cProfile` / `pstats` | 只用于独立诊断窗口；明确 tracing overhead，不能拿吞吐晋升 |
| GIL 与线程状态 | `py-spy` gil/thread 视图，加线程级 CPU | 区分持有 GIL、原生扩展释放 GIL、线程池等待 |
| Go CPU/heap/锁 | `net/http/pprof` CPU、heap、mutex、block profile | profiler endpoint 只暴露在实验网络，结束即删除 |
| Rust CPU/分配 | `perf`/采样火焰图与目标 allocator 指标 | 保留符号和构建 ID；禁止用无符号栈下结论 |
| on-CPU 原生栈 | `perf record` / eBPF sampling | 记录频率、call graph 模式、内核限制和丢样 |
| off-CPU、锁、I/O | off-CPU eBPF、mutex/block profile、`strace -c` | `strace` 仅用于短诊断，不能作为性能窗口 |
| heap、RSS、GC | 运行时 heap profile、分配速率、GC pause、cgroup memory | RSS 不等于 live heap；同时报告 page cache 与 working set 口径 |

工具不可用时，不用另一个不等价指标冒充。记录 `未取得（权限、符号、架构或镜像原因）`，再选择能回答同一问题的最低侵入替代方案。

## 执行顺序

1. 先运行无 profiler 的相邻并发 smoke，确认目标资源、实际 active/queue、CPU、throttling 和失败率。
2. 若 active 满但 CPU 未满，增加零延迟下游或固定延迟对照，先区分 compute 与 wait；不要直接归因语言运行时。
3. 部署相同镜像或只增加 profiler 的专用目标，完成 readyz 和单请求契约检查。
4. 预热后采集连续诊断窗口。sampling profiler 默认覆盖稳定区间；启动、拉镜像和 drain 不计入热点比例。
5. 同窗保存原始 profile、可读 summary、火焰图/speedscope、工具版本、命令参数、目标镜像 digest、时间戳和指标查询。
6. 分别解释 on-CPU、off-CPU、native、runtime、业务函数和不可解析栈；同时报告 inclusive 与 self 指标，禁止把累计时间当墙钟占比。
7. 用 `剖面证据 → 可验证机制 → 预期 CPU/吞吐/延迟变化` 登记下一个唯一变量候选。
8. 删除 profiler Pod、mock、loadgen、Service、ConfigMap、临时权限和本地大文件，并精确复核不存在。

短于 300 秒的 profiler 窗口可以定位机制，但不能晋升性能基线。正式性能候选仍需回到无 profiler 的连续 `3 × 300s` 窗口。

## 语言迁移判定

不要因为服务是 Python 就预设 Go/Rust 更快。按热点归属决策：

| 证据 | 默认方向 |
| --- | --- |
| 时间主要在下游 HTTP 等待、queue 或外部服务 | 不重写；先修 admission、连接池、背压、超时或下游容量 |
| 时间主要在 libjpeg/Pillow/OpenCV 等原生库 | 先验证库、解码次数、数据布局、copy 和 resize 算法；换外层语言未必改变热点 |
| 时间主要在纯 Python multipart、校验、逐字节处理、JSON 或调度，且 CPU/核成本是业务瓶颈 | 登记 Go/Rust 等价候选 |
| GIL/锁使单 Pod 无法利用冻结 CPU，而多进程/多 Pod 的成本或运维复杂度不可接受 | 比较多进程 Python、原生扩展、Go、Rust 四类候选 |
| 内存安全、零拷贝、可预测尾延迟或供应链约束是主目标 | 可以登记 Rust；仍需与 Go/Python 做同契约实测 |
| 现有 Python 已满足单位成本、延迟、失败率和扩缩容目标 | 保留 Python；不以理论性能发起迁移 |

迁移实验必须保持路由、状态码、header、超时、backpressure、prepared bytes 和数值输出完全等价；先做固定样本逐项 contract/输出对照，再做同资源、同窗、同 loadgen 的性能比较。实验前冻结最小实际效应门槛，不在看到结果后补阈值。只有性能、单位成本、稳定性和维护收益共同覆盖迁移成本，才建议替换。

## 结果记录

每个 profiling 实验至少记录：

- 问题、假设、工具/版本、目标镜像 digest、资源、节点、输入与并发；
- 无探针控制窗口与 profiler 窗口的起止时间、active/queue、CPU、throttling、RSS、吞吐、失败和延迟；
- top self/inclusive 函数或栈、样本占比、native/unknown/off-CPU 占比及原始资产；
- 探针开销与所有无效/作废窗口；
- 热点归属、证据级别、语言迁移判定和下一候选；
- profiler、mock、loadgen 与临时权限的回收证据。

对于 `py-spy record --format raw` 的 folded stack，可用
`scripts/summarize_pyspy_raw.py <input.raw> --output <summary.json>` 生成确定性的
leaf、inclusive frame 与完整 stack 摘要。
