import { Suspense } from "react"

import AceptarInvitacionForm from "@/src/features/auth/components/aceptar-invitacion/aceptar-invitacion"

// El token viaja en la query, así que la página no se puede prerenderizar.
export const dynamic = "force-dynamic"

export default function AceptarInvitacionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}>
      <AceptarInvitacionForm />
    </Suspense>
  )
}
