"use client"

import { Users, Armchair, Clock, AlertTriangle } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  accent?: "default" | "yellow" | "red" | "green"
}

function StatCard({ title, value, icon, accent = "default" }: StatCardProps) {
  const accentStyles = {
    default: "border-gray-200 bg-white",
    yellow: "border-yellow-500/30 bg-yellow-500/10",
    red: "border-red-500/30 bg-red-500/10",
    green: "border-emerald-500/30 bg-emerald-500/10",
  }

  const iconStyles = {
    default: "text-gray-400",
    yellow: "text-yellow-500",
    red: "text-red-500",
    green: "text-emerald-500",
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${accentStyles[accent]}`}
    >
      <div className={iconStyles[accent]}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export function HeaderStats() {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="전체 좌석"
          value="16"
          icon={<Armchair className="h-5 w-5" />}
        />
        <StatCard
          title="현재 점유율"
          value="75% (12/16)"
          icon={<Users className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          title="자리비움"
          value="3"
          icon={<Clock className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          title="노쇼 경고"
          value="1"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
        />
      </div>
    </header>
  )
}
