import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/audit-review')({
  server: { handlers: { POST: async ({ request }) => {
    const { handleAuditReview } = await import('@/lib/audit-review.server');
    return handleAuditReview(request);
  } } },
});