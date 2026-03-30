const brandGuard = require('./brand-guard.js');

const REVIEW_STATUS = {
  pass: 'pass',
  revise: 'revise',
  highRisk: 'high_risk',
};

const CHECK_LEVEL = {
  pass: 'pass',
  warning: 'warning',
  fail: 'fail',
};

function ensureString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean) : [];
}

function splitParagraphs(content) {
  return String(content || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenizeText(value) {
  const text = String(value || '').toLowerCase();
  const tokens = text.match(/[a-z0-9]+|[\u4e00-\u9fa5]{2,}/g) || [];
  return Array.from(new Set(tokens.filter((item) => item.length >= 2)));
}

function findParagraphIndexForIssue(issueText, paragraphs) {
  if (!paragraphs.length) return undefined;
  const issue = ensureString(issueText);
  if (!issue) return undefined;

  const issueTokens = tokenizeText(issue);
  let bestIndex = -1;
  let bestScore = 0;

  paragraphs.forEach((paragraph, index) => {
    const paragraphText = String(paragraph || '');
    let score = 0;

    if (paragraphText.includes(issue)) {
      score += issue.length + 10;
    }

    issueTokens.forEach((token) => {
      if (paragraphText.toLowerCase().includes(token)) {
        score += token.length >= 4 ? 3 : 2;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore > 0 ? bestIndex : undefined;
}

function normalizeIssueItem(item, paragraphs) {
  if (!item) return null;

  if (typeof item === 'string') {
    const text = ensureString(item);
    if (!text) return null;
    return {
      text,
      paragraphIndex: findParagraphIndexForIssue(text, paragraphs),
    };
  }

  if (typeof item === 'object') {
    const text = ensureString(item.text || item.label || item.issue);
    if (!text) return null;
    const rawIndex = Number(item.paragraphIndex);
    return {
      text,
      paragraphIndex: Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : findParagraphIndexForIssue(text, paragraphs),
    };
  }

  return null;
}

function normalizeIssueArray(value, content) {
  const paragraphs = splitParagraphs(content);
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeIssueItem(item, paragraphs)).filter(Boolean);
}

function normalizeReviewStatus(value) {
  if (value === REVIEW_STATUS.pass || value === REVIEW_STATUS.highRisk || value === REVIEW_STATUS.revise) {
    return value;
  }
  return REVIEW_STATUS.revise;
}

function normalizeReviewResult(input, content = '') {
  const source = input && typeof input === 'object' ? input : {};
  const status = normalizeReviewStatus(source.status);
  const score = Number.isFinite(Number(source.score)) ? Math.max(0, Math.min(100, Number(source.score))) : 60;
  const summary = ensureString(source.summary, '\u9700\u8981\u8fdb\u4e00\u6b65\u68c0\u67e5\u5185\u5bb9\u8d28\u91cf\u3002');
  let issues = normalizeIssueArray(source.issues, content);
  const suggestions = ensureArray(source.suggestions);
  const risks = ensureArray(source.risks);

  if (!issues.length && status !== REVIEW_STATUS.pass) {
    const fallbackTexts = [];
    if (risks.length) {
      fallbackTexts.push(...risks);
    }
    if (summary) {
      fallbackTexts.push(summary);
    }
    issues = fallbackTexts
      .map((item) => normalizeIssueItem(item, splitParagraphs(content)))
      .filter(Boolean)
      .slice(0, 3);
  }

  return { status, score, summary, issues, suggestions, risks };
}

function parseReviewResponse(rawText, content = '') {
  const text = ensureString(rawText);
  if (!text) {
    return normalizeReviewResult({
      status: REVIEW_STATUS.revise,
      score: 60,
      summary: '\u672a\u83b7\u53d6\u5230\u5b8c\u6574\u5ba1\u6838\u7ed3\u679c\uff0c\u5efa\u8bae\u4eba\u5de5\u590d\u6838\u3002',
      suggestions: ['\u8bf7\u68c0\u67e5\u6807\u9898\u3001\u54c1\u724c\u63d0\u53ca\u548c\u98ce\u9669\u8868\u8ff0\u3002'],
    }, content);
  }

  try {
    return normalizeReviewResult(JSON.parse(text), content);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return normalizeReviewResult(JSON.parse(jsonMatch[0]), content);
      } catch {
        return normalizeReviewResult({
          status: REVIEW_STATUS.revise,
          score: 60,
          summary: text.slice(0, 120),
          suggestions: ['\u6a21\u578b\u5ba1\u6838\u7ed3\u679c\u975e\u6807\u51c6 JSON\uff0c\u8bf7\u4eba\u5de5\u590d\u6838\u3002'],
        }, content);
      }
    }

    return normalizeReviewResult({
      status: REVIEW_STATUS.revise,
      score: 60,
      summary: text.slice(0, 120),
      suggestions: ['\u6a21\u578b\u5ba1\u6838\u7ed3\u679c\u975e\u6807\u51c6 JSON\uff0c\u8bf7\u4eba\u5de5\u590d\u6838\u3002'],
    }, content);
  }
}

function buildCheckItem(key, level, label, detail) {
  return { key, level, label, detail };
}

function worstLevel(levels) {
  if (levels.includes(CHECK_LEVEL.fail)) return CHECK_LEVEL.fail;
  if (levels.includes(CHECK_LEVEL.warning)) return CHECK_LEVEL.warning;
  return CHECK_LEVEL.pass;
}

function buildPublishChecks({ title, content, brandCheck }) {
  const items = [];
  const cleanTitle = ensureString(title);
  const cleanContent = ensureString(content);
  const brandReferenceCount = Number(brandCheck?.referenceCount || 0);
  const risks = Array.isArray(brandCheck?.risks) ? brandCheck.risks : [];
  const riskCount = Number(brandCheck?.riskCount || risks.length || 0);

  if (!cleanTitle) {
    items.push(buildCheckItem('title_length', CHECK_LEVEL.fail, '\u6807\u9898\u68c0\u67e5', '\u6807\u9898\u4e3a\u7a7a\uff0c\u4e0d\u53ef\u53d1\u5e03\u3002'));
  } else if (cleanTitle.length < 8) {
    items.push(buildCheckItem('title_length', CHECK_LEVEL.warning, '\u6807\u9898\u68c0\u67e5', '\u6807\u9898\u504f\u77ed\uff0c\u5efa\u8bae\u8865\u5145\u4fe1\u606f\u91cf\u3002'));
  } else if (cleanTitle.length > 36) {
    items.push(buildCheckItem('title_length', CHECK_LEVEL.warning, '\u6807\u9898\u68c0\u67e5', '\u6807\u9898\u504f\u957f\uff0c\u5efa\u8bae\u7f29\u77ed\u4ee5\u63d0\u5347\u4f20\u64ad\u6548\u7387\u3002'));
  } else {
    items.push(buildCheckItem('title_length', CHECK_LEVEL.pass, '\u6807\u9898\u68c0\u67e5', '\u6807\u9898\u957f\u5ea6\u9002\u4e2d\u3002'));
  }

  if (!cleanContent) {
    items.push(buildCheckItem('content_presence', CHECK_LEVEL.fail, '\u6b63\u6587\u68c0\u67e5', '\u6b63\u6587\u5185\u5bb9\u4e3a\u7a7a\uff0c\u4e0d\u53ef\u53d1\u5e03\u3002'));
  } else if (cleanContent.length < 120) {
    items.push(buildCheckItem('content_presence', CHECK_LEVEL.warning, '\u6b63\u6587\u68c0\u67e5', '\u6b63\u6587\u504f\u77ed\uff0c\u5efa\u8bae\u8865\u5145\u7ec6\u8282\u3002'));
  } else {
    items.push(buildCheckItem('content_presence', CHECK_LEVEL.pass, '\u6b63\u6587\u68c0\u67e5', '\u6b63\u6587\u957f\u5ea6\u57fa\u672c\u53ef\u7528\u3002'));
  }

  if (brandReferenceCount <= 0) {
    items.push(buildCheckItem('brand_reference', CHECK_LEVEL.warning, '\u54c1\u724c\u63d0\u53ca', '\u672a\u660e\u786e\u547d\u4e2d\u54c1\u724c\u4fe1\u606f\uff0c\u5efa\u8bae\u8865\u5145\u54c1\u724c\u53ca\u4ea7\u54c1\u7ebf\u8868\u8ff0\u3002'));
  } else {
    items.push(buildCheckItem('brand_reference', CHECK_LEVEL.pass, '\u54c1\u724c\u63d0\u53ca', '\u5df2\u547d\u4e2d\u54c1\u724c\u4fe1\u606f\u3002'));
  }

  if (riskCount > 0) {
    const detail = risks.map((item) => `${item.term || ''}${item.reason ? `\uff1a${item.reason}` : ''}`).join('\uff1b') || '\u547d\u4e2d\u54c1\u724c\u98ce\u9669\u8868\u8ff0\u3002';
    items.push(buildCheckItem('brand_risk', CHECK_LEVEL.fail, '\u98ce\u9669\u8bcd\u68c0\u67e5', detail));
  } else {
    items.push(buildCheckItem('brand_risk', CHECK_LEVEL.pass, '\u98ce\u9669\u8bcd\u68c0\u67e5', '\u672a\u547d\u4e2d\u98ce\u9669\u8868\u8ff0\u3002'));
  }

  const status = worstLevel(items.map((item) => item.level));
  const recommendedAction =
    status === CHECK_LEVEL.fail
      ? '\u5148\u4fee\u6539\u9ad8\u98ce\u9669\u95ee\u9898\uff0c\u518d\u63d0\u4ea4\u5ba1\u6838\u3002'
      : status === CHECK_LEVEL.warning
        ? '\u5efa\u8bae\u5148\u5b8c\u5584\u5185\u5bb9\u540e\u518d\u63d0\u4ea4\u5ba1\u6838\u3002'
        : '\u5185\u5bb9\u53ef\u8fdb\u5165\u540e\u7eed\u5ba1\u6838\u6216\u53d1\u5e03\u6d41\u7a0b\u3002';

  return { status, items, recommendedAction };
}

function createReviewFallback(brandCheck, publishCheck) {
  const risks = Array.isArray(brandCheck?.risks)
    ? brandCheck.risks.map((item) => `${item.term || ''}${item.reason ? `\uff1a${item.reason}` : ''}`).filter(Boolean)
    : [];
  const issueItems = [];
  if ((brandCheck?.referenceCount || 0) <= 0) {
    issueItems.push({ text: '\u672a\u660e\u786e\u63d0\u53ca\u54c1\u724c\u6216\u4ea7\u54c1\u4fe1\u606f', paragraphIndex: undefined });
  }
  if ((publishCheck?.status || CHECK_LEVEL.pass) !== CHECK_LEVEL.pass) {
    issueItems.push({ text: '\u53d1\u5e03\u524d\u68c0\u67e5\u4ecd\u5b58\u5728\u5f85\u5904\u7406\u9879', paragraphIndex: undefined });
  }
  const status = risks.length ? REVIEW_STATUS.highRisk : issueItems.length ? REVIEW_STATUS.revise : REVIEW_STATUS.pass;
  const score = status === REVIEW_STATUS.pass ? 86 : status === REVIEW_STATUS.highRisk ? 52 : 68;
  return {
    status,
    score,
    summary:
      status === REVIEW_STATUS.pass
        ? '\u5185\u5bb9\u6574\u4f53\u7ed3\u6784\u5b8c\u6574\uff0c\u53ef\u4ee5\u8fdb\u5165\u540e\u7eed\u5ba1\u6838\u3002'
        : status === REVIEW_STATUS.highRisk
          ? '\u5185\u5bb9\u5b58\u5728\u9ad8\u98ce\u9669\u8868\u8ff0\uff0c\u9700\u8981\u4f18\u5148\u4fee\u6539\u3002'
          : '\u5185\u5bb9\u53ef\u8bfb\u6027\u57fa\u672c\u53ef\u7528\uff0c\u4f46\u8fd8\u9700\u8981\u8fdb\u4e00\u6b65\u4f18\u5316\u3002',
    issues: issueItems,
    suggestions: [publishCheck?.recommendedAction || '\u8865\u5145\u54c1\u724c\u4fe1\u606f\u5e76\u590d\u67e5\u6807\u9898\u7ed3\u6784\u3002'],
    risks,
  };
}

function buildReviewPrompts({ title, content, channel, scene, brandCheck, publishCheck }) {
  const paragraphs = splitParagraphs(content);
  const userPrompt = [
    '\u8bf7\u4f60\u4f5c\u4e3a GEO \u5185\u5bb9\u5ba1\u6838\u52a9\u624b\uff0c\u5ba1\u8bfb\u4ee5\u4e0b\u5185\u5bb9\u3002',
    '\u8bf7\u4f60\u53ea\u8fd4\u56de JSON\uff0c\u4e0d\u8981\u8fd4\u56de Markdown\uff0c\u4e0d\u8981\u8fd4\u56de\u989d\u5916\u89e3\u91ca\u3002',
    '\u8bf7\u5c3d\u91cf\u4e3a\u6bcf\u6761 issues \u6807\u6ce8 paragraphIndex\uff0c\u4ece 0 \u5f00\u59cb\u8ba1\u6570\uff0c\u5bf9\u5e94\u6b63\u6587\u6309\u53cc\u6362\u884c\u62c6\u5206\u540e\u7684\u6bb5\u843d\u7d22\u5f15\u3002',
    '\u5b57\u6bb5\u7ed3\u6784\uff1a{"status":"pass|revise|high_risk","score":0-100,"summary":"...","issues":[{"text":"...","paragraphIndex":0}],"suggestions":["..."],"risks":["..."]}',
    `\u6807\u9898\uff1a${title || ''}`,
    `\u6e20\u9053\uff1a${channel || ''}`,
    `\u573a\u666f\uff1a${scene || ''}`,
    `\u54c1\u724c\u547d\u4e2d\u6570\uff1a${brandCheck?.referenceCount || 0}`,
    `\u54c1\u724c\u98ce\u9669\u6570\uff1a${brandCheck?.riskCount || 0}`,
    `\u53d1\u5e03\u524d\u68c0\u67e5\u7ed3\u679c\uff1a${publishCheck?.status || CHECK_LEVEL.pass}`,
    `\u6b63\u6587\uff1a\n${content || ''}`,
    `\u6bb5\u843d\u5217\u8868\uff1a\n${paragraphs.map((item, index) => `${index}. ${item}`).join('\n\n')}`,
  ].join('\n\n');

  const systemPrompt = [
    '\u4f60\u662f\u4e00\u540d\u4e2d\u6587 B2B \u5185\u5bb9\u5ba1\u6838\u52a9\u624b\u3002',
    '\u4f60\u7684\u804c\u8d23\u662f\u5224\u65ad\u6587\u7ae0\u662f\u5426\u9002\u5408\u6e20\u9053\u53d1\u5e03\uff0c\u5e76\u7ed9\u51fa\u7ed3\u6784\u5316\u5ba1\u6838\u610f\u89c1\u3002',
    '\u7ed3\u8bba\u8981\u514b\u5236\uff0c\u4e0d\u8981\u592e\u5f20\u3002',
  ].join('\n');

  return { systemPrompt, userPrompt };
}

function buildBrandCheck(content, brandProfile) {
  return brandGuard.analyzeBrandUsage(String(content || ''), brandProfile || {});
}

module.exports = {
  REVIEW_STATUS,
  CHECK_LEVEL,
  normalizeReviewResult,
  parseReviewResponse,
  splitParagraphs,
  buildPublishChecks,
  createReviewFallback,
  buildReviewPrompts,
  buildBrandCheck,
};
