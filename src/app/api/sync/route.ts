import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { syncTriggerSchema, formatZodError } from '@/lib/validations';
import { runFullSync } from '@/lib/sync';
import { claimSyncLock, releaseSyncLock } from '@/lib/db/queries';

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

  // SQLite-backed claim shared with the scheduled re-sync — see
  // src/lib/db/queries.ts#claimSyncLock. Not a module-local boolean, so a
  // container restart mid-sync can't wedge future syncs.
  if (!claimSyncLock('manual')) {
    return apiValidationError('A sync is already in progress');
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const result = await runFullSync((stage, stageName, processed, total) => {
          sendEvent('progress', { stage, stageName, processed, total });
        }, { trigger: 'manual' });

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
        releaseSyncLock();
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
