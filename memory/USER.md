# User preferences

- 开发和运维任务先推进已授权的实施与验证，到全部工作最后收尾时再创建或发送 PR；不要提前把 PR 流程作为执行前置条件。提交、推送和部署的必要质量门禁仍照常执行。
- 当需要修复问题时，必须优先做消除系统性根因、可复用且有回归验证的长期修复；禁止用只针对单个实例、单次运行或固定路径的临时补丁绕过问题。
- 当用户说“发给我”时，默认含义是：通过飞书发送给“范腾远”。
- 发送飞书群消息时，默认使用 bot 身份；除非用户明确要求用户身份。
- 每次汇报 SWE pipeline 生产进度时，必须给出 Pipeline Step 0–11 的 lane 数量分布，
  不能只汇报 Pod Running 数或正式交付总数。
- SWE pipeline 生产进度统一用 Markdown 表格汇报，只使用 Pipeline Step 0–11
  这一套正式编号，不得引入第二套 Step 层级或别名。
- 网络路由偏好：访问 GitHub 等公网 source、repository 和其他公网资源时，优先使用实验室 egress proxy；模型和 API 请求使用 closeai proxy。

## mihomo proxy 使用规范

- 宿主机 mihomo 通常监听 `127.0.0.1:7890`；该地址只对宿主机可达，不能直接填入 Kubernetes Pod、Docker dind 或远程节点的 proxy 配置。
- 访问公网失败时，先确认 mihomo 进程与监听端口，再确认执行环境到 proxy endpoint 的网络可达性；不要把“设置了 `HTTP_PROXY`”当作“代理已经可用”。
- GitHub、GitLab、`proxy.golang.org`、npm/PyPI 等公网 source 优先走 mihomo/实验室 egress proxy；S3、私有 Registry、集群 API 使用各自的内网 endpoint，不要强制经过公网 proxy。
- 将 loopback proxy 提供给远程 Pod 前，必须使用集群可达且范围受限的 proxy endpoint；禁止未经授权把 mihomo 监听扩大到 `0.0.0.0`。
