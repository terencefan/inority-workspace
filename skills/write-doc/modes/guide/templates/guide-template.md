# <对象> <主题> 开发指南

> [!NOTE]
> 当前文档类型：开发指南

本指南面向接手 `<对象>` 的开发者，回答「怎么跑、怎么判读结果、出问题去哪查」。设计原理与稳定契约以外链 authority 为准，本文只保留操作入口，不复制其正文。

## 快速开始

前置条件：

- 依赖工具链已安装（版本要求见仓库 README）
- 凭据只经运行时注入，不进命令参数与日志

首跑命令：

```shell
# 单目标快速验证
scripts/demo/run.sh --suite demo --target sample-1
```

exit code 0 = 无非预期失败；其余退出码按失败排查，不许改期望掩盖。

## 常见任务

| 任务 | 命令 | 说明 |
| --- | --- | --- |
| 全量回归 | `scripts/demo/run.sh --suite all` | 新版本落地后必跑 |
| 保留现场 | `scripts/demo/run.sh --keep-on-failure` | 失败时保留产物供取证 |

判定项与期望只改数据文件；引擎改动必须保持领域无关。

## 排障入口

失败先看 `results/report.json` 定位失败条目，再对照 suite 数据文件里的期望与注释，最后按参考资料进入 authority 文档。

## 参考资料

| 文档 | 内容 |
| --- | --- |
| [设计 authority](https://example.com/demo-design-spec) | 机制、schema 与回归矩阵 |
| [局部说明](https://example.com/demo-readme) | 目录级协作约定与已知状态 |
