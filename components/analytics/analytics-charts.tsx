"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Lightbulb } from "lucide-react"
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

// 주간 이용률 데이터
const weeklyData = [
  { day: "월", occupancy: 68, away: 12, noShow: 5 },
  { day: "화", occupancy: 72, away: 15, noShow: 3 },
  { day: "수", occupancy: 65, away: 10, noShow: 4 },
  { day: "목", occupancy: 78, away: 18, noShow: 6 },
  { day: "금", occupancy: 85, away: 22, noShow: 8 },
  { day: "토", occupancy: 92, away: 28, noShow: 12 },
  { day: "일", occupancy: 88, away: 25, noShow: 10 },
]

// 문제 테이블 데이터
const problemTablesData = [
  { table: "테이블 4", issues: 42 },
  { table: "테이블 9", issues: 38 },
  { table: "테이블 7", issues: 31 },
  { table: "테이블 12", issues: 28 },
  { table: "테이블 2", issues: 24 },
]

// 체류 시간 분포
const stayDurationData = [
  { name: "1시간 미만", value: 15, color: "#22c55e" },
  { name: "1-2시간", value: 35, color: "#3b82f6" },
  { name: "2-3시간", value: 30, color: "#f59e0b" },
  { name: "4시간 이상", value: 20, color: "#ef4444" },
]

const weeklyChartConfig = {
  occupancy: {
    label: "점유율 %",
    color: "#22c55e",
  },
  away: {
    label: "자리비움",
    color: "#f59e0b",
  },
  noShow: {
    label: "노쇼",
    color: "#ef4444",
  },
}

const problemTablesConfig = {
  issues: {
    label: "문제 횟수",
    color: "#ef4444",
  },
}

const durationChartConfig = {
  "1시간 미만": { label: "1시간 미만", color: "#22c55e" },
  "1-2시간": { label: "1-2시간", color: "#3b82f6" },
  "2-3시간": { label: "2-3시간", color: "#f59e0b" },
  "4시간 이상": { label: "4시간 이상", color: "#ef4444" },
}

export function WeeklyTrendsChart() {
  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          주간 좌석 이용률 추이
        </CardTitle>
        <CardDescription className="text-gray-500">
          지난 주 점유율 및 좌석 활동 현황
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={weeklyChartConfig} className="h-[350px] w-full">
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="awayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#occupancyGradient)"
            />
            <Area
              type="monotone"
              dataKey="away"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#awayGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ProblemTablesChart() {
  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-900">문제 빈도 상위 5개 테이블</CardTitle>
        <CardDescription className="text-gray-500">
          노쇼 및 좌석 독점 발생 횟수
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={problemTablesConfig} className="h-[280px] w-full">
          <BarChart data={problemTablesData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis
              dataKey="table"
              type="category"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              width={70}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="issues" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const BACKEND = "http://34.64.58.23:8080"

interface WeatherCongestionItem {
  weatherMain: string
  name: string
  value: number
  color: string
  dayCount: number
}

export function StayDurationChart({ cafeName }: { cafeName?: string }) {
  const [data, setData] = useState<WeatherCongestionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const name = cafeName || (typeof window !== "undefined" ? localStorage.getItem("cafeName") : null)
    if (!name) { setLoading(false); return }
    fetch(`${BACKEND}/api/analytics/weather-congestion?cafeName=${encodeURIComponent(name)}&days=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cafeName])

  const chartConfig = Object.fromEntries(
    data.map(d => [d.name, { label: d.name, color: d.color }])
  )

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-900">날씨별 카페 혼잡도</CardTitle>
        <CardDescription className="text-gray-500">
          최근 30일 날씨 유형별 평균 좌석 점유율 (%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
            데이터 불러오는 중…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
            데이터가 없습니다
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v, n) => [`${v}%`, n]} />}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
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
          <span className="font-semibold text-amber-600">팁:</span> 테이블 4는 주말 평균 자리비움 시간이 42분입니다.
          피크 시간대(오후 12시~3시)에 자리비움 제한 시간을 15분으로 줄이면 테이블 회전율이 약 18% 증가할 것으로 예상됩니다.
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          <span className="font-semibold text-amber-600">관찰:</span> 토요일 오후에 노쇼율이 35% 더 높게 나타납니다.
          10분 짐만 놓기 경고를 도입하면 하루에 약 3시간의 추가 테이블 이용 시간을 확보할 수 있습니다.
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          <span className="font-semibold text-amber-600">트렌드:</span> 창가 테이블(테이블 1-4)의 평균 점유 시간이 25% 더 깁니다.
          이 인기 좌석에 대해 프리미엄 요금제 또는 시간 제한을 고려해 보세요.
        </p>
      </CardContent>
    </Card>
  )
}
