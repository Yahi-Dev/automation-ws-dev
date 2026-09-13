"use client"

// src/features/inbound/components/dialogo-conversacion.tsx
//
// La conversación con UNA persona, con su caja para contestarle.
//
// Por qué existe: el número que se registra en Twilio deja de funcionar en la
// aplicación normal de WhatsApp. Quien contesta a una campaña escribe a un
// número que ya nadie puede abrir desde el móvil, así que si no se puede
// responder DESDE AQUÍ, no se puede responder en ningún sitio.
//
// Se dibuja como un chat de WhatsApp a propósito: es la forma que cualquiera
// reconoce sin que se la expliquen. Lo tuyo a la derecha en verde, lo de la
// otra persona a la izquierda en gris.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Send,
  XCircle,
} from "lucide-react"
import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/button"
import { Textarea } from "@/src/components/ui/textarea"
import { Skeleton } from "@/src/components/ui/skeleton"
import type { ConversacionDTO, MensajeConversacion } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversacion: ConversacionDTO | null
  isLoading: boolean
  isSending: boolean
  onEnviar: (texto: string) => Promise<ConversacionDTO | null>
}

/**
 * Estado de un mensaje enviado, en palabras que se entienden sin saber nada.
 *
 * Nada de "queued" ni "undelivered": quien usa la app necesita saber si el
 * mensaje llegó o no, no el vocabulario interno de Twilio.
 */
function estadoEnPalabras(estado?: string): {
  texto: string
  icono: React.ReactNode
  clase: string
} {
  switch (estado) {
    case "delivered":
      return {
        texto: "Entregado",
        icono: <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />,
        clase: "text-emerald-700",
      }
    case "read":
      return {
        texto: "Leído",
        icono: <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />,
        clase: "text-sky-700",
      }
    case "sent":
      return {
        texto: "Enviado",
        icono: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
        clase: "text-gray-600",
      }
    case "failed":
    case "undelivered":
      return {
        texto: "No llegó",
        icono: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
        clase: "text-red-600",
      }
    default:
      return {
        texto: "Enviando…",
        icono: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
        clase: "text-gray-500",
      }
  }
}

/**
 * Marca con la que el webhook guarda las contestaciones que manda la app sola
 * (las de BAJA y ALTA). Tiene que coincidir con `sentBy` en
 * src/app/api/whatsapp/inbound/route.ts.
 */
const AUTOR_AUTOMATICO = "respuesta-automatica"

