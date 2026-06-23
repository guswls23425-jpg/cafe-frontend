"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Lightbulb, Clock, CalendarDays } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const BACKEND = "http://34.64.58.23:8080"

function useCafeName() {
  const [name, setName] = useState("")
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("cafeName") : null
    if (stored) setName(stored)
  }, [])
  return name
}

function EmptyState({ height = 280 }: { height?: number }) {
  return (
    <div className={`flex items-center justify-center text-sm text-gray-400`} style={{ height }}>
      데이터가 없습니다
    </div>
  )
}

function LoadingState({ height = 280 }: { height?: number }) {
  return (
    <div className={`flex items-center justify-center text-sm text-gray-400`} style={{ height }}>
      불러오는 중…
    </div>
  )
}

// ── 날짜별 이용률 추이 ──────────────────────────────────────────────────────
const dailyConfig = {
  occupancy: { label: "점유율 %", color: "#22c55e" },
}

export function WeeklyTrendsChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<{ date: string; occupancy: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/daily-trend?cafeName=${encodeURIComponent(cafeName)}&days=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  // X축 레이블은 일(day)만 표시
  const formatted = data.map(d => ({ ...d, label: d.date.slice(8) + "일" }))

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          날짜별 이용률 추이
        </CardTitle>
        <CardDescription className="text-gray-500">최근 30일 일별 좌석 점유율 (%)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState height={350} /> : data.length === 0 ? <EmptyState height={350} /> : (
          <ChartContainer config={dailyConfig} className="h-[350px] w-full">
            <AreaChart data={formatted}>
              <defs>
                <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} tickFormatter={v => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={v => [`${v}%`, "점유율"]} />} />
              <Area type="monotone" dataKey="occupancy" stroke="#22c55e" strokeWidth={2} fill="url(#occGrad)" dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── 요일별 평균 점유율 ─────────────────────────────────────────────────────
const weekdayConfig = {
  occupancy: { label: "평균 점유율 %", color: "#3b82f6" },
}

export function ProblemTablesChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<{ day: string; occupancy: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/weekday-occupancy?cafeName=${encodeURIComponent(cafeName)}&days=90`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          요일별 평균 점유율
        </CardTitle>
        <CardDescription className="text-gray-500">최근 90일 요일별 평균 좌석 점유율 (%)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : data.length === 0 ? <EmptyState /> : (
          <ChartContainer config={weekdayConfig} className="h-[280px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 13 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} tickFormatter={v => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={v => [`${v}%`, "평균 점유율"]} />} />
              <Bar dataKey="occupancy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── 시간대별 혼잡도 ────────────────────────────────────────────────────────
const hourlyConfig = {
  occupancy: { label: "점유율 %", color: "#f59e0b" },
}

export function HourlyChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<{ hour: string; occupancy: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/hourly-occupancy?cafeName=${encodeURIComponent(cafeName)}&days=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="h-5 w-5 text-amber-500" />
          시간대별 혼잡도
        </CardTitle>
        <CardDescription className="text-gray-500">최근 30일 시간대별 평균 좌석 점유율 (%)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : data.length === 0 ? <EmptyState /> : (
          <ChartContainer config={hourlyConfig} className="h-[280px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} interval={1} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} tickFormatter={v => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={v => [`${v}%`, "점유율"]} />} />
              <Bar dataKey="occupancy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── 날씨별 카페 혼잡도 ────────────────────────────────────────────────────
interface WeatherCongestionItem {
  name: string
  value: number
  color: string
  dayCount: number
}

export function StayDurationChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<WeatherCongestionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/weather-congestion?cafeName=${encodeURIComponent(cafeName)}&days=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  const chartConfig = Object.fromEntries(data.map(d => [d.name, { label: d.name, color: d.color }]))

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-900">날씨별 카페 혼잡도</CardTitle>
        <CardDescription className="text-gray-500">최근 30일 날씨 유형별 평균 좌석 점유율 (%)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : data.length === 0 ? <EmptyState /> : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [`${v}%`, n]} />} />
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name" strokeWidth={0}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── AI 인사이트 ────────────────────────────────────────────────────────────
export function AIInsightCard() {
  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Lightbulb className="h-5 w-5" />
          AI 비즈니스 인사이트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-gray-700">
          <span className="font-semibold text-amber-600">팁:</span> 피크 시간대에 자리비움 제한 시간을 조정하면 테이블 회전율을 높일 수 있습니다.
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          <span className="font-semibold text-amber-600">관찰:</span> 요일별·시간대별 혼잡도 데이터를 바탕으로 직원 배치 계획을 최적화해 보세요.
        </p>
      </CardContent>
    </Card>
  )
}
