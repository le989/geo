# GEO 内容工作台 · 产品优化 Spec

> **受众**：Codex
> **仓库**：`E:\TRAE\GEO\geo-factory-new - 副本 (2)`
> **技术栈**：Next.js 14 / React 18 / TypeScript / Tailwind CSS / Radix UI / PostgreSQL / Prisma
> **执行原则**：在现有代码基础上修改，不新建项目。每个 FEAT 作为独立分支，命名 `feat/FEAT-XX-功能名`。动手前先列出会改动的现有文件。
> **工作量**：S = 3-5天 / M = 1-2周 / L = 2-3周

---

## 优先级总览

| # | 功能 | 优先级 | 工作量 |
|---|------|--------|--------|
| 1 | 选题入口 Phase 1（规则推荐） | P0 | M |
| 2 | 首页角色化重设计 | P0 | M |
| 3 | 品牌约束高亮 + 量化卡 | P1 | L |
| 4 | 审核结果联动定位 | P1 | S |
| 5 | 样板 few-shot 注入 | P1 | M |
| 6 | 质量阈值拦截提示 | P1 | S |
| 7 | 批量生成差异化控制 | P1 | M |
| 8 | GEO 可见性查询 | P2 | L |
| 9 | 模型合规基准测试 | P2 | M |
| 10 | 品牌知识库时效性 | P2 | M |
| 11 | 任务协作通知 | P2 | M |
| 12 | GEO 评分透明化 | P2 | M |
| 13 | 选题入口 Phase 2（内容缺口分析） | P2 | M |
| 14 | 关键词与内容资产双向关联 | P3 | S |
| 15 | 选题入口 Phase 3（外部热点融合） | P3 | L |

---

## FEAT-01 · 选题入口 Phase 1（规则推荐）`P0` `M`

### 问题
没有选题入口。用户每次打开平台要先在外部想好题目再回来生成，平台是被动工具，使用习惯无法养成。

### 方案

**推荐逻辑（后端，每次请求实时计算）：**

```
1. 取 Keyword 表中 priority = 'high' AND status = 'active' 的词
2. 过滤掉 lastContentGeneratedAt > NOW() - 14天 的词
3. 按 priority DESC, lastContentGeneratedAt ASC NULLS FIRST 排序
4. 取前 10 条，每条附带：keyword / scene / channel / avgGeoScore
```

**前端展示：**
- 首页顶部卡片区「本周建议选题」，最多展示 5 条
- 每条显示：关键词 / 建议场景 / 建议渠道 / 历史平均 GEO 分（无数据时显示 `--`）
- 点击任意条目 → 跳转生成页，URL 带参数 `?keyword=xxx&scene=xxx&channel=xxx`，生成页读取参数自动预填
- 生成页顶部增加「从词库选题 ↓」按钮，点击展开完整推荐列表，支持按场景/渠道/分组筛选
- 每条推荐右侧有「忽略」按钮，30 天内不再展示该条

### Prisma Schema 变更

```prisma
model Keyword {
  // 在现有字段基础上新增：
  lastContentGeneratedAt DateTime?
  avgGeoScore            Float?
  topicSuggestions       TopicSuggestion[]
}

model TopicSuggestion {
  id         String   @id @default(cuid())
  keywordId  String
  keyword    Keyword  @relation(fields: [keywordId], references: [id])
  scene      String?
  channel    String?
  reason     String?
  status     String   @default("active") // active | dismissed
  dismissedUntil DateTime?
  createdAt  DateTime @default(now())

  @@index([keywordId])
}
```

### 新增 API 路由

```
GET  /api/v1/topics/suggestions          返回推荐列表
POST /api/v1/topics/suggestions/[id]/dismiss  忽略某条推荐
```

**avgGeoScore 更新时机：** 文章保存或 GEO 评分更新后，异步更新对应 keyword 的 avgGeoScore（取关联所有文章 geoScore 均值）。同步更新 lastContentGeneratedAt。