/** Una burbuja del chat. */
function Burbuja({ mensaje }: { mensaje: MensajeConversacion }) {
  const fecha = new Date(mensaje.fecha)
  const hora = isNaN(fecha.getTime()) ? "" : format(fecha, "HH:mm", { locale: es })
  const esMio = mensaje.direccion === "saliente"
  const estado = esMio ? estadoEnPalabras(mensaje.estado) : null
  const esAutomatico = mensaje.enviadoPor === AUTOR_AUTOMATICO

  return (
    <div className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${
          esMio
            ? "rounded-br-sm bg-emerald-100 text-emerald-950"
            : "rounded-bl-sm bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
        }`}
      >
        {/* `whitespace-pre-wrap` conserva los saltos de línea que escribió la
            persona; `break-words` evita que un enlace larguísimo desborde la
            burbuja y saque una barra de desplazamiento horizontal en el móvil. */}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {mensaje.texto || <span className="italic opacity-60">(mensaje vacío)</span>}
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[11px]">
          {/* Sin esta etiqueta, la contestación que manda la app sola al recibir
              un BAJA parece escrita por una persona, y quien mira la
              conversación no entiende quién contestó ni cuándo. */}
          {esAutomatico && (
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-gray-600">
              Respuesta automática
            </span>
          )}
          <span className="text-gray-500">{hora}</span>
          {estado && (
            <span className={`inline-flex items-center gap-1 ${estado.clase}`}>
              {estado.icono}
              {estado.texto}
            </span>
          )}
        </div>

        {mensaje.errorMensaje && (
          <p className="mt-1 text-[11px] leading-snug text-red-600">{mensaje.errorMensaje}</p>
        )}
      </div>
    </div>
  )
}

/**
 * La caja de escribir, con su propio estado.
 *
 * Está separada del diálogo para poder montarla con `key={telefono}`: así React
 * la tira y la vuelve a crear cada vez que se cambia de conversación, y el
 * borrador se queda siempre en la conversación a la que pertenece. Guardar el
 * texto en el diálogo y borrarlo con un efecto haría lo mismo de una forma más
 * frágil (y es justo lo que React 19 desaconseja).
 */
function CajaRespuesta({
  max,
  isSending,
  onEnviar,
}: {
  max: number
  isSending: boolean
  onEnviar: (texto: string) => Promise<ConversacionDTO | null>
}) {
  const [texto, setTexto] = useState("")

  const enviar = async () => {
    const limpio = texto.trim()
    if (!limpio || isSending) return

    const resultado = await onEnviar(limpio)
    // La caja solo se vacía si el mensaje salió. Si falló, lo escrito sigue ahí
    // para corregirlo y reintentarlo, en vez de perderse.
    if (resultado) setTexto("")
  }

  return (
    <>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, max))}
        placeholder="Escribe aquí lo que le quieres contestar…"
        rows={3}
        disabled={isSending}
        className="resize-none text-base"
        aria-label="Tu respuesta"
      />

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* El contador solo aparece cuando de verdad importa: enseñarlo siempre
            convierte un mensaje de dos líneas en un examen. */}
        <span className="text-xs text-muted-foreground">
          {texto.length > max - 200
            ? `Te quedan ${max - texto.length} caracteres`
            : "Se enviará por WhatsApp al número de arriba."}
        </span>

        <Button
          onClick={enviar}
          disabled={!texto.trim() || isSending}
          className="w-full sm:w-auto"
          data-tour="conversacion-enviar"
        >
          {isSending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isSending ? "Enviando…" : "Enviar respuesta"}
        </Button>
      </div>
    </>
  )
}

export default function DialogoConversacion({
  open,
  onOpenChange,
  conversacion,
  isLoading,
  isSending,
  onEnviar,
}: Props) {
  const finDelHilo = useRef<HTMLDivElement | null>(null)

  const max = conversacion?.maxCaracteres ?? 1600
  // Mientras se carga todavia no se sabe nada de la ventana ni del permiso.
  // Sin esta distincion, el hueco de escribir decia "el plazo para contestar ya
  // paso" durante el segundo que tarda en llegar la conversacion, que es
  // exactamente lo contrario de lo que suele ser verdad.
  const cargando = isLoading || !conversacion
  const puedeResponder = Boolean(conversacion?.ventana.abierta)
  const dadoDeBaja = conversacion?.contacto?.consentState === "opted_out"
  const bloqueado = !cargando && (!puedeResponder || dadoDeBaja)

  // El hilo se coloca siempre en el último mensaje, como cualquier chat.
  useEffect(() => {
    if (!open) return
    finDelHilo.current?.scrollIntoView({ block: "end" })
  }, [open, conversacion?.mensajes.length])

  const titulo = cargando
    ? "Cargando…"
    : conversacion?.contacto?.name || "Número no guardado"
  const telefono = conversacion?.telefono ?? ""

  /**
   * Mensajes agrupados por día, para poner una separación con la fecha.
   * Sin esto, un hilo de varios días parece una sola conversación seguida.
   */
  const porDia = useMemo(() => {
    const grupos: { dia: Date; mensajes: MensajeConversacion[] }[] = []

    for (const mensaje of conversacion?.mensajes ?? []) {
      const fecha = new Date(mensaje.fecha)
      if (isNaN(fecha.getTime())) continue

      const ultimo = grupos[grupos.length - 1]
      if (ultimo && isSameDay(ultimo.dia, fecha)) ultimo.mensajes.push(mensaje)
      else grupos.push({ dia: fecha, mensajes: [mensaje] })
    }
    return grupos
  }, [conversacion?.mensajes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        data-tour="conversacion-dialogo"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle className="text-base sm:text-lg">{titulo}</DialogTitle>
          <DialogDescription className="font-mono text-xs sm:text-sm">
            {telefono}
          </DialogDescription>
        </DialogHeader>

        {/* Aviso de la ventana de 24 h. Va ARRIBA y no junto al botón de enviar
            porque la decisión de escribir o no se toma antes de escribir: leer
            "ya no se puede" después de redactar un párrafo es una pérdida de
            tiempo y una frustración evitable. */}
        {!isLoading && conversacion && (
          <div
            className={`shrink-0 px-4 py-2.5 text-sm sm:px-6 ${
              bloqueado
                ? "border-b border-amber-200 bg-amber-50 text-amber-900"
                : "border-b border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
            data-tour="conversacion-ventana"
          >
            {dadoDeBaja ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Esta persona pidió que no le escribas más.</strong> La app no le
                  manda nada. Si algún día vuelve a escribir la palabra <strong>ALTA</strong>,
                  se da de alta sola y entonces sí podrás contestarle.
                </span>
              </p>
            ) : puedeResponder ? (
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Puedes contestarle con tus propias palabras:{" "}
                  <strong>{conversacion.ventanaEnPalabras}</strong>. WhatsApp solo lo permite
                  durante las 24 horas siguientes al último mensaje que te envió.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Ya no puedes contestarle escribiendo.</strong> WhatsApp solo lo
                  permite durante las 24 horas siguientes al último mensaje de esa persona, y
                  ese plazo ya terminó. Para volver a escribirle tienes que mandarle una
                  campaña con una plantilla aprobada, o esperar a que te escriba otra vez.
                </span>
              </p>
            )}
          </div>
        )}

        {/* El hilo. Es lo único que crece y se desplaza. */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="ml-auto h-14 w-2/3" />
              <Skeleton className="h-14 w-4/5" />
            </div>
          ) : porDia.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay nada en esta conversación.
            </p>
          ) : (
            porDia.map((grupo) => (
              <div key={grupo.dia.toISOString()} className="space-y-2">
                <div className="flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-sm ring-1 ring-gray-200">
                    {format(grupo.dia, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                </div>
                {grupo.mensajes.map((m) => (
                  <Burbuja key={`${m.direccion}-${m.id}`} mensaje={m} />
                ))}
              </div>
            ))
          )}
          <div ref={finDelHilo} />
        </div>

        {/* Caja de respuesta */}
        <div
          className="shrink-0 border-t bg-white px-4 py-3 sm:px-6"
          data-tour="conversacion-caja"
        >
          {cargando ? (
            <p className="py-1 text-center text-sm text-muted-foreground">
              Abriendo la conversación…
            </p>
          ) : bloqueado ? (
            <p className="py-1 text-center text-sm text-muted-foreground">
              {dadoDeBaja
                ? "No se puede escribir a quien pidió la baja."
                : "El plazo para contestar por escrito ya pasó."}
            </p>
          ) : (
            <CajaRespuesta
              key={telefono}
              max={max}
              isSending={isSending}
              onEnviar={onEnviar}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
