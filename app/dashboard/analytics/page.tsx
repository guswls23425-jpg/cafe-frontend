"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"
import {
  WeeklyTrendsChart,
  ProblemTablesChart,
  StayDurationChart,
  HourlyChart,
  WeatherRelationChart,
} from "@/components/analytics/analytics-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cloud, Droplets, Wind, Thermometer, CalendarDays, BarChart2, Lightbulb } from "lucide-react"

const BACKEND = "http://34.64.58.23:8080"

// ── 타입 ──────────────────────────────────────────────────────────────────
interface WeatherLog {
  temp: number; feelsLike: number; tempMin: number; tempMax: number
  humidity: number; windSpeed: number; description: string; icon: string; weatherMain: string
}
interface SeatOccupancy {
  seatId: number; name: string; posX: number; posY: number
  tableWidth: number | null; tableHeight: number | null
  shape: string | null; rotation: number | null; occupancy: number; totalCount: number
}
interface FloorDto { floorNumber: number; floorName: string }
interface FloorSummary { floorNumber: number; floorName: string; occupancy: number; seatCount: number }

// ── 유틸 ──────────────────────────────────────────────────────────────────
const TABLE_W = 120, TABLE_H = 80, CANVAS_W = 700, CANVAS_H = 400

function getToday() { return new Date().toISOString().slice(0, 10) }

function occupancyColor(pct: number) {
  if (pct === 0) return { bg: "#f3f4f6", text: "#9ca3af", border: "#e5e7eb" }
  if (pct < 30)  return { bg: "#dcfce7", text: "#16a34a", border: "#86efac" }
  if (pct < 60)  return { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" }
  return           { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" }
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-end gap-3 border-b border-gray-200 pb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
  )
}

function WeatherCard({ weather }: { weather: WeatherLog | null }) {
  if (!weather) return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
      날씨 데이터 없음
    </div>
  )
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.description} width={56} height={56} />
        <div>
          <p className="text-2xl font-bold text-gray-800">{weather.temp?.toFixed(1)}°C</p>
          <p className="text-sm text-gray-500 capitalize">{weather.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-orange-400" />체감 {weather.feelsLike?.toFixed(1)}°C</div>
        <div className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-400" />습도 {weather.humidity}%</div>
        <div className="flex items-center gap-1"><Wind className="h-3.5 w-3.5 text-gray-400" />풍속 {weather.windSpeed?.toFixed(1)}m/s</div>
        <div className="flex items-center gap-1"><Cloud className="h-3.5 w-3.5 text-gray-400" />최저 {weather.tempMin?.toFixed(1)} / 최고 {weather.tempMax?.toFixed(1)}°C</div>
      </div>
    </div>
  )
}

