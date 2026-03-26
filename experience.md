# 项目运营手册

## 1) 项目目标与范围

- [ ] 目标：把一个可演示、可下单、可控库存、可后台运营的商店跑稳定。
- [ ] 覆盖范围：
  - 前台浏览、加购、结账、支付回跳
  - 后台登录、商品上下架、库存调整、首页文案、订单状态、订单备注
  - 订单入库、邮件通知、CSV 导出、重置种子数据
- [ ] 不在当前范围：
  - 复杂营销系统
  - 多仓/多币种/多税率
  - 真正的 ERP/WMS 对接

## 2) 前端/后端/服务器/数据库现状与职责

- [ ] 前端：`src/App.tsx` + `src/storeData.ts`
  - 负责页面展示、购物车、结账表单、后台操作界面
  - 后台右上角固定提供 `EN/CN` 小开关，切换仅影响后台界面文案
  - 后台右上角显示版本标识（短 commit / branch），用于核对“线上是否已更新”
  - 负责从 `/api/store` 拉取商品、订单、首页内容、配置状态
  - 负责把后台编辑动作提交到 API，不直接改存储文件
- [ ] 后端：`server.mjs`
  - 负责所有业务写入：商品、库存、订单、首页文案、重置、登录态
  - 负责 Flutterwave 支付回跳和 webhook 校验
  - 负责邮件通知和导出 CSV
  - 提供 `/api/version` 给运维核对当前部署分支与 commit
- [ ] 服务器：Node + Express 单进程启动
  - 开发态用 `npm run dev:full`
  - 生产态用 `npm start`，同时服务 API 和 `dist/`
  - `/api/*` 与静态页面共存，按 Host 区分前台和后台页面
- [ ] 数据库/存储：
  - 默认是文件存储：`data/store.json`
  - 配置 `DATABASE_URL` 后可切到 Postgres
  - `store.seed.json` 是重置源，不是运行时工作区
- [ ] 职责边界：
  - 前端只负责“发起和呈现”
  - 后端只负责“校验和落库”
  - 数据文件只作为后端持久化结果，不手工编辑运行态

## 3) 交互同步链路（上下架、首页文案、库存、订单）

- [ ] 商品上下架链路：
  - 后台勾选 `visible` / `archived`
  - 前端提交 `PATCH /api/products/:id`
  - 后端写入 store，再由前端重新拉 `/api/store?includeHidden=1&includeArchived=1`
  - 前台通过 `no-store + focus/visibility + 15秒可见态轮询` 保持与后台同步
  - 前台只展示 `visible !== false && archived !== true` 的商品
- [ ] 首页文案链路：
  - 后台编辑首页字段和 `heroProductId`
  - 提交 `PATCH /api/admin/homepage`
  - 后端校验 hero 商品是否存在，再写入 store
  - 前台从 `/api/store` 读取 `homepage.contentByLocale`
- [ ] 库存链路：
  - 后台手工加减库存走 `PATCH /api/products/:id/stock`
  - 下单前后端都会校验库存是否足够
  - 支付成功回跳或 webhook 成功后，后端才真正扣库存
  - 订单成交后库存必须和订单明细一一对应
- [ ] 订单链路：
  - 前台提交结账表单后先调用 `POST /api/checkout-session`
  - 后端先写 `pendingPayments`，再创建 Flutterwave 支付链接
  - 支付回跳或 webhook 校验通过后，后端创建订单并扣库存
  - 后台通过 `PATCH /api/orders/:id` 改状态和备注
- [ ] 复核点：
  - 任何“看起来改了但页面没变”的情况，先刷新 `/api/store`
  - 任何“已支付但没成单”的情况，查 `pendingPayments`、回跳参数和 webhook

## 4) 发布SOP与验收SOP

- [ ] 发布前检查：
  - 确认 `.env` 里最少有 `APP_BASE_URL`、`API_BASE_URL`
  - 如需真实支付，确认 `FLW_SECRET_KEY`
  - 如需邮件，确认 `RESEND_API_KEY`、`ORDER_FROM_EMAIL`
  - 如需后台登录，确认 `ADMIN_USERNAME`、`ADMIN_PASSWORD`
  - 先跑 `npm run build`，再跑 `npm run lint`
