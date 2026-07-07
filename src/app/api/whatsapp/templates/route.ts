// src/app/api/whatsapp/templates/route.ts
// Crea plantillas en Twilio Content API (y las cachea en DB) y lista las locales.
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/src/lib/twilio-content";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { parsePagination } from "@/src/lib/pagination";

export const runtime = "nodejs";

function extractError(e: unknown) {
    let message = "Unknown error";
    let details: unknown = undefined;
    let status = 500;
    if (typeof e === "object" && e !== null) {
        if ("message" in e && typeof (e as { message: unknown }).message === "string") {
            message = (e as { message: string }).message;
        }
        if ("details" in e) details = (e as Record<string, unknown>).details;
        if ("status" in e && typeof (e as Record<string, unknown>).status === "number") {
            status = (e as Record<string, unknown>).status as number;
        }
    }
    return { message, details, status };
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });

    try {
        const input = await req.json();
        if (!input?.types || typeof input.types !== "object") {
            return NextResponse.json({ success: false, message: "types inválido" }, { status: 400 });
        }

        const payload = {
            friendly_name: input.friendly_name ?? "mi_template",
            language: input.language ?? "es",
            variables: input.variables ?? { "1": "Cliente" },
            types: input.types,
        };

        // 1) Crear en Twilio Content API
        const twilio = await contentFetch(`/Content`, { method: "POST", body: JSON.stringify(payload) });

        // 2) Guardar/actualizar en DB (estado inicial "received": aún sin enviar a aprobación)
        const saved = await prisma.twilioContentTemplate.upsert({
            where: { sid: twilio.sid },
            create: {
                sid: twilio.sid,
                accountSid: twilio.account_sid,
                friendlyName: twilio.friendly_name,
                language: twilio.language,
                url: twilio.url,
                dateCreated: new Date(twilio.date_created),
                dateUpdated: new Date(twilio.date_updated),
                links: twilio.links,
                types: twilio.types,
                variables: twilio.variables,
                approvalStatus: "received",
            },
            update: {
                friendlyName: twilio.friendly_name,
                language: twilio.language,
                url: twilio.url,
                dateUpdated: new Date(twilio.date_updated),
                links: twilio.links,
                types: twilio.types,
                variables: twilio.variables,
            },
            select: { id: true, sid: true, friendlyName: true, language: true, approvalStatus: true },
        });

        return NextResponse.json({ success: true, template: saved }, { status: 201 });
    } catch (e: unknown) {
        const { message, details, status } = extractError(e);
        return NextResponse.json({ success: false, error: message, details }, { status });
    }
}

// Lista las plantillas locales (con su estado de aprobación) para la UI.
export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });

    try {
        const { limit } = parsePagination(new URL(req.url).searchParams);
        const list = await prisma.twilioContentTemplate.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                sid: true,
                friendlyName: true,
                language: true,
                approvalStatus: true,
                category: true,
                rejectionReason: true,
                createdAt: true,
            },
        });
        return NextResponse.json({ success: true, list });
    } catch (e: unknown) {
        const { message, details, status } = extractError(e);
        return NextResponse.json({ success: false, error: message, details }, { status });
    }
}
