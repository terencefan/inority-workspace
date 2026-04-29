# demo

`inority-slides` skill 的内置 slides 模板。

它继承了原先 `brand-fancy` 的品牌型滚动叙事实现，但当前权威模板名统一为 `demo`。

## 技术栈

- `Vite`
- `GSAP`
- `Lenis`

## 目标

- 让滚轮/触控板推进每一屏叙事
- 用 scroll-linked 动画和持续运动背景建立品牌感
- 保持交付物仍然是静态站

## 运行

```bash
cd /home/fantengyuan/workspace/inority-workspace/skills/inority-slides/assets/demo
npm install
npm run dev
```

## 结构

- `index.html`：静态入口
- `src/main.js`：Lenis + GSAP + ScrollTrigger 动画控制
- `src/styles.css`：视觉系统与版式
