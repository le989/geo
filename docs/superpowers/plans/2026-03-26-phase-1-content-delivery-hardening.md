# Phase 1 内容交付强化实施计划

> **给执行型开发代理：** 必须使用分步骤执行方式。所有任务使用 `- [ ]` 复选框追踪，先测试后实现，再做验证。

**目标：** 完成第一阶段三项核心能力：AI 审核闭环、生成结果自动进入编辑器和文章列表、发布前检查。

**架构思路：** 继续扩展现有以任务为中心的内容工作流，而不是另建一套文章系统。AI 审核、发布前检查、来源信息都绑定在现有内容实体上，并同时暴露给生成页和任务详情页。

**技术栈：** Next.js App Router、React 页面、Prisma/PostgreSQL、现有模型调用层、品牌检查工具、内容文本处理工具、任务流工具。

---

## 文件结构

### 需要修改的现有文件
- `prisma/schema.prisma`
  责任：为内容增加审核、检查、来源、编辑状态相关字段。
- `app/api/generate/route.ts`
  责任：生成成功后持久化内容，并触发 AI 审核与发布前检查。
- `app/api/generate/batch/route.ts`
  责任：让批量生成走同一套持久化、审核、检查逻辑。
- `app/api/tasks/route.ts`
  责任：在任务列表/详情接口中暴露审核、检查、来源等信息。
- `app/api/tasks/[id]/route.ts`
  责任：返回增强后的任务详情。
- `app/workbench/factory/page.tsx`
  责任：让生成结果变成可编辑内容，并展示 AI 审核和发布前检查卡片。
- `app/workbench/tasks/page.tsx`
  责任：在任务详情中展示相同的审核与检查信息。
- `lib/task-workflow.js`
  责任：如果引入新的推荐动作或状态文案，在这里统一维护。
- `lib/generation-prompts.ts`
  责任：补充 AI 审核 prompt 或检查 prompt 的辅助方法。
- `tests/task-workflow.check.js`
  责任：验证更新后的任务流逻辑。

### 需要新增的文件
- `lib/content-review.js`
  责任：统一处理 AI 审核与发布前检查逻辑、结构化解析与严重级别判断。
- `lib/article-store.js`
  责任：统一处理生成内容的持久化、来源信息、与任务的关系。
- `app/api/content/[id]/route.ts`
  责任：提供可编辑内容详情与更新接口。
- `app/api/content/route.ts`
  责任：提供文章 / 内容列表接口。
- `tests/content-review.check.js`
  责任：验证 AI 审核与发布前检查的结果结构。
- `tests/article-store.check.js`
  责任：验证内容持久化和来源元数据逻辑。

### 如果实现中体量过大可拆分
- `lib/publish-check.js`
  责任：把确定性发布前检查从 `content-review.js` 中拆出去。

---

## Chunk 1：共享能力与数据准备

### 任务 1：先补审核与持久化的失败测试

**文件：**
- 新建：`tests/content-review.check.js`
- 新建：`tests/article-store.check.js`

- [ ] **步骤 1：先写 AI 审核结构测试**

测试至少覆盖：
- 审核输出包含 `status / score / summary / issues / suggestions / risks`
- 模型输出异常时有稳定兜底结果
- 发布前检查有固定等级映射

- [ ] **步骤 2：运行测试，确认先失败**

运行：`node tests/content-review.check.js`
预期：因为 `lib/content-review.js` 不存在或能力不足而失败。

- [ ] **步骤 3：再写内容持久化测试**

测试至少覆盖：
- 生成内容会带来源信息保存
- 更新正文时不会丢失审核与检查结果
- 任务与内容关系保持稳定

- [ ] **步骤 4：运行测试，确认先失败**

运行：`node tests/article-store.check.js`
预期：因为 `lib/article-store.js` 不存在或逻辑不足而失败。

- [ ] **步骤 5：实现最小共享模块**

实现内容包括：
- 审核结果标准化
- 发布前检查计算
- 内容持久化辅助方法

- [ ] **步骤 6：重新运行测试，确认转绿**

