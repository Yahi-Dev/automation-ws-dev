// src/lib/twilio-content.ts
const CONTENT_BASE = process.env.TWILIO_CONTENT_BASE_URL || "https://content.twilio.com/v1";

function getAuthHeader() {
    const {
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_API_KEY_SID,
        TWILIO_API_KEY_SECRET,
    } = process.env;

    // Prioriza API Key si existe
    if (TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET && TWILIO_ACCOUNT_SID) {
        // Basic auth con API Key/Secret: SK...:SECRET (Twilio recomienda incluir accountSid en la ruta o como contexto)
        const token = Buffer.from(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`).toString("base64");
        return `Basic ${token}`;
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error("Faltan credenciales de Twilio (SID/TOKEN o API Key/Secret).");
    }
    const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    return `Basic ${token}`;
}

export async function contentFetch(path: string, init?: RequestInit) {
    const headers = {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
    };

    const res = await fetch(`${CONTENT_BASE}${path}`, { ...init, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw Object.assign(
            new Error(json?.message || "Twilio Content API error"),
            { status: res.status, details: json }
        );
    }
    return json;
}
