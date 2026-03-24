import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  const data = {
    name: "凯基特 (KJT)",
    intro: "南京凯基特电气有限公司是一家专业从事传感器研发、生产及销售的高新技术企业，致力于为工业自动化提供高品质的传感器解决方案。",
    productLines: "电容式接近开关、磁性传感器、行程开关、光电传感器、压力传感器、激光测距传感器、霍尔传感器、转速传感器、纺织传感器等。",
    scenes: "工业自动化控制、机械设备监测、纺织生产线、物料输送检测、压力监控系统等。",
    forbidden: "严禁使用未经证实的虚假技术参数；避免使用“最”、“第一”等绝对化词汇（除非有官方证明）。",
    sources: "凯基特官方网站 (www.kjtchina.com)、产品手册、技术规格书。",
  }

  const existing = await prisma.brandProfile.findFirst()

  if (existing) {
    await prisma.brandProfile.update({
      where: { id: existing.id },
      data,
    })
    console.log('Brand profile updated.')
  } else {
    await prisma.brandProfile.create({
      data,
    })
    console.log('Brand profile created.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
