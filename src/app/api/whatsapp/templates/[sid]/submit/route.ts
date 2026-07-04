// src/app/api/whatsapp/templates/[sid]/submit/route.ts
// Envía una plantilla a aprobación de WhatsApp y persiste el estado local.
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/src/lib/twilio-content";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export const runtime = "nodejs";

type CustomError = { message?: string; details?: unknown; status?: number };
function isCustomError(obj: unknown): obj is CustomError {
    return typeof obj === "object" && obj !== null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sid: string }> }) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    try {
        const { sid } = await params;
        const { name, category } = await req.json();
        const cat = String(category ?? "UTILITY").toUpperCase();

        // Twilio: POST /Content/{ContentSid}/ApprovalRequests/whatsapp con { name, category }
        const resp = await contentFetch(`/Content/${sid}/ApprovalRequests/whatsapp`, {
            method: "POST",
            body: JSON.stringify({ name: name ?? "mi_template_whatsapp", category: cat }),
        });

        // Persistir el estado local (queda pendiente hasta que WhatsApp lo apruebe/rechace)
        await prisma.twilioContentTemplate
            .updateMany({ where: { sid }, data: { approvalStatus: "pending", category: cat } })
            .catch(() => {});

        return NextResponse.json({ ok: true, approval: resp });
    } catch (e: unknown) {
        let message = "Unknown error";
        let details: unknown = undefined;
        let status = 500;
        if (isCustomError(e)) {
            if (typeof e.message === "string") message = e.message;
            if ("details" in e) details = e.details;
            if (typeof e.status === "number") status = e.status;
        }
        return NextResponse.json({ ok: false, error: message, details }, { status });
    }
}
