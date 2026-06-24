"use client"

import { useEffect, useState } from "react"
import { Users, Armchair, Clock, AlertTriangle } from "lucide-react"

const STORAGE_KEY = "header-stats-cache"

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

interface HeaderStatsProps {
  totalSeats?: number
  activeCount?: number
  awayCount?: number
  warningCount?: number
}

export function HeaderStats({ totalSeats, activeCount, awayCount, warningCount }: HeaderStatsProps) {
  const [stats, setStats] = useState({ totalSeats: 0, activeCount: 0, awayCount: 0, warningCount: 0 })

  // 마운트 시 캐시 복원
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) setStats(JSON.parse(cached))
    } catch {}
  }, [])

  // 실제 값이 들어오면 상태 갱신 + 저장
  useEffect(() => {
    if (totalSeats === undefined) return
    const next = {
      totalSeats:   totalSeats   ?? 0,
      activeCount:  activeCount  ?? 0,
      awayCount:    awayCount    ?? 0,
      warningCount: warningCount ?? 0,
    }
    setStats(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, [totalSeats, activeCount, awayCount, warningCount])

  const { totalSeats: ts, activeCount: ac, awayCount: aw, warningCount: wc } = stats
  const occupancyRate = ts > 0 ? Math.round((ac / ts) * 100) : 0

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="전체 좌석"
          value={String(ts)}
          icon={<Armchair className="h-5 w-5" />}
        />
        <StatCard
          title="현재 점유율"
          value={`${occupancyRate}% (${ac}/${ts})`}
          icon={<Users className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          title="자리비움"
          value={String(aw)}
          icon={<Clock className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          title="청소·경고"
          value={String(wc)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
        />
      </div>
    </header>
  )
}
