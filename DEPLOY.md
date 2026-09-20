# 部署说明

## GitHub Pages

当前项目可以直接作为静态站点部署：

1. 推送 `main` 分支。
2. 在仓库 `Settings → Pages` 中选择 `Deploy from a branch`。
3. 选择 `main` 和根目录。
4. 等待 GitHub Pages 构建完成。

项目包含 `.nojekyll`，不需要额外的构建命令。

## Netlify

1. 在 Netlify 中选择 `Add new site → Import an existing project`。
2. 连接 GitHub 仓库。
3. Build command 留空。
4. Publish directory 填 `.`。
5. 部署后检查首页、工具箱和课堂整理页面。

## Vercel

1. 在 Vercel 中选择 `Add New → Project`。
2. 导入 GitHub 仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空。
5. Output Directory 填 `.`。

## 数据迁移

静态站点之间不会自动同步数据。更换域名或部署平台时：

1. 在原站点进入“数据备份”。
2. 导出全部 JSON 文件。
3. 在新站点进入“数据备份”。
4. 导入该 JSON 文件并刷新页面。

备份包含专业模板、路线勾选、任务属性、倒计时、课表、竞赛和学习偏好，不包含 AI API Key 等敏感设置。

## 必须使用后端的场景

如果后续需要以下能力，就不能继续只依赖静态托管：

- 账号系统和登录鉴权
- 多设备实时同步
- 智慧安大或教务系统 API 对接
- 成绩单自动导入和课表自动拉取
- 数据库、权限和服务端日志

建议方案是保留当前静态前端，再增加一个小型后端服务，使用数据库保存用户数据，并通过 OAuth 或学校授权接口完成认证。

## 静态托管的已知限制

- 国内访问 GitHub Pages 偶尔较慢。
- 浏览器通知只在页面打开或浏览器后台运行时有效，不能做服务器推送。
- 外部链接会随学校或竞赛官网改版失效，需要人工维护。
- 所有个人数据默认只存在当前浏览器，清除缓存前必须备份。
