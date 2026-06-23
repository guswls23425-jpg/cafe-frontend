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
  AIInsightCard,
} from "@/components/analytics/analytics-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cloud, Droplets, Wind, Thermometer, CalendarDays } from "lucide-react"

const BACKEND = "http://34.64.58.23:8080"

interface WeatherLog {
  temp: number
  feelsLike: number
  tempMin: number
  tempMax: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  weatherMain: string
}

interface SeatOccupancy {
  seatId: number
  name: string
  posX: number
  posY: number
  tableWidth: number | null
  tableHeight: number | null
  shape: string | null
  rotation: number | null
  occupancy: number
  totalCount: number
}

const TABLE_W = 120
const TABLE_H = 80
const CANVAS_W = 700
const CANVAS_H = 400

function occupancyColor(pct: number) {
  if (pct === 0) return { bg: "#f3f4f6", text: "#9ca3af", border: "#e5e7eb" }
  if (pct < 30) return { bg: "#dcfce7", text: "#16a34a", border: "#86efac" }
  if (pct < 60) return { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" }
  return { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" }
}

function FloorPlanView({ seats }: { seats: SeatOccupancy[] }) {
  if (seats.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
        해당 날짜의 좌석 데이터가 없습니다.
      </div>
    )
  }
  return (
    <div className="relative overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div style={{ position: "relative", width: CANVAS_W, height: CANVAS_H, minWidth: CANVAS_W }}>
        {seats.map((seat) => {
          const w = seat.tableWidth ?? TABLE_W
          const h = seat.tableHeight ?? TABLE_H
          const x = seat.posX ?? 0
          const y = seat.posY ?? 0
          const rot = seat.rotation ?? 0
          const colors = occupancyColor(seat.occupancy)
          return (
            <div
              key={seat.seatId}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: h,
                transform: `rotate(${rot}deg)`,
                transformOrigin: "center center",
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: seat.shape === "circle" ? "50%" : seat.shape === "rounded" ? 12 : 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
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

function WeatherCard({ weather }: { weather: WeatherLog | null }) {
  if (!weather) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
        날씨 데이터 없음
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <img
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt={weather.description}
          width={56}
          height={56}
        />
        <div>
          <p className="text-2xl font-bold text-gray-800">{weather.temp?.toFixed(1)}°C</p>
          <p className="text-sm text-gray-500 capitalize">{weather.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Thermometer className="h-3.5 w-3.5 text-orange-400" />
          체감 {weather.feelsLike?.toFixed(1)}°C
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="h-3.5 w-3.5 text-blue-400" />
          습도 {weather.humidity}%
        </div>
        <div className="flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-gray-400" />
          풍속 {weather.windSpeed?.toFixed(1)}m/s
        </div>
        <div className="flex items-center gap-1">
          <Cloud className="h-3.5 w-3.5 text-gray-400" />
          최저 {weather.tempMin?.toFixed(1)} / 최고 {weather.tempMax?.toFixed(1)}°C
        </div>
      </div>
    </div>
  )
}

interface FloorDto {
  floorNumber: number
  floorName: string
}

interface FloorSummary {
  floorNumber: number
  floorName: string
  occupancy: number
  seatCount: number
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [weather, setWeather] = useState<WeatherLog | null>(null)
  const [seats, setSeats] = useState<SeatOccupancy[]>([])
  const [cafeName, setCafeName] = useState("")
  const [floors, setFloors] = useState<FloorDto[]>([])
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [floorSummary, setFloorSummary] = useState<FloorSummary[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("cafeName")
    if (stored) setCafeName(stored)
  }, [])

  useEffect(() => {
    if (!cafeName) return
    fetch(`${BACKEND}/api/seats/floors?cafeName=${encodeURIComponent(cafeName)}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setFloors(d)
          setSelectedFloor(d[0].floorNumber)
        }
      })
      .catch(() => {})
  }, [cafeName])

  useEffect(() => {
    if (!selectedDate) return
    fetch(`${BACKEND}/api/weather/daily?date=${selectedDate}`)
      .then(r => r.status === 204 ? null : r.json())
      .then(d => setWeather(d))
      .catch(() => setWeather(null))
  }, [selectedDate])

  useEffect(() => {
    if (!selectedDate || !cafeName) return
    fetch(`${BACKEND}/api/analytics/daily-occupancy?cafeName=${encodeURIComponent(cafeName)}&date=${selectedDate}&floorId=${selectedFloor}`)
      .then(r => r.json())
      .then(d => setSeats(Array.isArray(d) ? d : []))
      .catch(() => setSeats([]))
  }, [selectedDate, cafeName, selectedFloor])

  useEffect(() => {
    if (!selectedDate || !cafeName) return
    fetch(`${BACKEND}/api/analytics/floor-summary?cafeName=${encodeURIComponent(cafeName)}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setFloorSummary(Array.isArray(d) ? d : []))
      .catch(() => setFloorSummary([]))
  }, [selectedDate, cafeName])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <main className="ml-64 flex-1">
        <HeaderStats />
        <div className="space-y-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900">분석 및 인사이트</h2>

          {/* ── 날짜별 좌석 배치도 + 날씨 ──────────────────────────── */}
          <Card className="border-gray-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <CalendarDays className="h-5 w-5 text-emerald-500" />
                  날짜별 좌석 점유율
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* 층 선택 탭 */}
                  {floors.length > 1 && (
                    <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">층수선택</span>
                    <div className="flex overflow-hidden rounded-lg border border-gray-300">
                      {floors.map(f => (
                        <button
                          key={f.floorNumber}
                          onClick={() => setSelectedFloor(f.floorNumber)}
                          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedFloor === f.floorNumber
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {f.floorName}
                        </button>
                      ))}
                    </div>
                    </div>
                  )}
                  {/* 날짜 선택 */}
                  <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 층별 점유율 비교 테이블 */}
              {floorSummary.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
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
                      {floorSummary.map(f => {
                        const barColor = f.occupancy === 0 ? "#e5e7eb"
                          : f.occupancy < 30 ? "#22c55e"
                          : f.occupancy < 60 ? "#f59e0b"
                          : "#ef4444"
                        return (
                          <tr
                            key={f.floorNumber}
                            onClick={() => setSelectedFloor(f.floorNumber)}
                            className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedFloor === f.floorNumber ? "bg-emerald-50" : ""}`}
                          >
                            <td className="px-3 py-2 font-medium text-gray-700">{f.floorName}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{f.seatCount}석</td>
                            <td className="px-3 py-2 text-center font-bold" style={{ color: barColor }}>
                              {f.occupancy > 0 ? `${f.occupancy}%` : "-"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full transition-all" style={{ width: `${f.occupancy}%`, backgroundColor: barColor }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid items-stretch gap-4 lg:grid-cols-4">
                {/* 날씨 카드 */}
                <div className="flex flex-col lg:col-span-1">
                  <p className="mb-2 text-xs font-medium text-gray-500">{selectedDate} 날씨</p>
                  <div className="flex-1">
                    <WeatherCard weather={weather} />
                  </div>
                </div>
                {/* 좌석 배치도 */}
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

          {/* ── 날짜별 이용률 추이 ────────────────────────────────── */}
          <WeeklyTrendsChart cafeName={cafeName} />

          {/* ── 요일별 점유율 + 날씨별 혼잡도 ───────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ProblemTablesChart cafeName={cafeName} />
            <StayDurationChart cafeName={cafeName} />
          </div>

          {/* ── 시간대별 혼잡도 ──────────────────────────────────── */}
          <HourlyChart cafeName={cafeName} />

          {/* ── 날씨 × 점유율 관계도 ─────────────────────────────── */}
          <WeatherRelationChart cafeName={cafeName} />

          <AIInsightCard />
        </div>
      </main>
    </div>
  )
}