运行：
- `node tests/content-review.check.js`
- `node tests/article-store.check.js`

预期：两者通过。

---

### 任务 2：扩展 schema 支撑审核 / 检查 / 来源信息

**文件：**
- 修改：`prisma/schema.prisma`
- 测试：`tests/article-store.check.js`

- [ ] **步骤 1：先补 schema 相关失败断言**

至少检查：
- AI 审核结果字段
- 发布前检查结果字段
- 来源字段
- 最后编辑时间字段

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/article-store.check.js`
预期：因 schema 未扩展而失败。

- [ ] **步骤 3：最小化修改 Prisma schema**

建议新增字段方向：
- `sourceType`
- `sourceLabel`
- `aiReview`
- `publishCheck`
- `lastEditedAt`

原则：
- 只增加 Phase 1 真实会用到的字段
- 能用 JSON/Text 就先别过度拆表

- [ ] **步骤 4：运行 schema 验证**

运行：
- `node tests/article-store.check.js`
- `cmd /c npm run prisma:generate`

预期：测试通过，Prisma client 能生成。

---

## Chunk 2：生成链路改造

### 任务 3：让生成结果成为可持久化、可编辑内容

**文件：**
- 修改：`app/api/generate/route.ts`
- 修改：`app/api/generate/batch/route.ts`
- 修改：`lib/article-store.js`
- 测试：`tests/article-store.check.js`

- [ ] **步骤 1：补持久化行为失败测试**

断言至少包含：
- 标题与正文被保存
- 来源信息存在
- 内容处于当前可编辑状态
- 与任务关系保留

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/article-store.check.js`
预期：持久化逻辑不完整而失败。

- [ ] **步骤 3：实现生成结果持久化**

要求：
- 单篇生成和批量生成走同一套逻辑
- 内容生成成功后立即持久化
- 默认来源先记录为当前生成请求来源
- 不再让正文只停留在临时前端状态里

- [ ] **步骤 4：重新运行测试，确认通过**

运行：`node tests/article-store.check.js`

---

### 任务 4：在生成后自动执行 AI 审核

**文件：**
- 修改：`app/api/generate/route.ts`
- 修改：`app/api/generate/batch/route.ts`
- 修改：`lib/content-review.js`
- 修改：`lib/generation-prompts.ts`
- 测试：`tests/content-review.check.js`

- [ ] **步骤 1：先补 AI 审核失败测试**

至少断言：
- 审核状态只会落在 `pass / revise / high_risk`
- 摘要非空
- 问题与建议字段即使异常也能稳定输出空数组

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/content-review.check.js`

- [ ] **步骤 3：实现 AI 审核逻辑**

生成成功后应：
- 调用审核 helper
- 存储结构化审核结果
- 即使审核失败也不能拖垮正文生成，只能走兜底结果

- [ ] **步骤 4：重新运行测试，确认通过**

运行：`node tests/content-review.check.js`

---

### 任务 5：加入确定性的发布前检查

**文件：**
- 修改：`lib/content-review.js`
- 修改：`app/api/generate/route.ts`
- 修改：`app/api/generate/batch/route.ts`
- 测试：`tests/content-review.check.js`

- [ ] **步骤 1：补发布前检查失败测试**

至少覆盖：
- 标题长度告警
- 禁用词命中失败
- 未提品牌告警或失败
- 正文为空失败

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/content-review.check.js`

- [ ] **步骤 3：实现发布前检查逻辑**

输出建议包含：
- 总体结果等级
- 各检查项状态
- 每项严重级别
- 推荐下一步动作

- [ ] **步骤 4：重新运行测试，确认通过**

运行：`node tests/content-review.check.js`

---

## Chunk 3：接口层补齐

### 任务 6：新增文章 / 内容列表与详情接口

**文件：**
- 新建：`app/api/content/route.ts`
- 新建：`app/api/content/[id]/route.ts`
- 修改：`lib/article-store.js`
- 测试：`tests/article-store.check.js`

- [ ] **步骤 1：先补接口结构失败测试**