### 验收标准
- [ ] 首页展示「本周建议选题」，至少 3 条
- [ ] 每条包含：关键词、场景、渠道、历史平均 GEO 分
- [ ] 点击条目，生成页 keyword/scene/channel 参数自动预填
- [ ] 14 天内已生成内容的关键词不出现在推荐列表
- [ ] 「忽略」后 30 天内该条不再出现
- [ ] 生成页「从词库选题」按钮可正常展开列表

---

## FEAT-02 · 首页角色化重设计 `P0` `M`

### 问题
所有角色进来看到相同首页，功能入口平铺，新用户不知道从哪里开始。editor 看到 admin 面板用不到，admin 看到的编辑入口也不对。高频功能被低频功能淹没。

### 方案

读取当前用户 role（admin / editor / viewer），渲染不同首页布局：

**editor 首页区域：**
1. 本周建议选题（FEAT-01，最多 5 条）
2. 我的待处理（`status IN ['pending_produce','pending_rework'] AND assigneeId = currentUserId`）
3. 快速生成入口（primary 大按钮，最显眼位置）
4. 最近编辑（最近 5 篇，点击直接进编辑器）

**admin 首页区域：**
1. 任务看板概览（各状态数量 badge：待生产/待审核/待返工/已发布/失败）
2. 本周数据卡片：内容产量 / 平均 GEO 评分 / 品牌合规率
3. 高风险内容提醒（`auditResult = 'high_risk'` 的文章列表，红色标注）
4. 团队任务分布（各 editor 当前任务数）

**viewer 首页区域：**
1. 已发布内容列表（`status = 'published'`，只读）
2. 品牌资产库快捷入口（只读）

**导航折叠规则：**
版本管理、样板库管理、模型配置、词库管理 → 移入侧边栏「更多功能」折叠区，不占导航首层。

**主链路目标：** 「点击推荐选题 → 内容进入编辑器」≤ 3 次点击，不跨越超过 2 个页面。

### 涉及现有文件
- `app/(dashboard)/page.tsx` — 首页主入口，按 role 分支渲染
- `components/layout/sidebar.tsx`（或对应导航文件）— 折叠低频入口
- 新增 `components/home/EditorHome.tsx`
- 新增 `components/home/AdminHome.tsx`
- 新增 `components/home/ViewerHome.tsx`

### 验收标准
- [ ] editor 首页：推荐选题 + 待处理内容 + 快速生成入口可见
- [ ] admin 首页：任务状态数量 + 本周数据 + 高风险提醒可见
- [ ] viewer 首页：只读内容列表，无编辑/审核操作按钮
- [ ] 版本管理/模型配置不在导航首层展示
- [ ] 「点击推荐选题 → 内容进入编辑器」≤ 3 次点击

---

## FEAT-03 · 品牌约束高亮 + 量化卡 `P1` `L`

### 问题
品牌检查结果以独立报告输出，和编辑器正文两张皮。用户看了报告不知道正文哪里有问题，改起来靠猜。没有直观的品牌信息密度感知。

### 方案

**A. 编辑器内 inline 高亮**

后端生成/保存时对正文做品牌约束标注，返回带字符 offset 的标注数组：

```typescript
// 新增类型定义 types/brand.ts
export interface BrandAnnotation {
  type: 'brand_hit'       // 品牌名/核心卖点正确引用
       | 'forbidden'      // 禁用表述
       | 'source_suggest' // 可引用来源建议
       | 'inaccurate'     // 品牌信息表述偏差
  start: number           // 字符起始 offset
  end: number             // 字符结束 offset
  message: string         // hover 提示文本
  suggestion?: string     // 修改建议
}

export interface BrandMetrics {
  brandNameCount: number
  sceneCoverage: { covered: number; total: number }
  forbiddenCount: number
  sourceCitationCount: number
}
```

**高亮颜色规则：**

| type | 样式 | hover 显示 |
|------|------|------------|
| `brand_hit` | 绿色下划线 | message |
| `forbidden` | 红色背景高亮 | 禁用原因 |
| `source_suggest` | 蓝色虚线下划线 | 建议来源名 |
| `inaccurate` | 黄色背景高亮 | 修改建议 |

