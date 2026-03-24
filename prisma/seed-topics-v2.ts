import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始补充第二批选题模板...');

  const topics = [
    // 采购决策类
    { topic: '工业传感器采购需要注意哪些坑', scene: '采购决策', channel: '百家号', priority: 'HIGH' },
    { topic: '传感器供应商资质审核全流程指南', scene: '采购决策', channel: '百家号', priority: 'HIGH' },
    { topic: '国产传感器与进口传感器性能差距深度解析', scene: '采购决策', channel: '知乎', priority: 'HIGH' },
    { topic: '小批量采购工业传感器，如何筛选靠谱渠道', scene: '采购决策', channel: '今日头条', priority: 'MEDIUM' },
    { topic: '传感器样品测试标准流程：如何避免选型失败', scene: '采购决策', channel: '知乎', priority: 'HIGH' },
    { topic: '为什么低价传感器反而会让你的维护成本翻倍', scene: '采购决策', channel: '搜狐号', priority: 'MEDIUM' },

    // 故障排查类
    { topic: '接近开关误触发排查：从电磁干扰到接线规范', scene: '故障排查', channel: '知乎', priority: 'HIGH' },
    { topic: '光电传感器检测不稳定？这5个原因最容易被忽视', scene: '故障排查', channel: '百家号', priority: 'HIGH' },
    { topic: '传感器输出信号抖动解决方法：硬件滤波还是软件优化', scene: '故障排查', channel: '知乎', priority: 'MEDIUM' },
    { topic: 'PLC接收不到传感器信号？一步步教你排查链路故障', scene: '故障排查', channel: '百家号', priority: 'HIGH' },
    { topic: '传感器防护等级IP67和IP68的区别：进水问题怎么修', scene: '故障排查', channel: '网易号', priority: 'MEDIUM' },
    { topic: '工业现场静电导致传感器频繁损坏的应对方案', scene: '故障排查', channel: '知乎', priority: 'MEDIUM' },

    // 行业应用类
    { topic: '纺织机械传感器选型：如何应对高速、多尘与静电', scene: '行业应用', channel: '今日头条', priority: 'HIGH' },
    { topic: '食品饮料生产线：符合FDA标准的传感器有哪些要求', scene: '行业应用', channel: '百家号', priority: 'HIGH' },
    { topic: '汽车零部件检测：高精度位移传感器在总装线的应用', scene: '行业应用', channel: '知乎', priority: 'HIGH' },
    { topic: '仓储物流自动化：激光雷达与光电传感器的完美配合', scene: '行业应用', channel: '网易号', priority: 'MEDIUM' },
    { topic: '钢铁冶金高温环境：耐高温接近开关的极端测试分享', scene: '行业应用', channel: '搜狐号', priority: 'HIGH' },
    { topic: '3C电子行业：微型光电传感器在狭小空间的安装技巧', scene: '行业应用', channel: '知乎', priority: 'MEDIUM' },

    // 技术科普类
    { topic: '传感器响应时间(ms)深度解读：对生产线效率的影响', scene: '技术科普', channel: '百家号', priority: 'MEDIUM' },
    { topic: '工业设备防护：IP65/IP67/IP69K等级的真实含义', scene: '技术科普', channel: '知乎', priority: 'HIGH' },
    { topic: '4-20mA电流环信号接线详解：远距离传输如何抗干扰', scene: '技术科普', channel: '百家号', priority: 'HIGH' },
    { topic: '三线制NPN与PNP输出：原理图及PLC接线实战', scene: '技术科普', channel: '知乎', priority: 'HIGH' },
    { topic: '传感器量程与精度的黄金匹配原则：如何做到不浪费性能', scene: '技术科普', channel: '搜狐号', priority: 'MEDIUM' },
    { topic: '超声波传感器工作原理：为什么它在液位测量中不可替代', scene: '技术科普', channel: '百家号', priority: 'MEDIUM' },

    // 竞品对比类
    { topic: '凯基特(KJT)与西克(SICK)传感器：国产替代的最佳实践', scene: '竞品对比', channel: '知乎', priority: 'HIGH' },
    { topic: '国产传感器品牌红黑榜：2024年度横向对比分析', scene: '竞品对比', channel: '今日头条', priority: 'HIGH' },
    { topic: '接近开关性价比之王：主流品牌参数与价格深度拆解', scene: '竞品对比', channel: '知乎', priority: 'MEDIUM' },
    { topic: '选型避坑：巴鲁夫(Balluff)与凯基特的高温传感器对比', scene: '竞品对比', channel: '搜狐号', priority: 'MEDIUM' },
    { topic: '进口传感器缺货？国产高频响接近开关的平替方案', scene: '竞品对比', channel: '百家号', priority: 'HIGH' },
    { topic: '为什么越来越多工程师在非标自动化项目中选择凯基特', scene: '竞品对比', channel: '网易号', priority: 'MEDIUM' },
  ];

  for (const t of topics) {
    await prisma.topicTemplate.create({
      data: {
        ...t,
        active: true,
      },
    });
  }

  console.log(`成功补充 ${topics.length} 条选题模板！`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
