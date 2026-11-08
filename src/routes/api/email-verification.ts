import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/email-verification')({
  server: { handlers: { POST: async ({ request }) => {
    const { handleEmailVerification } = await import('@/lib/email-verification.server');
    return handleEmailVerification(request);
  } } },
});