function FloorSummaryTable({ summary, selectedFloor, onSelect }: {
  summary: FloorSummary[]; selectedFloor: number; onSelect: (n: number) => void
}) {
  if (summary.length === 0) return null
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="px-3 py-2 text-left font-medium">층</th>
            <th className="px-3 py-2 text-center font-medium">좌석 수</th>
            <th className="px-3 py-2 text-center font-medium">점유율</th>
            <th className="px-3 py-2 text-left font-medium w-40">비율</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {summary.map(f => {
            const c = f.occupancy === 0 ? "#e5e7eb" : f.occupancy < 30 ? "#22c55e" : f.occupancy < 60 ? "#f59e0b" : "#ef4444"
            return (
              <tr key={f.floorNumber} onClick={() => onSelect(f.floorNumber)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedFloor === f.floorNumber ? "bg-emerald-50" : ""}`}>
                <td className="px-3 py-2 font-medium text-gray-700">{f.floorName}</td>
                <td className="px-3 py-2 text-center text-gray-500">{f.seatCount}석</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: c }}>
                  {f.occupancy > 0 ? `${f.occupancy}%` : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${f.occupancy}%`, backgroundColor: c }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FloorPlanView({ seats }: { seats: SeatOccupancy[] }) {
  if (seats.length === 0) return (
    <div className="flex h-48 items-center justify-center text-gray-400 text-sm">해당 날짜의 좌석 데이터가 없습니다.</div>
  )
  return (
    <div className="relative overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div style={{ position: "relative", width: CANVAS_W, height: CANVAS_H, minWidth: CANVAS_W }}>
        {seats.map(seat => {
          const w = seat.tableWidth ?? TABLE_W, h = seat.tableHeight ?? TABLE_H
          const x = seat.posX ?? 0, y = seat.posY ?? 0, rot = seat.rotation ?? 0
          const colors = occupancyColor(seat.occupancy)
          return (
            <div key={seat.seatId} style={{
              position: "absolute", left: x, top: y, width: w, height: h,
              transform: `rotate(${rot}deg)`, transformOrigin: "center center",
              backgroundColor: colors.bg, border: `2px solid ${colors.border}`,
              borderRadius: seat.shape === "circle" ? "50%" : seat.shape === "rounded" ? 12 : 6,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{seat.name}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
                {seat.totalCount === 0 ? "-" : `${seat.occupancy}%`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 실데이터 기반 AI 인사이트 ──────────────────────────────────────────────
function SmartInsightCard({ cafeName }: { cafeName: string }) {
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    if (!cafeName) return
    const enc = encodeURIComponent(cafeName)
    Promise.all([
      fetch(`${BACKEND}/api/analytics/hourly-occupancy?cafeName=${enc}&days=30`).then(r => r.json()),
      fetch(`${BACKEND}/api/analytics/weekday-occupancy?cafeName=${enc}&days=90`).then(r => r.json()),
      fetch(`${BACKEND}/api/analytics/stay-duration?cafeName=${enc}&days=30`).then(r => r.json()),
    ]).then(([hourly, weekday, stay]) => {
      const msgs: string[] = []

      // 피크 시간대
      if (Array.isArray(hourly) && hourly.length > 0) {
        const peak = hourly.reduce((a: any, b: any) => b.occupancy > a.occupancy ? b : a)
        if (peak.occupancy > 0)
          msgs.push(`피크 시간대는 ${peak.hour}로, 평균 점유율 ${peak.occupancy}%입니다. 이 시간에 직원 배치를 강화하세요.`)
      }

      // 가장 바쁜 요일
      if (Array.isArray(weekday) && weekday.length > 0) {
        const busiest = weekday.reduce((a: any, b: any) => b.occupancy > a.occupancy ? b : a)
        const quietest = weekday.reduce((a: any, b: any) => b.occupancy < a.occupancy ? b : a)
        if (busiest.occupancy > 0)
          msgs.push(`${busiest.day}요일이 주간 최고 혼잡(${busiest.occupancy}%), ${quietest.day}요일이 최저(${quietest.occupancy}%)입니다.`)
      }

      // 가장 체류 긴 테이블
      if (Array.isArray(stay) && stay.length > 0) {
        const top = stay[0]
        msgs.push(`${top.floorName} ${top.seatName}의 평균 체류 시간이 ${top.avgMinutes}분으로 가장 깁니다. 회전율 개선이 필요할 수 있습니다.`)
      }

      setInsights(msgs)
    }).catch(() => {})
  }, [cafeName])

  if (insights.length === 0) return null

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Lightbulb className="h-5 w-5" />
          AI 운영 인사이트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((msg, i) => (
          <p key={i} className="text-sm leading-relaxed text-gray-700">
            <span className="font-semibold text-amber-600">· </span>{msg}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [today, setToday] = useState(getToday)
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [cafeName, setCafeName] = useState("")
  const [floors, setFloors] = useState<FloorDto[]>([])
  const [selectedFloor, setSelectedFloor] = useState(1)

  // 섹션 1 — 오늘 현황
  const [todayWeather, setTodayWeather] = useState<WeatherLog | null>(null)
  const [todayFloorSummary, setTodayFloorSummary] = useState<FloorSummary[]>([])

  // 섹션 2 — 날짜별 상세
  const [detailWeather, setDetailWeather] = useState<WeatherLog | null>(null)
  const [seats, setSeats] = useState<SeatOccupancy[]>([])
  const [detailFloorSummary, setDetailFloorSummary] = useState<FloorSummary[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("cafeName")
    if (stored) setCafeName(stored)
  }, [])

  // 자정 정확히 today 갱신
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const ms = new Date().setHours(24, 0, 0, 0) - Date.now()
      timer = setTimeout(() => { const t = getToday(); setToday(t); schedule() }, ms)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // 층 목록
  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/seats/floors?cafeName=${encodeURIComponent(cafeName)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) { setFloors(d); setSelectedFloor(d[0].floorNumber) } })
      .catch(() => {})
  }, [cafeName])

  // 섹션 1 — 오늘 날씨 + 층별 요약
  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/weather/today`)
      .then(r => r.status === 204 ? null : r.json())
      .then(d => setTodayWeather(d)).catch(() => {})
    fetch(`${BACKEND}/api/analytics/floor-summary?cafeName=${encodeURIComponent(cafeName)}&date=${today}`)
      .then(r => r.json()).then(d => setTodayFloorSummary(Array.isArray(d) ? d : [])).catch(() => {})
  }, [cafeName, today])

  // 섹션 2 — 선택 날짜 날씨 + 층별 요약 + 좌석 배치도
  useEffect(() => {
    if (!selectedDate) return
    fetch(`${BACKEND}/api/weather/daily?date=${selectedDate}`)
      .then(r => r.status === 204 ? null : r.json())
      .then(d => setDetailWeather(d)).catch(() => setDetailWeather(null))
  }, [selectedDate])

  useEffect(() => {
    if (!selectedDate || !cafeName) return
    fetch(`${BACKEND}/api/analytics/floor-summary?cafeName=${encodeURIComponent(cafeName)}&date=${selectedDate}`)
      .then(r => r.json()).then(d => setDetailFloorSummary(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${BACKEND}/api/analytics/daily-occupancy?cafeName=${encodeURIComponent(cafeName)}&date=${selectedDate}&floorId=${selectedFloor}`)
      .then(r => r.json()).then(d => setSeats(Array.isArray(d) ? d : [])).catch(() => setSeats([]))
  }, [selectedDate, cafeName, selectedFloor])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <main className="ml-64 flex-1">
        <HeaderStats />
        <div className="space-y-10 p-6">
          <h2 className="text-xl font-semibold text-gray-900">분석 및 인사이트</h2>

          {/* ════════════════════════════════════════════════════════════
              섹션 1 — 오늘 현황
          ════════════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeader
              icon={<Cloud className="h-5 w-5 text-blue-500" />}
              title="오늘 현황"
              sub={`${today} 기준`}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {/* 날씨 */}
              <div className="lg:col-span-1">
                <WeatherCard weather={todayWeather} />
              </div>
              {/* 층별 요약 */}
              <div className="lg:col-span-2">
                <FloorSummaryTable
                  summary={todayFloorSummary}
                  selectedFloor={selectedFloor}
                  onSelect={setSelectedFloor}
                />
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              섹션 2 — 날짜별 상세 조회
          ════════════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeader
              icon={<CalendarDays className="h-5 w-5 text-emerald-500" />}
              title="날짜별 상세 조회"
              sub="날짜를 선택하면 그날의 좌석 점유율과 날씨를 확인합니다"
            />
            <Card className="border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* 층 선택 */}
                    {floors.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">층수선택</span>
                        <div className="flex overflow-hidden rounded-lg border border-gray-300">
                          {floors.map(f => (
                            <button key={f.floorNumber} onClick={() => setSelectedFloor(f.floorNumber)}
                              className={`px-3 py-1.5 text-sm font-medium transition-colors ${selectedFloor === f.floorNumber ? "bg-emerald-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                              {f.floorName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 날짜 선택 */}
                    <input type="date" value={selectedDate} max={today}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 층별 점유율 비교 */}
                <FloorSummaryTable
                  summary={detailFloorSummary}
                  selectedFloor={selectedFloor}
                  onSelect={setSelectedFloor}
                />
                {/* 날씨 + 배치도 */}
                <div className="grid items-stretch gap-4 lg:grid-cols-4">
                  <div className="flex flex-col lg:col-span-1">
                    <p className="mb-2 text-xs font-medium text-gray-500">{selectedDate} 날씨</p>
                    <div className="flex-1"><WeatherCard weather={detailWeather} /></div>
                  </div>
                  <div className="lg:col-span-3">
                    <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-200" /> 데이터 없음</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-200" /> 0~30%</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-yellow-200" /> 30~60%</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-200" /> 60%+</span>
                    </div>
                    <FloorPlanView seats={seats} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ════════════════════════════════════════════════════════════
              섹션 3 — 기간 분석
          ════════════════════════════════════════════════════════════ */}
          <section className="space-y-6">
            <SectionHeader
              icon={<BarChart2 className="h-5 w-5 text-purple-500" />}
              title="기간 분석"
              sub="누적 데이터를 기반으로 운영 패턴을 파악합니다"
            />

            {/* 날짜별 이용률 추이 */}
            <WeeklyTrendsChart cafeName={cafeName} />

            {/* 요일별 | 시간대별 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <ProblemTablesChart cafeName={cafeName} />
              <HourlyChart cafeName={cafeName} />
            </div>

            {/* 테이블별 체류시간 */}
            <StayDurationChart cafeName={cafeName} />

            {/* 날씨 × 점유율 관계도 */}
            <WeatherRelationChart cafeName={cafeName} />

            {/* AI 인사이트 */}
            <SmartInsightCard cafeName={cafeName} />
          </section>

        </div>
      </main>
    </div>
  )
}
