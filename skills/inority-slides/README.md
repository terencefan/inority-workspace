# Inority Slides

> 独立的 slides 规划与产出 skill。  
> A standalone skill for planning and producing slides projects.

## 模块简介 | Overview

`inority-slides` 负责把演示稿、汇报 deck、品牌 H5 slides 和 handbook 可内嵌 slides 项目从粗需求收敛到可交付结构。

它不再挂在 `runbook` 的模式分流里，也不承担运行手册职责。

## 入口与公共接口 | Entrypoints

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 规划说明：`references/slides-playbook.md`
- 模板：`references/slides-template.md`
- slides 控制入口：`scripts/slidesctl`
- 校验码表：`references/validator-error-codes.yaml`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | slides skill 的权威规则 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/slides-playbook.md` | slides 规划与交付约束 |
| `references/slides-template.md` | slides 规划文档模板 |
| `references/validator-error-codes.yaml` | `slidesctl validate` 的错误码与解释 |
| `scripts/slidesctl` | slides 初始化与校验入口 |
| `tests/` | `slidesctl` 的回归测试 |
