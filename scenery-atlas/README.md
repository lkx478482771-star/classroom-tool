# 你眼中最美的风景

一个面向合肥的城市风景社区。用户可以浏览和搜索风景、查看地标地图、注册登录、上传照片，并进行点赞、评分和文字评价。管理员可以审核内容、管理用户状态和角色。

项目默认使用浏览器 IndexedDB 运行本地演示模式，也可以切换到 Supabase，让不同设备上的用户看到同一批作品并互相点赞、评分和评价。

照片投稿采用“机器初筛 + 管理员终审”：浏览器先在本地检查分辨率、清晰度、曝光和色彩层次，保存完整初筛结果并送到待审核队列；只有管理员人工通过后，作品才会进入公开画廊。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开终端输出的本地地址即可访问。

管理员体验账户：

- 邮箱：`hello@hefei.demo`
- 密码：`hefei1234`

也可以在注册页面创建一个仅存在于当前浏览器的演示账户。

## 启用共享社区

1. 在 Supabase 创建项目，并在 SQL Editor 执行
   `supabase/migrations/202609220001_shared_community.sql`。
2. 在 Authentication 设置中关闭邮箱确认，以下流程即可注册后直接登录；生产环境建议开启邮箱确认。
3. 在 Authentication 的 URL Configuration 中把站点地址加入 Redirect URLs，例如
   `https://你的域名/classroom-tool/scenery-atlas/`。
4. 注册一个账户后，在 SQL Editor 执行以下语句授予管理员权限：

```sql
update public.profiles
set role = 'admin'
where nickname = '你的管理员昵称';
```

5. 本地开发时可以创建 `.env.local`：

```env
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

也可以编辑 `public/config.js`，把 `dataBackend` 改为 `supabase` 并填写相同两项。这个运行时配置也适用于已经构建好的 GitHub Pages 站点。

6. 重启开发服务器或重新部署。页面提示“共享社区”后，账户、作品、图片和互动都会写入 Supabase。

`VITE_SUPABASE_ANON_KEY` 可以放在前端；它受 PostgreSQL RLS 保护。绝不能把 `service_role` key 写入前端环境变量。

未配置 Supabase 变量时，项目会自动继续使用 IndexedDB 本地模式。照片存放在私有的 `scenery-images` bucket 中，未审核作品只对作者和管理员可见。

上传流程会先在浏览器端检查分辨率、清晰度、曝光和色彩层次，再由管理员完成人工终审。未审核内容只对作者和管理员可见，审核通过后才会进入公开画廊。

管理员后台位于 `/admin`，支持：

- 查看机器初筛分数和图片质量提示
- 批准或驳回作品，并填写审核备注
- 停用或恢复普通用户
- 将用户设为管理员或取消管理员身份

## 验证

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

- `pnpm test` 覆盖本地数据仓库、账户、图片初筛规则、管理员审核、用户管理、点赞、评分、评价权限和聚合计算。
- `pnpm test:e2e` 使用桌面与手机两种视口验证浏览、地图、上传、机器初筛、管理员终审、用户管理、互动、刷新持久化和注册流程。

## 技术说明

- React、TypeScript、Vite 和 React Router
- IndexedDB 本地数据仓库和可选 Supabase 数据仓库
- Supabase Auth、Postgres、Storage 和行级安全策略
- Leaflet 与 OpenStreetMap 地图
- Nominatim 地点搜索，失败时降级为合肥预设地点和地图手动选点
- 示例照片来自 Wikimedia Commons，署名和许可见 `public/images/ATTRIBUTION.md`

当前版本不包含举报处理、服务端图片安全扫描或远程 AI 审核。图片初筛仍在浏览器本地完成；正式运营时应把关键校验迁移到 Edge Function 或独立服务端。
