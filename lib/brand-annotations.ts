import brandGuard from "@/lib/brand-guard";
import brandProfileUtils from "@/lib/brand-profile";

type BrandProfileShape = {
  name?: string;
  intro?: string;
  productLines?: string;
  scenes?: string;
  forbidden?: string;
  sources?: string;
};

type AnnotationType = "brand_mention" | "forbidden" | "source_hint" | "fact_drift";
type AnnotationLevel = "ok" | "warning" | "danger" | "info";

export type BrandAnnotation = {
  id: string;
  type: AnnotationType;
  level: AnnotationLevel;
  start: number;
  end: number;
  text: string;
  message: string;
};

export type BrandMetrics = {
  brandMentionCount: number;
  sceneCovered: number;
  sceneTotal: number;
  forbiddenCount: number;
  sourceCount: number;
};

type AnalyzeResult = {
  annotations: BrandAnnotation[];
  metrics: BrandMetrics;
};

const { analyzeBrandUsage } = brandGuard as {
  analyzeBrandUsage: (content: string, profile: Record<string, unknown> | null | undefined) => {
    references: Array<{ type: string; label: string; excerpt: string }>;
    risks: Array<{ term: string; reason: string }>;
    referenceCount: number;
    riskCount: number;
    suggestedSources: string[];
  };
};

const { normalizeBrandProfilePayload } = brandProfileUtils as {
  normalizeBrandProfilePayload: (profile: BrandProfileShape | null | undefined) => Required<BrandProfileShape>;
};

