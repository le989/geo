const ALL_FILTER = '\u5168\u90e8';
const CHANNEL_OPTIONS = [ALL_FILTER, '\u77e5\u4e4e', '\u4eca\u65e5\u5934\u6761', '\u641c\u72d0\u53f7', '\u767e\u5bb6\u53f7', '\u7f51\u6613\u53f7'];
const SCENE_OPTIONS = [ALL_FILTER, '\u81ea\u4e3b\u521b\u4f5c', '\u91c7\u8d2d\u51b3\u7b56', '\u4f9b\u5e94\u5546\u63a8\u8350', '\u6280\u672f\u9009\u578b', '\u53c2\u6570\u5bf9\u6bd4'];
const OWNER_OPTIONS = ['\u5f85\u5206\u914d', 'AI\u52a9\u624b', '\u5de5\u7a0b\u5e08', '\u8fd0\u8425\u4e13\u5458'];

const TASK_LABELS = {
  totalThisWeek: '\u672c\u5468\u65b0\u589e\u4efb\u52a1',
  completed: '\u5df2\u53d1\u5e03\u5185\u5bb9',
  pending: '\u5f85\u5904\u7406\u4efb\u52a1',
  searchPlaceholder: '\u641c\u7d22\u4efb\u52a1\u6807\u9898...',
  allChannels: '\u6240\u6709\u6e20\u9053',
  allScenes: '\u6240\u6709\u573a\u666f',
  selectedCountPrefix: '\u5df2\u9009',
  selectedCountSuffix: '\u7bc7',
  deleteSelected: '\u5220\u9664\u9009\u4e2d',
  cancel: '\u53d6\u6d88',
  batch: '\u6279\u91cf',
  noTasks: '\u6682\u65e0\u4efb\u52a1',
  scene: '\u4e1a\u52a1\u573a\u666f',
  createdAt: '\u521b\u5efa\u65f6\u95f4',
  owner: '\u8d1f\u8d23\u4eba',
  taskStatus: '\u4efb\u52a1\u72b6\u6001',
  generatedContent: '\u751f\u6210\u5185\u5bb9',
  copyRich: '\u590d\u5236\u5bcc\u6587\u672c',
  copyPlain: '\u590d\u5236\u5168\u6587',
  noContent: '\u6682\u65e0\u5185\u5bb9',
  delete: '\u5220\u9664',
  close: '\u5173\u95ed',
  approve: '\u786e\u8ba4\u5ba1\u6838',
  revise: '\u9a73\u56de\u8fd4\u5de5',
  resubmit: '\u63d0\u4ea4\u590d\u5ba1',
  returnToReview: '\u9000\u56de\u5ba1\u6838',
  reviewNote: '\u5ba1\u6838\u5907\u6ce8',
  reviewNotePlaceholder: '\u8f93\u5165\u5ba1\u6838\u610f\u89c1\uff0c\u9a73\u56de\u8fd4\u5de5\u65f6\u5fc5\u586b...',
  saveNote: '\u4fdd\u5b58\u5907\u6ce8',
  timeline: '\u4efb\u52a1\u8bb0\u5f55',
  timelineEmpty: '\u6682\u65e0\u64cd\u4f5c\u8bb0\u5f55',
  reviewMeta: '\u6700\u540e\u5ba1\u6838',
  bulkOwner: '\u6279\u91cf\u6307\u6d3e\u8d1f\u8d23\u4eba',
  bulkStatus: '\u6279\u91cf\u66f4\u65b0\u72b6\u6001',
  apply: '\u5e94\u7528',
  syncFailed: '\u90e8\u5206\u4efb\u52a1\u66f4\u65b0\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u72b6\u6001\u6d41\u8f6c\u8981\u6c42',
  noteSaved: '\u5ba1\u6838\u5907\u6ce8\u5df2\u4fdd\u5b58',
  batchPrefix: '\u3010\u6279\u91cf\u3011',
  deleteSelectedConfirmPrefix: '\u786e\u8ba4\u5220\u9664\u9009\u4e2d\u7684',
  deleteSelectedConfirmSuffix: '\u7bc7\u5185\u5bb9\u5417\uff1f',
  deleteSingleConfirm: '\u786e\u8ba4\u5220\u9664\u8fd9\u7bc7\u5185\u5bb9\u5417\uff1f',
  copiedPlain: '\u5df2\u590d\u5236\u5168\u6587',
  copiedRich: '\u5df2\u590d\u5236\u5bcc\u6587\u672c',
  richUnsupported: '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5bcc\u6587\u672c\uff0c\u5df2\u81ea\u52a8\u6539\u4e3a\u7eaf\u6587\u672c\u590d\u5236',
  richFailed: '\u5bcc\u6587\u672c\u590d\u5236\u5931\u8d25\uff0c\u5df2\u81ea\u52a8\u6539\u4e3a\u7eaf\u6587\u672c\u590d\u5236',
};

const STATUS_LABELS = {
  PENDING_GENERATE: '\u5f85\u751f\u4ea7',
  GENERATING: '\u751f\u6210\u4e2d',
  PENDING_REVIEW: '\u5f85\u5ba1\u6838',
  NEEDS_REVISION: '\u5f85\u8fd4\u5de5',
  COMPLETED: '\u5df2\u53d1\u5e03',
  FAILED: '\u5931\u8d25',
};

const STATUS_COLUMNS = {
  PENDING_GENERATE: 'pending',
  GENERATING: 'pending',
  PENDING_REVIEW: 'review',
  NEEDS_REVISION: 'revision',
  COMPLETED: 'done',
  FAILED: 'revision',
};

