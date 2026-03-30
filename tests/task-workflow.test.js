const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TASK_LABELS,
  STATUS_LABELS,
  isStatusTransitionAllowed,
  getAvailableTaskActions,
  formatTaskEventAction,
} = require('../lib/task-workflow.js');

test('review tasks can be approved or sent back for revision', () => {
  assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'COMPLETED'), true);
  assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'NEEDS_REVISION'), true);
  assert.equal(isStatusTransitionAllowed('PENDING_REVIEW', 'GENERATING'), false);

  assert.deepEqual(
    getAvailableTaskActions('PENDING_REVIEW').map((item) => item.status),
    ['NEEDS_REVISION', 'COMPLETED']
  );
});

test('revision and failed tasks can return to review', () => {
  assert.deepEqual(
    getAvailableTaskActions('NEEDS_REVISION').map((item) => item.status),
    ['PENDING_REVIEW']
  );
  assert.deepEqual(
    getAvailableTaskActions('FAILED').map((item) => item.status),
    ['PENDING_REVIEW']
  );
});

test('workflow labels expose collaboration copy in Chinese', () => {
  assert.equal(TASK_LABELS.reviewNote, '\u5ba1\u6838\u5907\u6ce8');
  assert.equal(TASK_LABELS.bulkOwner, '\u6279\u91cf\u6307\u6d3e\u8d1f\u8d23\u4eba');
  assert.equal(STATUS_LABELS.NEEDS_REVISION, '\u5f85\u8fd4\u5de5');
  assert.equal(formatTaskEventAction('TASK_APPROVED'), '\u5ba1\u6838\u901a\u8fc7');
});
