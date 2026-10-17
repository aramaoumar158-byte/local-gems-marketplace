import { describe, expect, test } from 'bun:test';
import { auditChanges, auditDetails, auditValue } from './audit';

describe('Administrator audit details', () => {
  test('shows the previous and new sensitive account state', () => {
    expect(auditChanges({ before: { status: 'active' }, after: { status: 'suspended' } })).toEqual([{ key: 'status', before: 'active', after: 'suspended' }]);
  });
  test('does not display confidential setting values', () => {
    expect(auditValue('[REDACTED]')).toBe('Valeur confidentielle');
  });
  test('does not report unchanged fields as changes', () => {
    expect(auditChanges({ before: { stock: 10, status: 'active' }, after: { stock: 10, status: 'hidden' } })).toEqual([{ key: 'status', before: 'active', after: 'hidden' }]);
  });
  test('accepts legacy records without snapshots', () => {
    expect(auditDetails(null)).toEqual({});
    expect(auditChanges({ value: 'active', note: null })).toEqual([]);
  });
});