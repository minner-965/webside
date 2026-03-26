# 独立站执行经验手册（Aster Supply）

## 1. 项目目标与当前定位
- 目标：把站点做成可运营的欧美杂货电商（前台可浏览/加购/结账，后台可登录管理商品、库存、订单、首页文案）。
- 部署形态：同一套服务承载两个域名入口。
  - 前台：`https://www.sexwomen.mom`
  - 后台：`https://admin.sexwomen.mom`
- 数据主源：Neon Postgres（Render 通过 `DATABASE_URL` 连接）。

## 2. 四层架构职责

### 2.1 前端（React + Vite）
- 前台职责：商品展示、分类浏览、商品详情、大面板加购、右侧购物车抽屉、结账入口。
- 后台职责：登录后管理商品（上架/下架/归档/恢复）、库存、首页文案、订单与导出。
- 前端原则：只发起操作，不作为最终数据源；所有关键状态以 API 回读结果为准。

### 2.2 后端（Express）
- 提供统一 API、权限校验、业务规则、支付回调处理、库存扣减、订单落库、导出能力。
- 管理端接口统一要求登录会话（账号密码 + HttpOnly Cookie）。
- 上下架语义固定：
  - 上架：`visible=true && archived=false`
  - 下架：`visible=false`

### 2.3 服务器（Render）
- 负责构建、启动、域名绑定、环境变量、日志与重启。
- 发布后先检查：
  - `/api/health`
  - `/api/version`

### 2.4 数据库（Neon Postgres）
- 生产最终真相来源，不再依赖前端本地状态。
- 结构化表：
  - `products`
  - `product_images`
  - `inventory_ledger`
  - `orders`
  - `order_items`
  - `homepage_content`
  - `admin_settings`
  - `pending_payments`

## 3. 关键同步链路（必须稳定）

### 3.1 商品上/下架同步
- 后台点击上/下架后，必须立即回读 `/api/store?includeHidden=1&includeArchived=1`。
- 前台显示依赖 `/api/store`，刷新后应立即体现变更。
- 连续操作必须稳定，不允许“第一次生效，第二次失效”。

### 3.2 库存同步
- 库存以数据库为准。
- 后台库存调整写数据库并写入 `inventory_ledger`。
- 支付成功后扣减库存并写库存流水。

### 3.3 首页文案同步
- 后台保存首页文案后写入数据库（`homepage_content`），前台刷新立即生效。
- hero 商品选择与文案属于运营配置，走同一保存链路。

### 3.4 购物车与详情交互
- 加购后自动弹出右侧购物车抽屉。
- 购物车数量支持 `- / 输入 / +`，当数量从 1 减到 0 时自动移除商品。
- 商品详情为大面板布局，购买区首屏可操作。

## 4. 当前后台功能清单
- 登录页（账号密码）与会话校验。
- EN/CN 后台界面切换（右上角小开关，刷新保持）。
- 分区导航（概览、商品发布、商品编辑、库存管理、首页文案、订单管理、系统维护）。
- 商品多图能力（上传 + URL，封面设置、排序、删除）。
- 批量与单品操作（上架/下架/归档/恢复/推荐）。
- 订单状态更新、内部备注、CSV 导出。
- 看板指标接口：`GET /api/admin/metrics?range=7d|30d|90d`（GMV、订单、AOV、退款率、热销 SKU、低库存）。
- 统一操作反馈 Toast（如“上架成功”自动消失；失败提示可见并可关闭）。

## 5. 发布与验收 SOP

### 5.1 发布前
- 检查环境变量：
  - `DATABASE_URL`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `APP_BASE_URL`
  - `API_BASE_URL`
  - 支付/邮件场景再检查 `FLW_SECRET_KEY`、`RESEND_API_KEY` 等。
- 工程检查：
  - `npm run build`
  - `npm run lint`

### 5.2 发布后（最少 4 步）
1. 打开前台，确认页面正常、可加购物车。  
2. 后台下架任意商品，前台刷新消失；再上架恢复。  
3. 后台改首页文案并保存，前台刷新可见。  
4. 访问 `/api/health`，确认 `{\"ok\":true,\"storage\":\"postgres\"}`。

## 6. 常见故障排查
- `Action needed: Admin credentials are not configured`：
  - 说明服务端缺 `ADMIN_USERNAME` / `ADMIN_PASSWORD`，在 Render 环境变量补齐并重启。
- 前台不更新：
  - 先看后台操作是否成功，再看 `/api/store` 返回是否已变更，最后清浏览器缓存。
- 购物车/详情弹层异常：
  - 先查样式冲突（详情 modal 与 checkout drawer 不应共享冲突规则）。
- 订单有支付无落库：
  - 查回调与 webhook 日志，确认 `pending_payments` 与订单入库流程。

## 7. 多 Agent 协作硬规范（长期执行）
- 主 Agent 负责总控、集成、验收与对外同步。
- 子 Agent 按模块分工，必须有文件边界，避免互相覆盖。
- 子 Agent 按需开启且不得闲置：完成一个任务后立即分配下一个可并行任务。
- 不得回滚他人改动；先理解后合并。
- 交接必须写清：
  - 改了哪些文件
  - 未完成项
  - 风险点与回归点

## 8. 后续迭代优先级建议
1. 管理端表格化再收紧（提高首屏信息密度）。  
2. 运营看板增加趋势图（GMV/订单/转化漏斗）。  
3. 商品媒体能力扩展（视频、批量导入）。  
4. 补监控与报警（支付失败率、库存异常、接口延迟）。  
