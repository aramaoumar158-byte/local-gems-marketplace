import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditReviewInput, canReviewAudit, projectAuditEvents } from './audit-review.ts';

test('only authorized non-suspended administrators may review audit events', () => {
  assert.equal(canReviewAudit(['super_admin'], 'active'), true);
  assert.equal(canReviewAudit(['admin'], 'active'), true);
  assert.equal(canReviewAudit(['admin'], 'suspended'), false);
  assert.equal(canReviewAudit(['seller'], 'active'), false);
  assert.equal(canReviewAudit(['client'], 'active'), false);
  assert.equal(canReviewAudit(['super_admin'], undefined), false);
});
test('model input excludes personal names, contact details, notes and secret settings', () => {
  const [event] = projectAuditEvents([{ id: 'a', admin_id: 'b', action: 'USER_SUSPENDED', target_type: 'user', target_id: 'c', created_at: '2026-11-05T08:00:00Z', metadata: {
    actor_name: 'Private name', note: 'Contact private@example.com', before: { status: 'active', phone: '77699436', value: 'secret', email: 'private@example.com' }, after: { status: 'suspended', value: 'secret' },
  } }]);
  assert.deepEqual(event.before, { status: 'active' });
  assert.deepEqual(event.after, { status: 'suspended' });
  assert.equal(JSON.stringify(event).includes('secret'), false);
  assert.equal(JSON.stringify(event).includes('private@example.com'), false);
});
test('audit review accepts existing event identifiers, not arbitrary event contents', () => {
  const id = '1f96f4e6-f7c0-48ef-bc6f-ef863b12eeb3';
  assert.equal(auditReviewInput.safeParse({ eventIds: [id] }).success, true);
  assert.equal(auditReviewInput.safeParse({ eventIds: [], events: [] }).success, false);
  assert.equal(auditReviewInput.safeParse({ eventIds: ['not-an-id'] }).success, false);
  assert.equal(auditReviewInput.safeParse({ eventIds: Array(51).fill(id) }).success, false);
});