前端编辑器使用现有 decoration/mark 机制渲染 inline 样式。内容变动后防抖 500ms 重新请求。

**B. 侧边栏品牌量化卡**

固定在编辑器右侧边栏，保存或手动触发时更新，展示 BrandMetrics 四项数据。`forbiddenCount > 0` 时该行显示红色。

### 新增 API 路由

```
POST /api/v1/articles/[id]/brand-annotations
  Body:     { content: string }
  Response: { annotations: BrandAnnotation[], metrics: BrandMetrics }
```

### 验收标准
- [ ] 编辑器内禁用表述显示红色高亮，hover 展示禁用原因
- [ ] 品牌名正确引用显示绿色下划线
- [ ] 侧边栏量化卡展示：品牌名次数 / 场景覆盖 X/Y / 禁用词数 / 来源引用数
- [ ] 内容修改后 ≤ 500ms 重新标注，量化卡同步更新
- [ ] forbiddenCount > 0 时量化卡对应行红色显示

---

## FEAT-04 · 审核结果联动定位 `P1` `S`

### 问题
AI 审核给出「建议修改第三段」，用户需要手动找到对应段落。审核面板和编辑器来回切换摩擦感强。

### 方案

**后端：** 审核结果每条问题增加 `paragraphIndex` 字段（段落序号，从 0 开始，按换行/段落分割计算）。

```typescript
// 在现有 AuditIssue 类型上新增字段
interface AuditIssue {
  id: string
  type: 'suggestion' | 'warning' | 'high_risk'
  description: string
  paragraphIndex: number  // 新增
  suggestion?: string
}
```

**前端：** 审核结果面板每条问题右侧增加定位图标按钮（`LocateIcon`）。点击后：
1. 编辑器滚动到 `paragraphIndex` 对应段落
2. 该段落加 `highlight-pulse` class，CSS animation 闪烁 2 秒后移除
3. 光标移至该段落首位

### 验收标准
- [ ] 审核结果每条问题有定位图标按钮
- [ ] 点击后编辑器滚动到对应段落并高亮闪烁 2 秒
- [ ] 后端审核时正确计算并返回 `paragraphIndex`

---

## FEAT-05 · 样板 few-shot 注入 `P1` `M`

### 问题
样板库只展示供参考，没有真正注入生成过程。内容质量不稳定，同参数下输出结构差异大。

### 方案

**Prisma Schema 变更：**

```prisma
model Template {
  // 在现有字段基础上新增：
  exemplar  Boolean @default(false)
  // exemplar = true 表示「已验证高质量，可作为 few-shot 注入」
}
```

**生成时注入逻辑（后端 `/api/v1/generate` 或现有生成路由）：**

```typescript
async function getFewShotExamples(channel: string, scene: string): Promise<string[]> {
  const examples = await prisma.template.findMany({
    where: {
      channel,
      scene,
      exemplar: true,
      geoScore: { gte: 75 },
    },
    orderBy: [{ geoScore: 'desc' }, { createdAt: 'desc' }],
    take: 2,
    select: { content: true },
  })
  // 截取前 800 字避免超出 token 限制
  return examples.map(e => e.content.slice(0, 800))
}

// 在构建 system prompt 时：
const examples = await getFewShotExamples(channel, scene)
if (examples.length > 0) {
  systemPrompt += `\n\n以下是该渠道/场景下的优质参考示例，请参考其结构和表达风格：\n\n${examples.join('\n\n---\n\n')}`
}
// 无匹配样板时正常生成，不报错
```

**前端：** 样板库列表/详情页增加「设为 exemplar」开关（admin 和 editor 均可操作）。

### 验收标准
- [ ] 样板库详情页有「设为优质样板（exemplar）」开关
- [ ] 生成时若有匹配 exemplar（同 channel+scene，geoScore≥75），prompt 包含 few-shot 示例
- [ ] 开发模式下可在服务端日志中看到完整 prompt（验证注入）
- [ ] 无匹配 exemplar 时正常生成，无报错无异常

---

## FEAT-06 · 质量阈值拦截提示 `P1` `S`

### 问题
低质量内容（GEO 评分低）静默通过，用户不知道需要优化就直接保存发布。

