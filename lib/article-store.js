const SOURCE_TYPES = {
  manual: 'manual',
  topic: 'topic',
  keyword: 'keyword',
  brand: 'brand',
  monitor: 'monitor',
  sample: 'sample',
};

function createContentDraftPayload({
  title,
  channel,
  scene,
  owner,
  sourceType = SOURCE_TYPES.manual,
  sourceLabel = '',
}) {
  return {
    title,
    channel,
    scene,
    owner,
    sourceType,
    sourceLabel,
    aiReview: {},
    publishCheck: {},
  };
}

function mergeContentUpdatePayload(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    aiReview: incoming.aiReview ?? existing.aiReview ?? {},
    publishCheck: incoming.publishCheck ?? existing.publishCheck ?? {},
    sourceType: incoming.sourceType ?? existing.sourceType ?? SOURCE_TYPES.manual,
    sourceLabel: incoming.sourceLabel ?? existing.sourceLabel ?? '',
    lastEditedAt: incoming.lastEditedAt ?? existing.lastEditedAt ?? null,
  };
}

function buildExcerpt(content = '', maxLength = 120) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildSampleItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    taskId: item.taskId,
    title: item.title,
    channel: item.channel,
    scene: item.scene,
    reason: item.reason || '',
    createdBy: item.createdBy,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildContentListItem(item) {
  return {
    id: item.id,
    title: item.title,
    excerpt: buildExcerpt(item.content),
    channel: item.channel,
    scene: item.scene,
    owner: item.owner,
    status: item.status,
    source: {
      type: item.sourceType || SOURCE_TYPES.manual,
      label: item.sourceLabel || '',
    },
    review: item.aiReview || {},
    check: item.publishCheck || {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastEditedAt: item.lastEditedAt || null,
    sample: buildSampleItem(item.sampleEntry),
    versions: Array.isArray(item.versions) ? item.versions.map((version) => buildVersionListItem(version)) : [],
  };
}

function buildContentVersionPayload({ taskId, title, content, source = 'manual_save', actor = '\u0041\u0049\u52a9\u624b', versionNumber }) {
  return {
    taskId,
    versionNumber,
    snapshotTitle: title || '',
    snapshotContent: content || '',
    source,
    actor,
  };
}

function buildVersionListItem(item) {
  return {
    id: item.id,
    taskId: item.taskId,
    versionNumber: item.versionNumber,
    title: item.snapshotTitle,
    content: item.snapshotContent,
    source: item.source,
    actor: item.actor,
    createdAt: item.createdAt,
  };
}

function buildContentDetail(item) {
  return {
    id: item.id,
    title: item.title,
    content: item.content || '',
    channel: item.channel,
    scene: item.scene,
    owner: item.owner,
    status: item.status,
    source: {
      type: item.sourceType || SOURCE_TYPES.manual,
      label: item.sourceLabel || '',
    },
    review: item.aiReview || {},
    check: item.publishCheck || {},
    reviewNote: item.reviewNote || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastEditedAt: item.lastEditedAt || null,
    sample: buildSampleItem(item.sampleEntry),
    versions: Array.isArray(item.versions) ? item.versions.map((version) => buildVersionListItem(version)) : [],
  };
}

function buildGeneratedTaskUpdate({ title, content, aiReview, publishCheck, sourceType, sourceLabel, status = 'PENDING_REVIEW' }) {
  return {
    title,
    content,
    status,
    aiReview: aiReview || {},
    publishCheck: publishCheck || {},
    sourceType: sourceType || SOURCE_TYPES.manual,
    sourceLabel: sourceLabel || '',
    lastEditedAt: new Date(),
  };
}

module.exports = {
  SOURCE_TYPES,
  createContentDraftPayload,
  mergeContentUpdatePayload,
  buildContentListItem,
  buildContentDetail,
  buildGeneratedTaskUpdate,
  buildContentVersionPayload,
  buildVersionListItem,
  buildSampleItem,
};