至少期望接口返回：
- 标题
- 正文
- 来源信息
- AI 审核结果
- 发布前检查结果
- 时间信息

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/article-store.check.js`

- [ ] **步骤 3：实现最小内容列表 / 详情接口**

列表接口支持：
- 最近生成内容列表
- 后续可扩展筛选

详情接口支持：
- 获取当前可编辑正文
- 更新标题 / 正文
- 保留审核 / 检查 / 来源数据

- [ ] **步骤 4：重新运行测试，确认通过**

运行：`node tests/article-store.check.js`

---

### 任务 7：让任务接口返回审核与检查信息

**文件：**
- 修改：`app/api/tasks/route.ts`
- 修改：`app/api/tasks/[id]/route.ts`
- 修改：`lib/task-workflow.js`
- 测试：`tests/task-workflow.check.js`

- [ ] **步骤 1：先补任务接口失败断言**

要求任务详情能返回：
- AI 审核结果
- 发布前检查结果
- 来源信息
- 推荐动作信息

- [ ] **步骤 2：运行测试，确认失败**

运行：`node tests/task-workflow.check.js`

- [ ] **步骤 3：实现任务接口增强**

要求：
- 继续沿用当前任务主状态体系
- 不另起一套“文章状态”去替代任务状态
- 审核结果与任务状态相关联但不混为一谈

- [ ] **步骤 4：重新运行测试，确认通过**

运行：`node tests/task-workflow.check.js`

---

## Chunk 4：页面接入

### 任务 8：改造生成页

**文件：**
- 修改：`app/workbench/factory/page.tsx`
- 验证：`cmd /c npm run build`

- [ ] **步骤 1：如果可行，补轻量 UI 检查**

如果有合适切入点，可补简单断言；没有就用构建验证和人工 smoke 验证。

- [ ] **步骤 2：实现生成页 UI 改造**

页面应支持：
- 生成后自动进入可编辑状态
- 显示 AI 审核卡片
- 显示发布前检查卡片
- 支持保存、修改、重新审核
- 保持现有复制 / 导出能力

- [ ] **步骤 3：运行构建验证**

运行：`cmd /c npm run build`

---

### 任务 9：改造任务详情页

**文件：**
- 修改：`app/workbench/tasks/page.tsx`
- 测试：`tests/tasks-dialog-layout.check.js`
- 验证：`cmd /c npm run build`

- [ ] **步骤 1：如有必要，扩展弹窗布局检查**

仅在新增右侧信息卡片后会影响现有布局时补断言。

- [ ] **步骤 2：实现任务详情改造**

页面应展示：
- AI 审核摘要与问题项
- 发布前检查摘要与规则项
- 来源信息
- 推荐下一步动作

要求保持当前双栏弹窗结构稳定。

- [ ] **步骤 3：运行验证**

运行：
- `node tests/tasks-dialog-layout.check.js`
- `cmd /c npm run build`

---

## Chunk 5：最终验证

### 任务 10：完整回归验证

- [ ] **步骤 1：运行所有关键检查**

运行：
- `node tests/content-review.check.js`
- `node tests/article-store.check.js`
- `node tests/task-workflow.check.js`
- `node tests/tasks-dialog-layout.check.js`
- `node tests/content-text.check.js`
- `node tests/brand-guard.check.js`
- `node tests/runtime-stability.check.js`

- [ ] **步骤 2：运行完整构建**

运行：`cmd /c npm run build`

- [ ] **步骤 3：重启服务并检查健康状态**

运行：
- `cmd /c npm run service:restart`
- `cmd /c npm run service:status`
- `cmd /c npm run health:check`

预期：
- 服务运行在 `3301`
- 健康检查返回 `200 http://localhost:3301`

- [ ] **步骤 4：手动冒烟检查**

至少验证：
- 新生成一篇文章
- 文章自动保存并可编辑
- AI 审核出现
- 发布前检查出现
- 任务详情也显示同样信息
- 弹窗布局无回归

---

计划已保存到：`docs/superpowers/plans/2026-03-26-phase-1-content-delivery-hardening.md`
