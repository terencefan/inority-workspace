# Recon Phase 子文档

这个文件是 `runbook` 主 skill 的按需加载子文档，用于 runbook 体系中的只读侦察。

## 使用场景

- 规划态补证
- `team` 执行时的 reconnaissance lane
- `solo` / `team` 最终验收前的新开独立上下文只读 recon

## 边界

这个 phase 只拥有：

- 一个 reconnaissance 问题或待确认事实
- 被分配的主机或环境边界
- 只读侦察

不能：

- 执行变更
- 做修复
- 做验收
- 重写计划
- 把 scope 扩大到指定 reconnaissance 问题之外

## 开始前重读

- authority runbook 路径（如果存在）
- 主机或环境边界
- 待确认事实
- 只读边界
- 足以定位 heading 或证据目标的细节

缺任何一项就立即上抛，不要闷跑。

## 执行纪律

- 可以做 SSH / 上机只读检查、文件 / 配置 / 进程 / 网络 / 服务检查、外部文档查询、网页调研
- 如果工具有原生 `--dry-run` / `--check` / `plan` / `diff`，且可以确认不会写入真实状态，应执行一次并保留命令、退出码和关键输出
- dry-run 通过只证明命令形状大概率可行，不等同于执行授权
- dry-run 失败是规划输入，不要在 recon lane 里修命令

## 规划态并行 lane

规划态允许主 agent 并行启动多个 recon subagent，但每个 lane 必须满足：

- 问题原子化：只回答一个可独立判定的事实集合，例如单台主机容量、单个 namespace 资源、单条网络路径或单份上游 authority
- 边界不重叠：避免多个 lane 同时占用同一交互式 SSH 会话、轰击同一远端接口或重复扫描同一范围
- 上下文最小化：dispatch 只提供问题、目标环境、只读边界、必要路径和返回 schema，不附带主 agent 的预期结论
- 模型轻量化：运行时支持模型选择时，优先使用满足工具与推理要求的轻量模型；不支持时自然回退，不阻断 recon
- 产物只回传：subagent 不编辑 authority、spec 或共享记录，不调用 `runctl`，只向主 agent 返回证据

推荐返回 schema：

```text
lane: <稳定名称>
scope: <主机/namespace/URL/文件边界>
observed_at: <带时区时间>
commands: <关键只读命令及退出码>
confirmed: <已确认事实>
unknown: <未确认项>
conflicts: <与既有证据的冲突；无则 none>
impact: <对 ambiguity/risk/路径的影响>
```

主 agent 回收后必须：

1. 等待所有必需 lane 返回，非必需 lane 超时可标记未确认。
2. 检查证据是否仍在指定 scope、是否只读、时间是否足够新。
3. 对冲突结论做主 agent 复核或追加一个独立只读 lane，不以多数票替代事实。
4. 去重并区分已确认与未确认项，再更新 `ambiguity`、`risk` 和 authority。
5. 在用户可见的规划更新中汇报 lane 数量、覆盖范围和未确认项，不暴露凭据或冗长原始输出。

## 最终验收专用约束

如果当前 recon 用于 `## 最终验收`：

- 必须新开独立上下文，不能继承父线程或既有子代理上下文
- dispatch 只能包含 authority 路径、最终验收侦察问题、只读边界、待确认终态事实和返回格式
- 不要接收或依赖旧执行 / 验收证据作为通过依据

## 输出要求

回报应紧凑但真实，至少讲清：

- 当前边界
- 已确认事实
- 未确认项
- 对规划或执行路径的影响

并行 recon 还必须遵循本文件的统一返回 schema，便于主 agent 机械回收与交叉检查。
