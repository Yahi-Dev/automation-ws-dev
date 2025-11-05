// utils/template-name.ts
export function slugify(input: string, max = 32) {
    return input
        .toLowerCase()
        .normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '') // sin acentos
        .replace(/[^a-z0-9]+/g, '-')                     // separadores
        .replace(/^-+|-+$/g, '')                         // bordes
        .slice(0, max);
}

export function makeFriendlyName(opts: { text?: string; lang?: string; prefix?: string } = {}) {
    const { text = '', lang = 'es', prefix = 'tpl' } = opts;
    const base = slugify(text || 'sin-texto', 20);
    const ts = new Date();
    const stamp = [
        ts.getFullYear().toString().slice(2),
        String(ts.getMonth() + 1).padStart(2, '0'),
        String(ts.getDate()).padStart(2, '0'),
        String(ts.getHours()).padStart(2, '0'),
        String(ts.getMinutes()).padStart(2, '0'),
    ].join('');
    const rand = Math.random().toString(36).slice(2, 6); // sufijo corto
    return `${prefix}-${lang}-${base}-${stamp}-${rand}`;
}

// (Opcional) Si vas a enviar a aprobación de WhatsApp (nombre HSM):
// Meta exige solo minúsculas, números y guiones bajos, sin espacios.
export function makeWhatsAppTemplateName(input: string, lang = 'es') {
    const core = slugify(input, 30).replaceAll(/-/g, '_');
    return `wa_${lang}_${core}`;
}
