"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Lightbulb, Clock, CalendarDays } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const BACKEND = "https://cafe-monitor.duckdns.org"

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

// ── 테이블별 평균 체류 시간 ───────────────────────────────────────────────
interface StayDurationItem {
  seatName: string
  floorName: string
  avgMinutes: number
  sessionCount: number
  maxMinutes: number
}

const stayConfig = {
  avgMinutes: { label: "평균 체류(분)", color: "#8b5cf6" },
}

export function StayDurationChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<StayDurationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/stay-duration?cafeName=${encodeURIComponent(cafeName)}&days=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  const formatted = data.map(d => ({
    ...d,
    label: `${d.floorName} ${d.seatName}`,
  }))

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="h-5 w-5 text-purple-500" />
          테이블별 평균 체류 시간
        </CardTitle>
        <CardDescription className="text-gray-500">
          최근 30일 테이블별 평균 체류 시간 (분) · 5분 이내 자리비움은 동일 세션으로 병합
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : data.length === 0 ? <EmptyState /> : (
          <ChartContainer config={stayConfig} className="h-[280px] w-full">
            <BarChart data={formatted} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "#e5e7eb" }} tickLine={false}
                tickFormatter={v => `${v}분`}
              />
              <YAxis
                dataKey="label" type="category"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "#e5e7eb" }} tickLine={false}
                width={80}
              />
              <ChartTooltip
                content={<ChartTooltipContent
                  formatter={(v, _, props) => [
                    `평균 ${v}분 (최대 ${props.payload?.maxMinutes}분 · ${props.payload?.sessionCount}세션)`,
                    ""
                  ]}
                />}
              />
              <Bar dataKey="avgMinutes" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── 날씨-점유율 관계도 ─────────────────────────────────────────────────────
interface WeatherRelationItem {
  date: string
  temp: number
  occupancy: number
  weather: string
  color: string
  humidity: number
}

const WEATHER_GROUPS = ["맑음", "흐림", "비", "눈", "황사"] as const
const WEATHER_COLORS: Record<string, string> = {
  맑음: "#f59e0b", 흐림: "#94a3b8", 비: "#3b82f6", 눈: "#bae6fd", 황사: "#d97706",
}

function WeatherTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as WeatherRelationItem
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-700">{d.date}</p>
      <p style={{ color: d.color }}>{d.weather}</p>
      <p className="text-gray-600">기온 {d.temp}°C</p>
      <p className="text-gray-600">습도 {d.humidity}%</p>
      <p className="font-bold text-gray-800">점유율 {d.occupancy}%</p>
    </div>
  )
}

export function WeatherRelationChart({ cafeName: propName }: { cafeName?: string }) {
  const stored = useCafeName()
  const cafeName = propName || stored
  const [data, setData] = useState<WeatherRelationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/analytics/weather-relation?cafeName=${encodeURIComponent(cafeName)}&days=60`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  // 날씨 유형별로 그룹핑
  const grouped = WEATHER_GROUPS.map(w => ({
    name: w,
    color: WEATHER_COLORS[w],
    points: data.filter(d => d.weather === w),
  })).filter(g => g.points.length > 0)

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          날씨 × 점유율 관계도
        </CardTitle>
        <CardDescription className="text-gray-500">
          최근 60일 — X축 기온(°C), Y축 점유율(%), 색상 날씨 유형
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState height={320} /> : data.length === 0 ? <EmptyState height={320} /> : (
          <>
            {/* 범례 */}
            <div className="mb-3 flex flex-wrap gap-3">
              {grouped.map(g => (
                <span key={g.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name} ({g.points.length}일)
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number" dataKey="temp" name="기온" unit="°C"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={{ stroke: "#e5e7eb" }} tickLine={false}
                  label={{ value: "기온 (°C)", position: "insideBottom", offset: -10, fill: "#9ca3af", fontSize: 11 }}
                />
                <YAxis
                  type="number" dataKey="occupancy" name="점유율" unit="%" domain={[0, 100]}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={{ stroke: "#e5e7eb" }} tickLine={false}
                  label={{ value: "점유율 (%)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip content={<WeatherTooltip />} />
                {grouped.map(g => (
                  <Scatter key={g.name} name={g.name} data={g.points} fill={g.color} fillOpacity={0.75} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </>
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
