// components/dashboard/contacts-list.tsx
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { MoreVertical, MessageCircle, Phone } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/src/components/ui/skeleton"
import { useDashboard } from "../hooks/use-dashboard"

export function ContactsList() {
  const { data, isLoading } = useDashboard()

  return (
    <Card className="border-emerald-200/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Contactos Recientes</CardTitle>
            <CardDescription>Últimos contactos con los que se ha interactuado</CardDescription>
          </div>
          <Link href="/contacts">
            <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              Ver todos
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {isLoading ? (
            // Skeletons mientras carga
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))
          ) : data?.recentContacts && data.recentContacts.length > 0 ? (
            data.recentContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-emerald-50/50 hover:border-emerald-100 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium group-hover:bg-emerald-200 transition-colors">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                      <Badge
                        variant={contact.status === "activo" ? "default" : "secondary"}
                        className={`text-xs ${contact.status === "activo" 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
                        }`}
                      >
                        {contact.status === "activo" ? "Suscrito" : contact.status === "baja" ? "Baja" : "Sin consentimiento"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Phone size={12} />
                      <span>{contact.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageCircle size={12} />
                    <span>{contact.lastMessage}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No hay contactos recientes</p>
              <Link href="/contacts/create">
                <Button variant="outline" size="sm" className="mt-2">
                  Agregar primer contacto
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}