function splitLines(value: string | undefined) {
  return String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBrandName(name: string) {
  return String(name || "").replace(/[\uff08(].*?[\uff09)]/g, "").trim();
}

function extractQuotedTerms(line: string) {
  const result: string[] = [];
  const regex = /["'\u201c\u201d\u2018\u2019]([^"'\u201c\u201d\u2018\u2019]{2,30})["'\u201c\u201d\u2018\u2019]/g;
  let match = regex.exec(line);
  while (match) {
    result.push(match[1].trim());
    match = regex.exec(line);
  }
  return result;
}

function tokenizeLine(line: string) {
  return uniq(
    String(line || "")
      .replace(/[\uff08(][^\uff09)]*[\uff09)]/g, " ")
      .split(/[\s,\uff0c\u3001;\uff1b:\uff1a\-\/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
  );
}

function findAllRanges(content: string, term: string) {
  if (!term) return [] as Array<{ start: number; end: number; text: string }>;
  const result: Array<{ start: number; end: number; text: string }> = [];
  const regex = new RegExp(escapeRegExp(term), "g");
  let match = regex.exec(content);
  while (match) {
    result.push({ start: match.index, end: match.index + term.length, text: match[0] });
    match = regex.exec(content);
  }
  return result;
}

function createAnnotation(type: AnnotationType, level: AnnotationLevel, start: number, end: number, text: string, message: string): BrandAnnotation {
  return {
    id: `${type}-${start}-${end}`,
    type,
    level,
    start,
    end,
    text,
    message,
  };
}

function dedupeAnnotations(items: BrandAnnotation[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}-${item.start}-${item.end}-${item.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectBrandMentionAnnotations(content: string, profile: Required<BrandProfileShape>) {
  const annotations: BrandAnnotation[] = [];
  const brandName = normalizeBrandName(profile.name);
  for (const range of findAllRanges(content, brandName)) {
    annotations.push(createAnnotation("brand_mention", "ok", range.start, range.end, range.text, "\u54c1\u724c\u540d\u79f0\u5df2\u88ab\u6b63\u786e\u5f15\u7528"));
  }

  for (const line of splitLines(profile.productLines)) {
    const primary = tokenizeLine(line)[0];
    if (!primary) continue;
    for (const range of findAllRanges(content, primary)) {
      annotations.push(createAnnotation("brand_mention", "ok", range.start, range.end, range.text, `\u6838\u5fc3\u5356\u70b9\u5f15\u7528\uff1a${line}`));
    }
  }

  return annotations;
}

function collectForbiddenAnnotations(content: string, profile: Required<BrandProfileShape>) {
  const annotations: BrandAnnotation[] = [];
  for (const line of splitLines(profile.forbidden)) {
    const candidates = uniq([...extractQuotedTerms(line), ...tokenizeLine(line)]).filter((item) => item.length >= 2);
    for (const term of candidates) {
      for (const range of findAllRanges(content, term)) {
        annotations.push(createAnnotation("forbidden", "danger", range.start, range.end, range.text, `\u7981\u7528\u8868\u8ff0\uff1a${line}`));
      }
    }
  }
  return annotations;
}

function collectSourceHintAnnotations(content: string, sources: string[]) {
  const annotations: BrandAnnotation[] = [];
  const paragraphs = String(content || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph, index) => {
    if (index > 2) return;
    const start = content.indexOf(paragraph);
    if (start < 0) return;
    const hint = sources[index] || sources[0];
    if (!hint) return;
    annotations.push(
      createAnnotation(
        "source_hint",
        "info",
        start,
        start + Math.min(paragraph.length, 18),
        paragraph.slice(0, Math.min(paragraph.length, 18)),
        `\u53ef\u5f15\u7528\u6765\u6e90\u5efa\u8bae\uff1a${hint}`
      )
    );
  });

  return annotations;
}

function collectFactDriftAnnotations(content: string, profile: Required<BrandProfileShape>) {
  const annotations: BrandAnnotation[] = [];
  const validTokens = uniq([
    normalizeBrandName(profile.name),
    ...splitLines(profile.productLines).flatMap(tokenizeLine),
    ...splitLines(profile.scenes).flatMap(tokenizeLine),
  ]).filter(Boolean);

  const productTerms = uniq(splitLines(profile.productLines).flatMap(tokenizeLine)).filter((item) => item.length >= 2);
  const sceneTerms = uniq(splitLines(profile.scenes).flatMap(tokenizeLine)).filter((item) => item.length >= 2);

  const suspiciousTerms = uniq(
    content.match(/[A-Za-z][A-Za-z0-9\-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || []
  ).filter((term) => {
    if (validTokens.includes(term)) return false;
    if (term.length < 2) return false;
    return productTerms.some((token) => token[0] === term[0]) || sceneTerms.some((token) => token[0] === term[0]);
  });

  suspiciousTerms.slice(0, 6).forEach((term) => {
    const range = findAllRanges(content, term)[0];
    if (!range) return;
    annotations.push(createAnnotation("fact_drift", "warning", range.start, range.end, range.text, "\u8be5\u8868\u8ff0\u53ef\u80fd\u4e0e\u54c1\u724c\u6807\u51c6\u53e3\u5f84\u4e0d\u4e00\u81f4"));
  });

  return annotations;
}

export function analyzeBrandAnnotations(content: string, brandProfile: BrandProfileShape | null | undefined): AnalyzeResult {
  const text = String(content || "");
  const profile = normalizeBrandProfilePayload(brandProfile);
  const usage = analyzeBrandUsage(text, profile);
  const sources = splitLines(profile.sources).slice(0, 5);
  const sceneLines = splitLines(profile.scenes);
  const sceneCovered = sceneLines.filter((line) => tokenizeLine(line).some((term) => text.includes(term))).length;
  const brandName = normalizeBrandName(profile.name);
  const brandMentionCount = brandName ? findAllRanges(text, brandName).length : 0;

  const annotations = dedupeAnnotations([
    ...collectBrandMentionAnnotations(text, profile),
    ...collectForbiddenAnnotations(text, profile),
    ...collectSourceHintAnnotations(text, sources),
    ...collectFactDriftAnnotations(text, profile),
  ]).sort((a, b) => a.start - b.start || a.end - b.end);

  return {
    annotations,
    metrics: {
      brandMentionCount,
      sceneCovered,
      sceneTotal: sceneLines.length,
      forbiddenCount: usage.riskCount,
      sourceCount: usage.suggestedSources.length,
    },
  };
}

export default {
  analyzeBrandAnnotations,
};
