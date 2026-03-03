import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { syncTriggerSchema, formatZodError } from '@/lib/validations';
import { runFullSync } from '@/lib/sync';

// Prevent concurrent syncs
let syncInProgress = false;

export async function POST(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = syncTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  if (syncInProgress) {
    return apiValidationError('A sync is already in progress');
  }

  syncInProgress = true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const result = await runFullSync((stage, stageName, processed, total) => {
          sendEvent('progress', { stage, stageName, processed, total });
        });

        sendEvent('complete', {
          status: result.status,
          totalProcessed: result.totalProcessed,
          totalFailed: result.totalFailed,
          stages: result.stages,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent('error', { message });
      } finally {
        syncInProgress = false;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