### 方案

生成完成后，若 `geoScore < 55`，编辑器顶部渲染黄色提示条 `<LowQualityBanner>`：

```
⚠ 当前内容 GEO 评分较低（{score} 分），建议优化后再保存。
[查看优化建议]  [仍然保存]
```

- 「查看优化建议」：展开 GEO 分项明细（各维度扣分原因，复用 FEAT-12 组件）
- 「仍然保存」：正常保存流程，banner 消失，**不阻断**
- 用户手动编辑后重新触发评分，若 `geoScore ≥ 55`，banner 自动消失
- 阈值 55 作为常量定义在 `lib/constants.ts`，便于后续调整

### 验收标准
- [ ] geoScore < 55 时编辑器顶部出现黄色提示条，显示具体分数
- [ ] 「查看优化建议」可展开分项扣分原因
- [ ] 「仍然保存」可正常保存，不被阻断
- [ ] 重新评分后 geoScore ≥ 55，提示条自动消失

---

## FEAT-07 · 批量生成差异化控制 `P1` `M`

### 问题
批量生成同 channel+scene+brand 内容时，输出结构和措辞高度雷同。GEO 语境下重复内容可信度低，对 AI 引用反效果。

### 方案

**批量生成参数页新增「差异化维度」多选项：**

```typescript
// types/generate.ts 新增
export type DiversityDimension = 'angle' | 'audience' | 'opening'

export const DIVERSITY_OPTIONS = {
  angle: {
    label: '内容角度',
    values: ['问题视角', '解决方案', '案例故事', '数据论证'],
  },
  audience: {
    label: '目标受众',
    values: ['专业人士', '大众用户', '行业从业者'],
  },
  opening: {
    label: '开头风格',
    values: ['问答式', '观点式', '场景式', '数据引入'],
  },
}
```

批量 N 篇生成时，从各选中维度的 values 中轮流分配（round-robin），每篇 prompt 明确指定本篇的差异化指令。

**批次相似度检测（全部生成完成后执行）：**

```typescript
// lib/similarity.ts
import { TfIdf } from 'natural' // 或使用其他可用的 npm 包

export function checkBatchSimilarity(
  contents: string[]
): Array<{ i: number; j: number; score: number }> {
  const results = []
  for (let i = 0; i < contents.length; i++) {
    for (let j = i + 1; j < contents.length; j++) {
      const score = cosineSimilarity(contents[i], contents[j])
      if (score > 0.75) results.push({ i, j, score })
    }
  }
  return results
}
```

相似度警告显示在批次结果列表中，如：「第 2 篇与第 4 篇相似度较高（82%），建议修改后再使用」

### 验收标准
- [ ] 批量生成参数页有「差异化维度」多选（角度/受众/开头风格）
- [ ] 多篇生成时各篇 prompt 包含不同的差异化指令（日志可验证）
- [ ] 批次完成后，相似度 > 0.75 的文章对有警告标注和相似度数值
- [ ] 差异化维度为可选项，不选时按原有逻辑生成

---

## FEAT-08 · GEO 可见性查询 `P2` `L`

### 问题
GEO 评分是预测值，没有「发布后真实被 AI 引用」的数据。内容团队向上级汇报时没有真实数据支撑，平台价值难以持续被认可。

### 方案

**查询入口：**
- 文章列表每篇文章操作菜单增加「查询 AI 可见性」
- 品牌监测页增加「手动查询」入口

**查询流程：**
1. 用户选择关键词（默认带入文章关键词）+ 查询平台（多选：DeepSeek / 豆包 / Kimi / 通义千问）
2. 后端向各 AI 平台发送查询请求，解析回答中是否出现品牌名
3. 返回结果并存入 `VisibilityCheck` 表
4. 同一关键词同一平台 24 小时内重复查询，返回缓存结果并提示

**Prisma Schema 变更：**

