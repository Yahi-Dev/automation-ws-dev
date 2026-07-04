// src/app/api/whatsapp/templates/[sid]/approvals/route.ts
// Consulta el estado de aprobación de una plantilla en Twilio y lo persiste local.
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/src/lib/twilio-content";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export const runtime = "nodejs";

type CustomError = { message: string; details?: unknown; status?: number };

export async function GET(req: NextRequest, { params }: { params: Promise<{ sid: string }> }) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    try {
        const { sid } = await params;
        const approvals = await contentFetch(`/Content/${sid}/ApprovalRequests`);

        // Parsear el estado de WhatsApp y persistirlo
        const wa =
            (approvals as { whatsapp?: { status?: string; category?: string; rejection_reason?: string } })
                .whatsapp ?? {};
        const raw = String(wa.status ?? "").toLowerCase();
        const status = ["received", "pending", "approved", "rejected"].includes(raw) ? raw : undefined;

        if (status) {
            await prisma.twilioContentTemplate
                .updateMany({
                    where: { sid },
                    data: {
                        approvalStatus: status,
                        category: wa.category ? String(wa.category).toUpperCase() : undefined,
                        rejectionReason: wa.rejection_reason ?? null,
                    },
                })
                .catch(() => {});
        }

        return NextResponse.json({ ok: true, approvals, status });
    } catch (e: unknown) {
        let message = "Unknown error";
        let details = undefined;
        let status = 500;
        if (e && typeof e === "object" && "message" in e) {
            message = (e as CustomError).message;
            details = (e as CustomError).details;
            status = (e as CustomError).status || 500;
        }
        return NextResponse.json({ ok: false, error: message, details }, { status });
    }
}
