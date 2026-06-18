# k8s 简介

- authority 文件：`docs/feishu/k8s-intro.authority.xml`
- 图表源稿：`docs/feishu/k8s-intro-section-1.dot`
- 图表发布稿：`docs/feishu/k8s-intro-section-1.rendered.svg`
- 飞书图表片段：`docs/feishu/k8s-intro-section-1.publish.xml`
- 飞书文档链接：https://aicarrier.feishu.cn/docx/Be2yd4MTNo2x0XxOj27cVEVfnkb
- 飞书文档 Token：`Be2yd4MTNo2x0XxOj27cVEVfnkb`
- 维护原则：后续优先修改 authority XML，再通过 `lark-cli docs +update` 同步远端，不再以分散 section 文件作为主稿
- 图表维护原则：关系型架构图优先修改 `.dot` 源稿，重新渲染 `.svg` 后再发布到飞书；不要直接把飞书里的 SVG whiteboard 当成唯一源稿