```prisma
model VisibilityCheck {
  id             String   @id @default(cuid())
  articleId      String?
  article        Article? @relation(fields: [articleId], references: [id])
  keyword        String
  platform       String   // deepseek | doubao | kimi | qwen
  mentionCount   Int      @default(0)
  inTopAnswer    Boolean  @default(false)
  sentiment      String?  // positive | neutral | negative
  rawResponse    String?  @db.Text
  checkedAt      DateTime @default(now())

  @@index([articleId])
  @@index([keyword, platform, checkedAt])
}
```

**结果展示：**

| 平台 | 提及次数 | 是否首屏 | 情感 |
|------|----------|----------|------|
| DeepSeek | 2 次 | ✓ | 正面 |
| 豆包 | 0 次 | — | — |

品牌监测页可查看历史查询趋势图（按关键词+平台分组，折线图展示 mentionCount 变化）。

### 新增 API 路由

```
POST /api/v1/visibility/check
  Body:     { articleId?, keyword, platforms: string[] }
  Response: { results: VisibilityCheckResult[], cached: boolean }

GET  /api/v1/visibility/history
  Query:    keyword?, platform?, startDate?, endDate?
  Response: { checks: VisibilityCheck[] }
```

### 验收标准
- [ ] 文章操作菜单有「查询 AI 可见性」入口
- [ ] 查询结果展示：平台 / 提及次数 / 是否首屏 / 情感
- [ ] 结果存入数据库，品牌监测页可查看历史趋势
- [ ] 同关键词+平台 24 小时内重复查询返回缓存并提示

---

## FEAT-09 · 模型合规基准测试 `P2` `M`

### 问题
不同模型对品牌约束的遵从度差异大。团队切换模型后，内容合规性可能悄悄变差，没有任何提示。

### 方案

**模型管理页新增「运行合规测试」按钮：**

测试流程：
1. 用当前品牌知识库中的品牌信息 + 3 条禁用表述，构造标准测试 prompt
2. 调用目标模型生成一段内容
3. 对输出跑品牌约束检查（复用现有品牌检查逻辑）
4. 计算三项得分：禁用词规避率 / 品牌信息引用准确率 / 结构遵从率
5. 结果存入 `ModelComplianceTest` 表

**Prisma Schema 变更：**

```prisma
model ModelComplianceTest {
  id                   String   @id @default(cuid())
  modelId              String
  model                Model    @relation(fields: [modelId], references: [id])
  forbiddenAvoidRate   Float    // 禁用词规避率 0-1
  brandAccuracyRate    Float    // 品牌信息准确率 0-1
  structureScore       Float    // 结构遵从率 0-1
  overallScore         Float    // 综合得分 0-100
  testContent          String   @db.Text
  testedAt             DateTime @default(now())

  @@index([modelId])
}
```

**模型列表新增「合规得分」列，** 展示最近一次测试的 overallScore，支持按分数排序。

**切换默认模型警告：** 当目标模型从未做过合规测试时，弹出确认弹窗：「该模型尚未完成品牌约束测试，建议先测试再设为默认。」用户可选择「先测试」或「仍然设为默认」。

### 验收标准
- [ ] 模型管理页有「运行合规测试」按钮
- [ ] 测试结果展示：禁用词规避率 / 品牌信息准确率 / 综合得分
- [ ] 模型列表有「合规得分」列，支持排序
- [ ] 切换至无测试记录的模型时弹出警告确认

---

## FEAT-10 · 品牌知识库时效性 `P2` `M`

### 问题
品牌知识库从官网抓取后不会自动同步。品牌声明、产品线、禁用词随业务变化，如果生成时引用过期信息，存在品牌合规风险。

### 方案

**Prisma Schema 变更：**

```prisma
model BrandKnowledge {
  // 在现有字段基础上新增：
  fieldsUpdatedAt Json?   // 各字段最后更新时间，结构：{ fieldName: ISO8601string }
  changeLog       BrandChangeLog[]
}

model BrandChangeLog {
  id              String        @id @default(cuid())
  brandId         String
  brand           BrandKnowledge @relation(fields: [brandId], references: [id])
  field           String        // 变更的字段名
  oldValue        String?       @db.Text
  newValue        String?       @db.Text
  changedBy       String        // userId
  changedAt       DateTime      @default(now())

  @@index([brandId])
}
```

