# README 模板索引

不同类型的 README 使用不同的模板文件，不再共用一个大模板正文。

## 模板选择

- 项目 README：使用 [project-readme-template.md](./project-readme-template.md)
- API README：使用 [api-readme-template.md](./api-readme-template.md)
- 模块 README：使用 [module-readme-template.md](./module-readme-template.md)
- 文档索引 README：使用 [docs-index-readme-template.md](./docs-index-readme-template.md)

## 选择建议

- 文档位于仓库根目录时，优先使用 `project-readme-template.md`
- 文档主要讲接口、请求、响应和认证时，优先使用 `api-readme-template.md`
- 文档位于功能目录、包目录或子模块边界内时，优先使用 `module-readme-template.md`
- 文档主要承担导航作用时，优先使用 `docs-index-readme-template.md`

## 统一约束

- 优先选择最贴近文档边界的模板
- 不需要的章节可以删掉，但不要为了省篇幅把关键入口、边界和使用方式省掉
- 文档内容要优先服从本地仓库真实结构，而不是套模板凑齐章节
