# 基础组件链路

K8s 的基础组件可以按 Container -> Pod -> ReplicaSet -> Deployment -> Service 这条链路来理解：

1. Container：最小的运行单元，负责真正执行应用进程。
2. Pod：K8s 调度的最小单位，通常封装一个或多个紧密协作的 Container，并共享网络和存储上下文。
3. ReplicaSet：负责保证指定数量的 Pod 副本始终存在，某个 Pod 异常退出后会自动补齐。
4. Deployment：在 ReplicaSet 之上提供声明式发布能力，用来管理版本升级、回滚和副本调整。
5. Service：为一组 Pod 提供稳定的访问入口，让应用即使在 Pod 重建或 IP 变化时也能被持续访问。
