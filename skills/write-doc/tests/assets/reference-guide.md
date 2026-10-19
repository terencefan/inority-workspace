# 示例工具 开发指南

> [!NOTE]
> 当前文档类型：开发指南

面向接手人的操作入口；机制细节见参考资料中的 authority 文档，本文不复制其正文。

## 快速开始

前置条件：工具链已安装、凭据经运行时注入。

```shell
scripts/demo/run.sh --suite demo --target sample-1
```

exit 0 = 通过；其余退出码按失败排查。

## 目录地图

| 路径 | 职责 |
| --- | --- |
| `scripts/demo/` | 运行入口与 suite 数据 |

## 判读口径

失败排查顺序：先 report 定位条目，再对照期望注释，最后查 authority；禁止改期望掩盖失败。

## 参考资料

| 文档 | 内容 |
| --- | --- |
| [设计 authority](https://example.com/demo-design-spec) | 机制与回归矩阵 |
| [局部说明](https://example.com/demo-readme) | 目录协作约定 |
