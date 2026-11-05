import { z } from 'zod';
import type { Database, Json } from '@/integrations/supabase/types';

export const auditReviewInput = z.object({ eventIds: z.array(z.string().uuid()).min(1).max(50) }).strict();
export const canReviewAudit = (roles: string[], status: string | undefined) =>
  Boolean(status && status !== 'suspended' && roles.some(role => role === 'admin' || role === 'super_admin'));

type Entry = Database['public']['Tables']['admin_audit_log']['Row'];
const allowedFields = new Set(['status', 'is_featured', 'is_active', 'stock', 'price', 'amount', 'role', 'permission', 'payment_status', 'delivery_status', 'parent_id']);
function safeSnapshot(value: Json | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, val]) => allowedFields.has(key) && (typeof val === 'number' || typeof val === 'boolean' || (typeof val === 'string' && val.length <= 80))));
}

export function projectAuditEvents(entries: Entry[]) {
  return entries.map(entry => {
    const meta = entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata) ? entry.metadata : {};
    return { id: entry.id, actor_id: entry.admin_id, action: entry.action, target_type: entry.target_type, target_id: entry.target_id, timestamp: entry.created_at,
      before: safeSnapshot(meta['before']), after: safeSnapshot(meta['after']) };
  });
}