**字段级过期提醒：** 知识库页面每个字段旁显示「上次更新：X 天前」。超过 90 天未更新的字段显示黄色警告角标 ⚠。

**重抓取更新流程：**
1. 用户点击「从官网更新」手动触发（复用现有抓取逻辑）
2. 抓取结果与当前值做 diff，以新旧对比形式展示（类似 git diff，旧值红色删除线 / 新值绿色）
3. 用户逐字段勾选确认后提交，写入数据库并记录变更日志
4. 支持设置定期自动抓取（每 30 天），自动抓取后若有变更，在知识库页面显示「有待确认的更新」提示

**变更历史 tab：** 知识库页面新增「变更历史」tab，展示变更日志列表（时间 / 字段 / 修改人 / 新旧值）。

### 验收标准
- [ ] 知识库每个字段显示「上次更新时间」
- [ ] 超过 90 天未更新的字段有黄色警告角标
- [ ] 「从官网更新」触发后以 diff 形式展示变更，需用户逐字段确认
- [ ] 变更历史 tab 可查询所有修改记录

---

## FEAT-11 · 任务协作通知机制 `P2` `M`

### 问题
任务状态流转没有通知。内容从「待审核」变成「需返工」，负责人不知道，只能靠口头通知或定时刷看板，协作效率低。

### 方案

**触发规则：**

| 触发事件 | 通知接收人 | 优先级 |
|----------|------------|--------|
| 任务变为「待审核」 | 所有 admin | 普通 |
| 任务变为「待返工」 | 任务 assignee（editor）| 重要 |
| 任务指定新负责人 | 新负责人 | 普通 |
| 审核结果 = high_risk | 所有 admin | 紧急（红色） |
| 任务逾期（超过 deadline）| assignee + 所有 admin | 重要 |

**Prisma Schema 变更：**

```prisma
model Notification {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  type       String   // task_review | task_rework | task_assigned | high_risk | overdue
  title      String
  body       String
  relatedId  String?  // articleId 或 taskId
  relatedType String? // article | task
  read       Boolean  @default(false)
  priority   String   @default("normal") // normal | important | urgent
  createdAt  DateTime @default(now())

  @@index([userId, read])
  @@index([createdAt])
}
```

**前端：**
- 顶部导航栏增加「通知」图标（Bell），有未读时显示红点（未读数 ≤ 99，超过显示 99+）
- 点击展开通知下拉面板：列表展示时间 / 事件描述 / 关联任务链接
- 支持筛选：全部 / 未读 / 任务相关 / 系统
- 点击通知跳转到对应任务/文章详情页，同时标记为已读
- urgent 级别的通知在面板中以红色背景显示

**邮件通知（可选，默认关闭）：**
- 用户个人设置页增加邮件通知开关（默认 OFF）
- 开启后，important 和 urgent 级别的通知发送邮件
- 邮件模板：事件描述 + 「查看详情」按钮链接

**通知生成时机：** 在任务/文章状态变更的 service 层触发，写入 Notification 表后异步发送邮件（若开启）。

### 新增 API 路由

```
GET    /api/v1/notifications              获取当前用户通知列表
PATCH  /api/v1/notifications/[id]/read    标记单条已读
PATCH  /api/v1/notifications/read-all     全部标记已读
GET    /api/v1/notifications/unread-count 获取未读数（轮询用，5s间隔）
```

### 验收标准
- [ ] 任务状态流转时，对应接收人收到站内通知
- [ ] 顶部导航有未读数角标
- [ ] 通知面板支持全部/未读筛选
- [ ] 点击通知跳转到对应任务，并标记已读
- [ ] urgent 通知以红色背景显示
- [ ] 用户可在设置中开关邮件通知

---

## FEAT-12 · GEO 评分透明化 `P2` `M`

### 问题
GEO 评分对团队是黑盒——知道得了 65 分，但不知道扣在哪里、该怎么提高。评分变成装饰性数字而非优化指引。

### 方案

**评分维度定义（在现有评分逻辑基础上扩展）：**

