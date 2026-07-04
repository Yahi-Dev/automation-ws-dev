import twilio from "twilio";
import { getTwilioConfig } from "./app-config";

/** Cliente basado en variables de entorno (compatibilidad). */
export function getTwilioClient() {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error("Twilio credentials are missing");
    }
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/** Cliente resuelto desde la config (app_settings en DB, con fallback a env). */
export async function getTwilioClientFromConfig() {
    const cfg = await getTwilioConfig();
    if (!cfg.accountSid || !cfg.authToken) {
        throw new Error(
            "Faltan credenciales de Twilio (configúralas en Configuración o en el .env)"
        );
    }
    return twilio(cfg.accountSid, cfg.authToken);
}
