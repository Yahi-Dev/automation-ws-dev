// components/shared/stats-card.tsx
import type React from "react"
import { Card, CardContent } from "@/src/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  change?: string
  icon: React.ReactNode
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  const isPositive = change?.startsWith("+")

  return (
    <Card className="border-emerald-200/30 bg-gradient-to-br from-white to-emerald-50/50 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">{icon}</div>
          {change ? (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
            >
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {change}
            </div>
          ) : null}
        </div>
        <p className="text-gray-600 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  )
}