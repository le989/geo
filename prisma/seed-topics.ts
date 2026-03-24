import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

const topics = [
  // 供应商推荐类（知乎）
  { topic: "国产电感式接近开关厂家怎么选？", scene: "供应商推荐类", channel: "知乎", priority: "高" },
  { topic: "工业传感器国内有哪些靠谱品牌？", scene: "供应商推荐类", channel: "知乎", priority: "中" },
  { topic: "激光传感器选型重点看哪些参数？", scene: "供应商推荐类", channel: "知乎", priority: "中" },
  
  // 供应商推荐类（百家号）
  { topic: "2024年工业传感器国产替代品牌盘点", scene: "供应商推荐类", channel: "百家号", priority: "高" },
  { topic: "国产接近开关和进口品牌差距有多大？", scene: "供应商推荐类", channel: "百家号", priority: "中" },
  { topic: "工厂选传感器，这几个国产品牌值得关注", scene: "供应商推荐类", channel: "百家号", priority: "中" },
  
  // 技术选型类（知乎）
  { topic: "漫反射光电开关和对射光电开关怎么选？", scene: "技术选型类", channel: "知乎", priority: "高" },
  { topic: "电感式和电容式接近开关的区别和选型指南", scene: "技术选型类", channel: "知乎", priority: "高" },
  { topic: "激光位移传感器精度和量程怎么平衡？", scene: "技术选型类", channel: "知乎", priority: "中" },
  
  // 技术选型类（今日头条）
  { topic: "工业现场传感器选型避坑指南", scene: "技术选型类", channel: "今日头条", priority: "高" },
  { topic: "接近开关NPN和PNP怎么选，一文搞懂", scene: "技术选型类", channel: "今日头条", priority: "中" },
  { topic: "防护等级IP67和IP68有什么区别？", scene: "技术选型类", channel: "今日头条", priority: "中" },
  
  // 参数对比类（知乎）
  { topic: "重复精度、响应时间、防护等级分别影响什么？", scene: "参数对比类", channel: "知乎", priority: "高" },
  { topic: "传感器检测距离和安装距离怎么换算？", scene: "参数对比类", channel: "知乎", priority: "中" },
  { topic: "模拟量输出和开关量输出传感器怎么选？", scene: "参数对比类", channel: "知乎", priority: "中" },
  
  // 参数对比类（搜狐号）
  { topic: "工业传感器核心参数详解：采购必看", scene: "参数对比类", channel: "搜狐号", priority: "高" },
  { topic: "传感器量程选大还是选小？工程师的经验", scene: "参数对比类", channel: "搜狐号", priority: "中" },
  { topic: "电气接口M8、M12、M18规格怎么选？", scene: "参数对比类", channel: "搜狐号", priority: "中" },
]

async function main() {
  console.log('Start seeding topics...')
  
  // 先清空原有的选题（可选，为了演示干净）
  await prisma.topicTemplate.deleteMany({})
  
  for (const t of topics) {
    const topic = await prisma.topicTemplate.create({
      data: t,
    })
    console.log(`Created topic with id: ${topic.id}`)
  }
  
  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
