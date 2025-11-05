// components/dashboard/schedule-panel.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Clock, Calendar } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/src/components/ui/skeleton"
import { useDashboard } from "../hooks/use-dashboard"

export function SchedulePanel() {
  const { data, isLoading } = useDashboard()

  return (
    <Card className="border-emerald-200/30 bg-gradient-to-br from-white to-emerald-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
            <Clock size={18} />
          </div>
          Próximos Envíos
        </CardTitle>
        <CardDescription>Mensajes programados para enviar</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {isLoading ? (
            // Skeletons mientras carga
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start justify-between p-3 rounded-lg border border-emerald-100 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="text-right ml-3">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              </div>
            ))
          ) : data?.scheduledMessages && data.scheduledMessages.length > 0 ? (
            data.scheduledMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between p-3 rounded-lg border border-emerald-100 bg-white hover:shadow-md hover:border-emerald-200 transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{msg.contact}</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${msg.status === 'pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {msg.status === 'pending' ? 'Pendiente' : 'Programado'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{msg.message}</p>
                </div>
                <div className="text-right ml-3">
                  <div className="flex items-center gap-1 justify-end text-emerald-700 mb-1">
                    <Clock size={12} />
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                      {msg.time}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{msg.date}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Clock className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No hay mensajes programados</p>
              <Link href="/messages/assign">
                <Button variant="outline" size="sm" className="mt-2">
                  Programar mensaje
                </Button>
              </Link>
            </div>
          )}
        </div>
        <Link href="/posts/calendar">
          <Button variant="outline" className="w-full mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            Ver calendario completo
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}