- [ ] 发布步骤：
  - 本地或 CI 构建前端
  - 启动 `server.mjs`
  - 验证前台域名、后台域名、API 域名是否与环境变量一致
  - 如果是前后端分离部署，确保 `CORS_ALLOWED_ORIGINS` 已放行
- [ ] 验收清单：
  - 打开 `/api/health`，确认 `ok: true`
  - 打开前台首页，确认商品、首页文案、购物车能正常显示
  - 走一单测试购买，确认支付链接能生成
  - 支付成功后，确认订单落库、库存扣减、邮件发送逻辑正常
  - 后台修改库存、上下架、订单状态后刷新页面，确认变更持久化
  - 用 `POST /api/reset` 验证回滚到种子数据流程可用
- [ ] 发布后巡检：
  - 查看服务日志是否有 webhook、邮件、支付校验报错
  - 抽查 1-2 个订单，确认金额、库存、状态、备注一致

## 5) 常见故障排查

- [ ] 前台空白或资源 404：
  - 先确认 `dist/` 是否已生成
  - 再确认 `npm start` 是否在当前环境启动
  - 检查 Host 是否被重定向到了错误域名
- [ ] `/api/store` 报错：
  - 先看 `data/store.json` 是否损坏
  - 再看 `DATABASE_URL` 是否配置正确
  - Postgres 模式下，确认表 `app_state` 已创建
- [ ] 后台登录失败：
  - 确认 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 已配置
  - 确认浏览器里 Cookie 没被拦截
  - 生产环境要确认 HTTPS 和 `secure cookie`
- [ ] 支付链接创建失败：
  - 确认 `FLW_SECRET_KEY` 有值
  - 确认 `API_BASE_URL` 能被 Flutterwave 回调访问
  - 看商品库存是否足够，商品是否已下架或归档
- [ ] 已支付但没有订单：
  - 查 `pendingPayments` 是否存在同一个 `tx_ref`
  - 查回跳参数 `status`、`transaction_id` 是否完整
  - 查 webhook 是否收到 `charge.completed`
- [ ] 订单有了但库存没变：
  - 查该订单是否已被重复处理
  - 查商品是否在回跳/ webhook 前已被后台改成不可售
  - 查库存写入是否被后续重置覆盖
- [ ] 邮件没发出去：
  - 确认 `RESEND_API_KEY`、`ORDER_FROM_EMAIL`、收件地址是否可用
  - 先接受“订单已创建但邮件失败”的状态，不要回滚订单

## 6) 多Agent协同规范（按需开启、不得闲置、分工边界、交接机制）

- [ ] 按需开启：
  - 只有在任务与该模块直接相关时才介入
  - 不要为了“顺手”去改无关文件
- [ ] 不得闲置：
  - 每个 Agent 必须有明确产出：代码、文档、验证结果、风险说明
  - 做完立即同步当前状态，避免重复劳动
- [ ] 分工边界：
  - 前端 Agent：界面、状态流、表单、展示文案
  - 后端 Agent：API、存储、校验、支付、邮件
  - 运维 Agent：环境变量、部署、回滚、日志、验收
  - 文档 Agent：手册、变更记录、操作步骤
- [ ] 交接机制：
  - 交接时必须写清：已改文件、未完成事项、风险点、验证方式
  - 交接内容要包含“下一步该看哪里”
  - 如果涉及同一条链路，先确认谁是最终写入者，避免双写
- [ ] 冲突处理：
  - 发现别的 Agent 已改同一文件，先读后合并，不要覆盖
  - 任何会影响库存、订单、支付的改动，必须先同步再提交

## 7) 后续待补系统建议

- [ ] 商品与库存：
  - 增加批量导入/导出
  - 增加低库存预警和补货提醒
  - 增加变更审计日志
- [ ] 订单与客服：
  - 增加订单搜索维度和标签
  - 增加退款/部分退款流程
  - 增加客服工单或备注模板
- [ ] 支付与风控：
  - 增加支付失败重试提示
  - 增加 webhook 幂等追踪
  - 增加异常订单告警
- [ ] 发布与运维：
  - 增加健康检查与自检页
  - 增加一键回滚脚本
  - 增加环境变量校验清单
- [ ] 文档：
  - 把 API 契约单独整理成接口清单
  - 把后台操作截图补齐
  - 把真实生产流程和演练流程分开写
