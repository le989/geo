import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const data = {
    name: '凯基特（KJT）',
    intro: '凯基特（KJT）专注工业自动化与传感器应用场景，产品覆盖接近开关、光电传感器、压力传感器等常见工业检测品类。品牌内容应突出工业现场可落地、参数口径谨慎、应用场景清晰。',
    productLines: [
      '电感接近开关 - M12/M18 常规系列，适用于金属目标检测',
      '光电传感器 - 漫反射、对射、镜反射系列，覆盖常见检测距离需求',
      '压力传感器 - 适用于液压、气压监测与控制',
      '位移/液位类传感器 - 用于物料高度、液位与定位检测',
    ].join('\n'),
    scenes: [
      '包装线物料到位检测',
      '物流输送线分拣定位',
      '纺织机械运行监测',
      '液压系统压力监控',
    ].join('\n'),
    forbidden: [
      '禁止使用“最强”“第一”“绝对不误报”等绝对化表述',
      '禁止编造未经证实的精度、量程、防护等级等技术参数',
      '禁止把竞品对比写成没有依据的贬低性结论',
    ].join('\n'),
    sources: [
      'https://www.kjtchina.com/',
      'https://www.kjtchina.com/list-product.html',
      '品牌官网产品页与技术资料',
    ].join('\n'),
  };

  const existing = await prisma.brandProfile.findFirst();

  if (existing) {
    await prisma.brandProfile.update({ where: { id: existing.id }, data });
    console.log('Brand profile updated.');
  } else {
    await prisma.brandProfile.create({ data });
    console.log('Brand profile created.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