```typescript
// lib/geo-score.ts 新增/修改
export interface GeoScoreDimension {
  key: string
  label: string
  weight: number        // 占总分比例
  score: number         // 本维度得分（0-满分）
  maxScore: number      // 本维度满分
  reason: string        // 扣分原因（一句话）
  suggestion: string    // 优化建议
  tooltip: string       // 维度说明（hover 显示）
}

export interface GeoScoreResult {
  total: number                    // 总分 0-100
  dimensions: GeoScoreDimension[]
}

// 建议维度（可根据现有评分逻辑调整）：
const DIMENSIONS = [
  { key: 'structure',  label: '结构化程度',   weight: 0.25, tooltip: '是否有清晰的标题层次和段落结构' },
  { key: 'brand',      label: '品牌信息密度', weight: 0.20, tooltip: '品牌核心卖点覆盖数与内容体量的比例' },
  { key: 'citation',   label: '来源引用',     weight: 0.20, tooltip: '是否引用了知识库中推荐的权威来源' },
  { key: 'qa',         label: '问答覆盖度',   weight: 0.20, tooltip: '是否包含用户常见问题的解答结构' },
  { key: 'authority',  label: '权威性表达',   weight: 0.15, tooltip: '数据引用、专业术语、具体案例的密度' },
]
```

**编辑器侧边栏展示：**
- 总分环形图（大数字居中）
- 各维度横向进度条（标签 / 得分/满分 / 进度条）
- 每个维度旁有「?」图标，hover 显示 tooltip 说明评分逻辑
- 点击维度展开：扣分原因（一句话）+ 优化建议（可操作的具体步骤）
- 分项随正文内容修改实时更新（防抖 1s）

### 验收标准
- [ ] 编辑器侧边栏展示总分 + 至少 4 个子维度分项得分
- [ ] 每个分项有扣分原因说明
- [ ] 维度名称有「?」tooltip 说明评分逻辑
- [ ] 分项随正文修改实时更新（防抖 1s）
- [ ] 点击分项可展开优化建议

---

## FEAT-13 · 选题入口 Phase 2（内容缺口分析）`P2` `M`

### 问题
关键词词库里有词，但内容库里没有对应内容，这个缺口目前不可见，团队不知道哪里需要补充内容。

### 方案

**缺口定义：**
- 该关键词在某 scene + channel 组合下，内容数 = 0
- 或该组合下最近内容 geoScore < 60（质量缺口）

**缺口扫描（定期任务，每天凌晨跑一次）：**

```typescript
// jobs/scan-content-gaps.ts
async function scanContentGaps() {
  const keywords = await prisma.keyword.findMany({
    where: { status: 'active' },
    include: { articles: { select: { scene: true, channel: true, geoScore: true } } }
  })

  const gaps = []
  for (const kw of keywords) {
    for (const scene of kw.scenes) {         // 假设 keyword 有关联 scenes
      for (const channel of kw.channels) {   // 假设 keyword 有关联 channels
        const related = kw.articles.filter(a => a.scene === scene && a.channel === channel)
        if (related.length === 0) {
          gaps.push({ keywordId: kw.id, scene, channel, gapType: 'missing' })
        } else if (Math.max(...related.map(a => a.geoScore ?? 0)) < 60) {
          gaps.push({ keywordId: kw.id, scene, channel, gapType: 'low_quality' })
        }
      }
    }
  }
  // 写入 content_gaps 表或更新 topic_suggestions
}
```

**前端展示：**
- 首页「本周建议选题」列表中，缺口类型的推荐条目加「缺口」角标（橙色）
- 关键词详情页显示各 scene+channel 组合的内容覆盖状态（有内容/缺口/质量低）
- 点击缺口条目 → 直接进入生成页并预填参数

### 验收标准
- [ ] 每天自动扫描内容缺口并更新推荐列表
- [ ] 缺口类推荐条目有「缺口」或「质量低」角标
- [ ] 关键词详情页展示 scene+channel 维度的覆盖状态
- [ ] 点击缺口条目可直接进入生成页并预填

---

## FEAT-14 · 关键词与内容资产双向关联 `P3` `S`

