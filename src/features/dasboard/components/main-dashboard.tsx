// components/dashboard/main-dashboard.tsx
"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Plus, Send, MessageCircle, RefreshCw, CheckCheck, Eye } from "lucide-react"
import { StatsCard } from "@/src/components/shared/stats-card"
import { ContactsList } from "./contacts-list"
import { SchedulePanel } from "./schedule-panel"
import Link from "next/link"
import { Skeleton } from "@/src/components/ui/skeleton"
import { useDashboard } from "../hooks/use-dashboard"

export function MainDashboard() {
  const { data, isLoading, error, refetch } = useDashboard()

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
            <p className="text-gray-600 mt-1">Gestiona tu automatización de mensajes</p>
          </div>
        </div>
        <Card className="border-red-200">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Error al cargar el dashboard
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-600 mt-1">Gestiona tu automatización de mensajes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={refetch}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link href="/messages/assign">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md hover:shadow-lg transition-all">
              <Plus size={18} />
              Nuevo Mensaje
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-emerald-200/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Mensajes Enviados"
              value={(data?.stats.messagesSent ?? 0).toLocaleString()}
              icon={<Send className="text-emerald-600" />}
            />
            <StatsCard
              title="Entregados"
              value={(data?.stats.delivered ?? 0).toLocaleString()}
              icon={<CheckCheck className="text-emerald-600" />}
            />
            <StatsCard
              title="Leídos"
              value={(data?.stats.read ?? 0).toLocaleString()}
              icon={<Eye className="text-sky-600" />}
            />
            <StatsCard
              title="Fallidos"
              value={(data?.stats.failed ?? 0).toLocaleString()}
              icon={<MessageCircle className="text-rose-500" />}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-emerald-200/30">
          <CardHeader>
            <CardTitle className="text-gray-900">Actividad de Mensajes</CardTitle>
            <CardDescription>Mensajes enviados y pendientes por día</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.messageActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #d1fae5",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="enviados" fill="#10b981" radius={[4, 4, 0, 0]} name="Enviados" />
                  <Bar dataKey="fallidos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Fallidos" />
                  <Bar dataKey="pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pendientes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Schedule Panel */}
        <SchedulePanel />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por estado */}
        <Card className="border-emerald-200/30">
          <CardHeader>
            <CardTitle className="text-gray-900">Distribución por estado</CardTitle>
            <CardDescription>Total de mensajes por estado de entrega</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.statusBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #d1fae5",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Mensajes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Contacts List */}
        <ContactsList />
      </div>
    </div>
  )
}