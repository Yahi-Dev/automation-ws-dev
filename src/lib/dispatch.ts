// src/lib/dispatch.ts
// Despacha las campañas programadas cuya fecha ya venció y tienen mensajes pendientes.
// Si la cola está habilitada, encola un job por campaña (procesado por el worker con
// concurrencia + reintentos). Si no, envía de forma síncrona (fallback, comportamiento previo).
import prisma from "./prisma";
import { sendPostMessages } from "./campaign-send";
import { queueEnabled, enqueueCampaign } from "./queue";

export async function findDuePostIds(): Promise<number[]> {
  const duePosts = await prisma.posts.findMany({
    where: {
      isDeleted: false,
      schedule: { lte: new Date() },
      messages: { some: { isDeleted: false, status: { in: ["pending", "failed"] } } },
    },
    select: { id: true },
    orderBy: { schedule: "asc" },
  });
  return duePosts.map((p) => p.id);
}

export type DispatchOutcome = {
  dispatched: number;
  mode: "queued" | "sync";
  summaries: Array<Record<string, unknown>>;
};

export async function dispatchDue(actor: string): Promise<DispatchOutcome> {
  const ids = await findDuePostIds();

  if (queueEnabled) {
    const summaries: Array<Record<string, unknown>> = [];
    for (const postId of ids) {
      const jobId = await enqueueCampaign({ postId, actor });
      summaries.push({ postId, jobId, queued: true });
    }
    return { dispatched: ids.length, mode: "queued", summaries };
  }

  const summaries: Array<Record<string, unknown>> = [];
  for (const postId of ids) {
    const outcome = await sendPostMessages(postId, actor);
    summaries.push(
      outcome.ok
        ? { postId, sent: outcome.sent, failed: outcome.failed, total: outcome.total }
        : { postId, skipped: outcome.reason }
    );
  }
  return { dispatched: ids.length, mode: "sync", summaries };
}