const COLUMN_LABELS = {
  pending: '\u5f85\u751f\u4ea7',
  review: '\u5f85\u5ba1\u6838',
  revision: '\u5f85\u8fd4\u5de5',
  done: '\u5df2\u53d1\u5e03',
};

const STATUS_TRANSITIONS = {
  PENDING_GENERATE: ['GENERATING', 'PENDING_REVIEW', 'FAILED'],
  GENERATING: ['PENDING_REVIEW', 'FAILED'],
  PENDING_REVIEW: ['COMPLETED', 'NEEDS_REVISION', 'FAILED'],
  NEEDS_REVISION: ['PENDING_REVIEW', 'COMPLETED', 'FAILED'],
  COMPLETED: ['PENDING_REVIEW', 'NEEDS_REVISION'],
  FAILED: ['PENDING_REVIEW', 'NEEDS_REVISION'],
};

function isStatusTransitionAllowed(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  return STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

function getAvailableTaskActions(status) {
  if (status === 'PENDING_REVIEW') {
    return [
      { status: 'NEEDS_REVISION', label: TASK_LABELS.revise, tone: 'danger' },
      { status: 'COMPLETED', label: TASK_LABELS.approve, tone: 'primary' },
    ];
  }
  if (status === 'NEEDS_REVISION' || status === 'FAILED') {
    return [{ status: 'PENDING_REVIEW', label: TASK_LABELS.resubmit, tone: 'outline' }];
  }
  if (status === 'COMPLETED') {
    return [{ status: 'PENDING_REVIEW', label: TASK_LABELS.returnToReview, tone: 'outline' }];
  }
  return [];
}

function getTaskActionGuard(currentStatus, nextStatus, publishCheck = {}) {
  if (currentStatus !== 'PENDING_REVIEW' || nextStatus !== 'COMPLETED') {
    return null;
  }

  const checkStatus = publishCheck?.status || 'warning';
  if (checkStatus === 'fail') {
    return {
      blocked: true,
      level: 'fail',
      message: '\u5f53\u524d\u5185\u5bb9\u5b58\u5728\u53d1\u5e03\u963b\u65ad\u9879\uff0c\u8bf7\u5148\u4fee\u6539\u540e\u518d\u786e\u8ba4\u5ba1\u6838\u3002',
    };
  }

  if (checkStatus === 'warning') {
    return {
      blocked: false,
      level: 'warning',
      message: '\u53d1\u5e03\u524d\u68c0\u67e5\u4ecd\u6709\u63d0\u9192\u9879\uff0c\u5efa\u8bae\u5148\u5904\u7406\u518d\u63d0\u4ea4\u5ba1\u6838\u3002',
    };
  }

  return null;
}

function getRecommendedTaskAction(status, aiReview = {}, publishCheck = {}) {
  if (status !== 'PENDING_REVIEW') {
    return null;
  }

  const reviewStatus = aiReview?.status || 'revise';
  const checkStatus = publishCheck?.status || 'warning';

  if (reviewStatus === 'high_risk' || checkStatus === 'fail') {
    return {
      status: 'NEEDS_REVISION',
      label: TASK_LABELS.revise,
      tone: 'danger',
      reason: '\u5b58\u5728 AI \u9ad8\u98ce\u9669\u6216\u53d1\u5e03\u963b\u65ad\u9879\uff0c\u5efa\u8bae\u5148\u9a73\u56de\u8fd4\u5de5\u3002',
    };
  }

  if (reviewStatus === 'pass' && checkStatus === 'pass') {
    return {
      status: 'COMPLETED',
      label: TASK_LABELS.approve,
      tone: 'primary',
      reason: '\u5185\u5bb9\u901a\u8fc7 AI \u5ba1\u6838\u4e14\u53d1\u5e03\u524d\u68c0\u67e5\u65e0\u963b\u65ad\u9879\uff0c\u5efa\u8bae\u76f4\u63a5\u63d0\u4ea4\u901a\u8fc7\u3002',
    };
  }

  return {
    status: 'NEEDS_REVISION',
    label: TASK_LABELS.revise,
    tone: 'danger',
    reason: '\u5185\u5bb9\u4ecd\u5b58\u5728\u5f85\u4f18\u5316\u9879\uff0c\u5efa\u8bae\u5148\u8fd4\u5de5\u4fee\u6539\u540e\u518d\u63d0\u4ea4\u5ba1\u6838\u3002',
  };
}

function formatTaskEventAction(action) {
  const map = {
    TASK_CREATED: '\u521b\u5efa\u4efb\u52a1',
    TASK_UPDATED: '\u66f4\u65b0\u4efb\u52a1',
    TASK_APPROVED: '\u5ba1\u6838\u901a\u8fc7',
    TASK_REJECTED: '\u9a73\u56de\u8fd4\u5de5',
    TASK_GENERATED: 'AI\u751f\u6210\u5b8c\u6210',
    TASK_FAILED: 'AI\u751f\u6210\u5931\u8d25',
  };
  return map[action] || action;
}

module.exports = {
  ALL_FILTER,
  CHANNEL_OPTIONS,
  SCENE_OPTIONS,
  OWNER_OPTIONS,
  TASK_LABELS,
  STATUS_LABELS,
  STATUS_COLUMNS,
  COLUMN_LABELS,
  STATUS_TRANSITIONS,
  isStatusTransitionAllowed,
  getAvailableTaskActions,
  getTaskActionGuard,
  getRecommendedTaskAction,
  formatTaskEventAction,
};
