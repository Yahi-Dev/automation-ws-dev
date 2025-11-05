// src/app/api/templates/[sid]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/lib/twilio-content";
export const runtime = "nodejs";

type CustomError = {
    message?: string;
    details?: unknown;
    status?: number;
};

function isCustomError(obj: unknown): obj is CustomError {
    return typeof obj === "object" && obj !== null;
}

export async function POST(req: NextRequest, { params }: { params: { sid: string } }) {
    try {
        const { name, category } = await req.json();
        // Twilio: POST /Content/{ContentSid}/ApprovalRequests/whatsapp con { name, category }
        // name = nombre del template de WhatsApp (único por WABA)
        // category = "UTILITY" | "MARKETING" | "AUTHENTICATION"
        // Flujo documentado aquí. :contentReference[oaicite:3]{index=3}
        const resp = await contentFetch(`/Content/${params.sid}/ApprovalRequests/whatsapp`, {
            method: "POST",
            body: JSON.stringify({
                name: name ?? "mi_template_whatsapp",
                category: category ?? "UTILITY",
            }),
        });

        return NextResponse.json({ ok: true, approval: resp });
    } catch (e: unknown) {
        let message = "Unknown error";
        let details: unknown = undefined;
        let status = 500;

        if (isCustomError(e)) {
            if (typeof e.message === "string") {
                message = e.message;
            }
            if ("details" in e) {
                details = e.details;
            }
            if (typeof e.status === "number") {
                status = e.status;
            }
        }
        return NextResponse.json({ ok: false, error: message, details }, { status });
    }
}
