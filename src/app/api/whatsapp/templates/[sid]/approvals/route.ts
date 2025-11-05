// src/app/api/templates/[sid]/approvals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/lib/twilio-content";
export const runtime = "nodejs";

type CustomError = {
    message: string;
    details?: unknown;
    status?: number;
};

export async function GET(_req: NextRequest, { params }: { params: { sid: string } }) {
    try {
        // GET /Content/{ContentSid}/ApprovalRequests retorna histórico/estatus
        // Estados: Received, Pending, Approved, Rejected (con rechazo en rejection_reason). :contentReference[oaicite:4]{index=4}
        const approvals = await contentFetch(`/Content/${params.sid}/ApprovalRequests`);
        return NextResponse.json({ ok: true, approvals });
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
