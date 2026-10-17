import type { Json } from '@/integrations/supabase/types';

export function auditDetails(metadata: Json): Record<string, Json | undefined> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

export function auditValue(value: Json | undefined): string {
  if (value === undefined) return '—';
  if (value === '[REDACTED]') return 'Valeur confidentielle';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function auditChanges(metadata: Json) {
  const details = auditDetails(metadata);
  const before = auditDetails(details.before ?? null);
  const after = auditDetails(details.after ?? null);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key => ({ key, before: auditValue(before[key]), after: auditValue(after[key]) }));
}