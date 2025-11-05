// src/app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { contentFetch } from "@/lib/twilio-content";
import prisma from "@/src/lib/prisma"

export const runtime = "nodejs";

function extractError(e: unknown) {
    let message = "Unknown error";
    let details = undefined;
    let status = 500;
    console.log(e);
    if (typeof e === "object" && e !== null) {
        if ("message" in e && typeof (e as { message: unknown }).message === "string") {
            message = (e as { message: string }).message;
        }
        if ("details" in e) {
            details = (e as Record<string, unknown>).details;
        }
        if ("status" in e && typeof (e as Record<string, unknown>).status === "number") {
            status = (e as Record<string, unknown>).status as number;
        }
    }
    return { message, details, status };
}

export async function POST(req: NextRequest) {
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

        // 1) Crear template en Twilio Content API
        const twilio = await contentFetch(`/Content`, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        // 2) Guardar/actualizar en DB
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
            select: { id: true, sid: true, friendlyName: true, language: true },
        });

        return NextResponse.json({ success: true, template: saved }, { status: 201 });
    } catch (e: unknown) {
        const { message, details, status } = extractError(e);
        return NextResponse.json({ success: false, error: message, details }, { status });
    }
}

// Listar todos (GET /api/templates)
export async function GET() {
    try {
        // Nota: el listado general y fetch por SID están soportados por Content API. :contentReference[oaicite:2]{index=2}
        const list = await contentFetch(`/Content`);
        return NextResponse.json({ success: true, list });
    } catch (e: unknown) {
        let message = "Unknown error";
        let details = undefined;
        let status = 500;
        if (typeof e === "object" && e !== null) {
            if ("message" in e && typeof (e as { message: unknown }).message === "string") {
                message = (e as { message: string }).message;
            }
            if ("details" in e) {
                details = (e as Record<string, unknown>).details;
            }
            if ("status" in e && typeof (e as Record<string, unknown>).status === "number") {
                status = (e as Record<string, unknown>).status as number;
            }
        }
        return NextResponse.json({ success: false, error: message, details }, { status });
    }
}
