# 科技风项目管理 · MVP

纯 React + TypeScript + Vite 项目（**无第三方 UI 依赖**），黑底霓虹科技风。

## 功能
- 多项目 + 子项目树形管理（支持新增/删除）
- 任务管理：状态切换、标记完成、删除、截止日期、标签、快速新建
- 自动进度：项目/子项目/整体
- 仪表盘：任务总数、完成数、执行中项目数、整体进度
- 座右铭卡片
- 专注计时器（25/50/90）
- 搜索 / 状态筛选 / 标签筛选
- 到期提醒（浏览器通知）
- 数据导入/导出（JSON）

## 本地启动
```bash
pnpm i   # 或 npm i / yarn
pnpm dev # 或 npm run dev / yarn dev
```
打开终端输出的本地地址（通常是 http://localhost:5173/）。

## 构建与预览
```bash
pnpm build
pnpm preview
```

## 备注
- 所有数据存储在浏览器的 localStorage（键：`tech_pm_store_v3`）。
- 如果要改造成多人使用，可将存储替换为后端（如 Supabase/Firestore）。
