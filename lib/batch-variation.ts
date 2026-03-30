export const BATCH_VARIATION_DIMENSIONS = ["angle", "audience", "opening"] as const;

export type BatchVariationDimension = (typeof BATCH_VARIATION_DIMENSIONS)[number];

export type BatchVariationSpec = {
  angle?: string;
  audience?: string;
  opening?: string;
  instruction: string;
  label: string;
};

const ANGLE_OPTIONS = [
  "从选型决策角度展开，强调判断标准和取舍逻辑",
  "从常见误区角度展开，优先指出容易踩坑的点",
  "从参数对比角度展开，突出关键指标差异",
  "从场景应用角度展开，围绕实际工况给建议",
];

const AUDIENCE_OPTIONS = [
  "面向采购负责人，强调成本、交付和供应稳定性",
  "面向设备工程师，强调安装、调试和选型逻辑",
  "面向产线维护人员，强调故障排查和稳定性",
  "面向技术经理，强调方案适配和综合取舍",
];

const OPENING_OPTIONS = [
  "开头用现场问题切入，不要泛泛铺垫",
  "开头用真实场景切入，先给出结论",
  "开头用经验判断切入，语气直接一点",
  "开头用对比切入，快速拉开差异",
];

function pickOption(options: string[], seed: number) {
  return options[seed % options.length];
}

export function buildBatchVariationSpecs(count: number, dimensions: BatchVariationDimension[]): BatchVariationSpec[] {
  const safeCount = Math.max(0, count);
  if (!dimensions.length || safeCount === 0) {
    return Array.from({ length: safeCount }, () => ({
      instruction: "",
      label: "",
    }));
  }

  return Array.from({ length: safeCount }, (_, index) => {
    const spec: BatchVariationSpec = {
      instruction: "",
      label: "",
    };
    const labels: string[] = [];
    const instructions: string[] = [];

    if (dimensions.includes("angle")) {
      const value = pickOption(ANGLE_OPTIONS, index);
      spec.angle = value;
      labels.push(`角度：${value}`);
      instructions.push(`写作角度：${value}`);
    }

    if (dimensions.includes("audience")) {
      const value = pickOption(AUDIENCE_OPTIONS, index + 1);
      spec.audience = value;
      labels.push(`受众：${value}`);
      instructions.push(`目标受众：${value}`);
    }

    if (dimensions.includes("opening")) {
      const value = pickOption(OPENING_OPTIONS, index + 2);
      spec.opening = value;
      labels.push(`开头：${value}`);
      instructions.push(`开头方式：${value}`);
    }

    spec.label = labels.join(" | ");
    spec.instruction = instructions.join("\n");
    return spec;
  });
}

export function appendVariationInstruction(prompt: string, spec?: BatchVariationSpec | null) {
  if (!spec?.instruction) return prompt;
  return `${prompt}\n\n差异化写作要求：\n${spec.instruction}\n请确保本篇与同批次其他文章在切入方式、表达重点和开头组织上明显不同。`;
}