### 问题
词库记录了使用次数，但团队看不到「某关键词对应内容质量如何」。不知道哪些词值得继续做，哪些词出来的内容总是差。

### 方案

**关键词详情页新增内容统计区域：**

```typescript
// 新增接口，聚合该关键词关联内容的质量数据
GET /api/v1/keywords/[id]/content-stats
Response: {
  totalCount: number
  avgGeoScore: number
  maxGeoScore: number
  minGeoScore: number
  scoreDistribution: { range: string; count: number }[]  // 如 '0-40': 2, '40-60': 5
  recentArticles: { id, title, geoScore, status, createdAt }[]  // 最近 5 篇
}
```

**词库列表新增「质量」列：** 展示 avgGeoScore，支持按此排序（无数据显示 `--`）。

**低效词标注：** avgGeoScore < 50 且关联文章 ≥ 3 篇的词，在词库列表显示「质量偏低」角标。

**选题推荐权重调整（与 FEAT-01 联动）：** 推荐排序公式加入 avgGeoScore 因子：
```
score = priority_weight * 0.6 + avg_geo_score_normalized * 0.4
```

### 验收标准
- [ ] 关键词详情页展示：关联文章数 / 平均 GEO 分 / 分布 / 最近 5 篇列表
- [ ] 词库列表有「质量」列，支持排序
- [ ] avgGeoScore < 50 且 ≥ 3 篇的词有「质量偏低」角标
- [ ] 选题推荐排序结合质量分权重

---

## FEAT-15 · 选题入口 Phase 3（外部热点融合）`P3` `L`

### 问题
推荐选题只基于内部词库，无法感知外部热点，错过品牌可借势的实时话题。

### 方案

**数据源（优先接入其中一个，其余作备选）：**
- 微博热搜 API
- 百度指数趋势 API
- 行业媒体 RSS（可配置 URL）

**热点过滤逻辑：**

```typescript
async function filterRelevantTrends(trends: Trend[]): Promise<SuggestedTopic[]> {
  const brandKeywords = await getBrandKeywords()  // 从品牌知识库取关键词
  return trends
    .filter(trend => {
      // 热点标题与品牌关键词的语义相关度 > 阈值
      return computeRelevance(trend.title, brandKeywords) > 0.3
    })
    .map(trend => ({
      source: 'trending',
      title: trend.title,
      heat: trend.heatScore,
      suggestedAngle: generateAngle(trend, brandKeywords),  // AI 生成借势角度
    }))
}
```

**前端展示：** 首页「本周建议选题」区域新增「热点借势」tab，独立于词库推荐。每条热点显示：热度值 / 建议借势角度 / 「生成内容」按钮。

**数据源可在 admin 设置页配置，** 支持添加自定义 RSS 地址，设置抓取频率（每小时/每天）。

### 验收标准
- [ ] admin 设置页可配置热点数据源（至少支持 RSS）
- [ ] 首页选题区有「热点借势」tab
- [ ] 热点条目展示：标题 / 热度 / 建议借势角度
- [ ] 只展示与品牌关键词相关的热点（过滤掉无关热点）
- [ ] 点击「生成内容」跳转生成页并预填热点相关参数

---

## 附录 · 给 Codex 的执行说明

### 读代码顺序（每个 FEAT 开始前）
1. `prisma/schema.prisma` — 了解现有数据模型
2. `app/api/` — 了解现有 API 路由结构
3. `app/(dashboard)/` — 了解现有页面结构
4. `components/` — 找到相关现有组件，优先复用

### 分支命名
```
feat/FEAT-01-topic-suggestions
feat/FEAT-02-role-based-home
feat/FEAT-03-brand-annotation
...
```

### 原则
- 不删除或重构现有功能，只在现有基础上扩展
- Prisma schema 变更后必须生成并运行 migration：`npx prisma migrate dev`
- 新增 API 路由沿用现有 `app/api/` 目录结构和鉴权方式
- 组件样式使用现有 Tailwind + Radix UI 风格，不引入新 UI 库
- 每个 FEAT 完成后提交，commit message 格式：`feat: FEAT-XX 功能名简述`
