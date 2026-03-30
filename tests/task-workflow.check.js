const assert = require('node:assert/strict');

const {
  TASK_LABELS,
  STATUS_LABELS,
  isStatusTransitionAllowed,
  getAvailableTaskActions,
  getRecommendedTaskAction,
  getTaskActionGuard,
  formatTaskEventAction,
} = require('../lib/task-workflow.js');

assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'COMPLETED'), true);
assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'NEEDS_REVISION'), true);
assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'GENERATING'), false);
assert.deepEqual(
  getAvailableTaskActions('PENDING_REVIEW').map((item) => item.status),
  ['NEEDS_REVISION', 'COMPLETED']
);
assert.deepEqual(
  getAvailableTaskActions('NEEDS_REVISION').map((item) => item.status),
  ['PENDING_REVIEW']
);
assert.deepEqual(
  getAvailableTaskActions('FAILED').map((item) => item.status),
  ['PENDING_REVIEW']
);
assert.equal(TASK_LABELS.reviewNote, '\u5ba1\u6838\u5907\u6ce8');
assert.equal(TASK_LABELS.bulkOwner, '\u6279\u91cf\u6307\u6d3e\u8d1f\u8d23\u4eba');
assert.equal(STATUS_LABELS.NEEDS_REVISION, '\u5f85\u8fd4\u5de5');
assert.equal(formatTaskEventAction('TASK_APPROVED'), '\u5ba1\u6838\u901a\u8fc7');
assert.equal(
  getRecommendedTaskAction('PENDING_REVIEW', { status: 'high_risk' }, { status: 'fail' })?.status,
  'NEEDS_REVISION'
);
assert.equal(
  getRecommendedTaskAction('PENDING_REVIEW', { status: 'high_risk' }, { status: 'fail' })?.reason,
  '\u5b58\u5728 AI \u9ad8\u98ce\u9669\u6216\u53d1\u5e03\u963b\u65ad\u9879\uff0c\u5efa\u8bae\u5148\u9a73\u56de\u8fd4\u5de5\u3002'
);
assert.equal(
  getRecommendedTaskAction('PENDING_REVIEW', { status: 'pass' }, { status: 'pass' })?.status,
  'COMPLETED'
);
assert.equal(
  getRecommendedTaskAction('PENDING_REVIEW', { status: 'pass' }, { status: 'pass' })?.reason,
  '\u5185\u5bb9\u901a\u8fc7 AI \u5ba1\u6838\u4e14\u53d1\u5e03\u524d\u68c0\u67e5\u65e0\u963b\u65ad\u9879\uff0c\u5efa\u8bae\u76f4\u63a5\u63d0\u4ea4\u901a\u8fc7\u3002'
);
assert.equal(
  getRecommendedTaskAction('PENDING_REVIEW', { status: 'revise' }, { status: 'warning' })?.status,
  'NEEDS_REVISION'
);
assert.equal(getRecommendedTaskAction('COMPLETED', { status: 'pass' }, { status: 'pass' }), null);
assert.deepEqual(
  getTaskActionGuard('PENDING_REVIEW', 'COMPLETED', { status: 'fail' }),
  {
    blocked: true,
    level: 'fail',
    message: '\u5f53\u524d\u5185\u5bb9\u5b58\u5728\u53d1\u5e03\u963b\u65ad\u9879\uff0c\u8bf7\u5148\u4fee\u6539\u540e\u518d\u786e\u8ba4\u5ba1\u6838\u3002',
  }
);
assert.deepEqual(
  getTaskActionGuard('PENDING_REVIEW', 'COMPLETED', { status: 'warning' }),
  {
    blocked: false,
    level: 'warning',
    message: '\u53d1\u5e03\u524d\u68c0\u67e5\u4ecd\u6709\u63d0\u9192\u9879\uff0c\u5efa\u8bae\u5148\u5904\u7406\u518d\u63d0\u4ea4\u5ba1\u6838\u3002',
  }
);
assert.equal(getTaskActionGuard('PENDING_REVIEW', 'COMPLETED', { status: 'pass' }), null);
assert.equal(getTaskActionGuard('PENDING_REVIEW', 'NEEDS_REVISION', { status: 'fail' }), null);

console.log('task workflow checks passed');
