# <目录名> README

> [!NOTE]
> 当前文档类型：Module README

> 用一句话说明这个目录在做什么，以及读者为什么要看这份 README。

## 模块简介

说明这个目录覆盖什么边界。

```dot
digraph ModuleMindmap {
  graph [rankdir=TB, bgcolor="transparent", fontname="sans-serif"];
  node [fontname="sans-serif", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc", width=1.8];
  edge [fontname="sans-serif", color="#94a3b8", fontcolor="#475569"];

  root [label="模块", fillcolor="#dbeafe"];
  responsibility [label="职责", fillcolor="#fef3c7"];
  interface [label="入口", fillcolor="#fef3c7"];
  implementation [label="实现", fillcolor="#dcfce7"];
  responsibility_item [label="核心能力", fillcolor="#f8fafc"];
  interface_item [label="公共命令", fillcolor="#f8fafc"];
  implementation_item [label="关键组件", fillcolor="#f8fafc"];

  root -> responsibility;
  root -> interface;
  root -> implementation;
  responsibility -> responsibility_item;
  interface -> interface_item;
  implementation -> implementation_item;
}
```

## 职责边界

- 负责什么
- 不负责什么

## 入口与公共接口

- 关键入口文件
- 对外暴露的接口或命令

## 依赖关系

- 上游依赖
- 下游依赖

## 扩展方式

- 新增文件时遵循什么边界
- 哪些改动需要同步更新这里

## 相关文件

| 路径 | 说明 |
| --- | --- |
| `./example.py` | 示例入口 |

## 参考资料

- [上层文档](../README.md)
- [相关 spec](../docs/spec/README.md)
