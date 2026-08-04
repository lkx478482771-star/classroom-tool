# 课堂整理工具

一个功能齐全的课堂管理 Web 应用，包含两个页面：

- `index.html`：课堂整理工具，支持课程管理、语音录音转文字、AI 笔记总结、待办管理、深色模式。
- `student-toolkit.html`：学生工具箱，支持绩点计算、考试倒计时、时钟与校历。

## 功能

- 课程管理与笔记记录
- 语音录音转文字（需 Chrome / Edge 浏览器，并授权麦克风）
- AI 智能总结课堂重点（需自行配置 OpenAI 兼容 API）
- 待办事项管理（优先级 / 截止日期）
- 深色模式
- 笔记搜索与置顶
- 离线可用（Service Worker 自动缓存）

## 目录结构

```text
assets/
  app.css       共享设计系统
  icons.svg     线性图标库
  favicon.svg   站点图标
  sw.js         离线缓存 Service Worker
index.html      课堂整理工具
student-toolkit.html  学生工具箱
```

## 使用

直接打开 `index.html` 即可使用，或部署到任意静态服务器（推荐 GitHub Pages）。首次在线访问后会自动缓存页面，弱网或断网时仍可打开。
