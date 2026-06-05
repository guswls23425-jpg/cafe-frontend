"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis } from "recharts"

interface LogEvent {
  time: string
  message: string
  status: "occupied" | "away" | "released" | "warning"
}

const mockEvents: LogEvent[] = [
  { time: "14:23", message: "테이블 3", status: "away" },
  { time: "14:20", message: "테이블 9 제한 시간 초과", status: "warning" },
  { time: "14:15", message: "테이블 5 자동 해제됨", status: "released" },
  { time: "14:10", message: "테이블 7", status: "away" },
  { time: "14:02", message: "테이블 12", status: "occupied" },
  { time: "13:55", message: "테이블 2", status: "occupied" },
  { time: "13:48", message: "테이블 8", status: "away" },
  { time: "13:42", message: "테이블 8 자동 해제됨", status: "released" },
  { time: "13:35", message: "테이블 4", status: "occupied" },
  { time: "13:28", message: "테이블 11", status: "occupied" },
]

const statusColors = {
  occupied: "bg-emerald-500",
  away: "bg-yellow-500",
  released: "bg-zinc-500",
  warning: "bg-red-500",
}

const statusLabels = {
  occupied: "[사용중]",
  away: "[자리비움]",
  released: "[해제됨]",
  warning: "[경고]",
}

const hourlyData = [
  { hour: "9시", occupancy: 45 },
  { hour: "10시", occupancy: 62 },
  { hour: "11시", occupancy: 78 },
  { hour: "12시", occupancy: 95 },
  { hour: "13시", occupancy: 88 },
  { hour: "14시", occupancy: 75 },
  { hour: "15시", occupancy: 68 },
  { hour: "16시", occupancy: 82 },
  { hour: "17시", occupancy: 90 },
  { hour: "18시", occupancy: 85 },
]

const chartConfig = {
  occupancy: {
    label: "점유율 %",
    color: "hsl(142, 76%, 36%)",
  },
}

export function EventLog() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1">
        <h3 className="mb-3 text-sm font-medium text-gray-900">실시간 좌석 활동 로그</h3>
        <ScrollArea className="h-[280px] rounded-lg border border-gray-200 bg-white p-3">
          <div className="space-y-3">
            {mockEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`mt-1.5 h-2 w-2 rounded-full ${statusColors[event.status]}`} />
                <div className="flex-1 text-sm">
                  <span className="text-gray-400">{event.time}</span>
                  <span className="mx-2 text-gray-400">-</span>
                  <span className="text-gray-700">{event.message}</span>
                  <span
                    className={`ml-1 font-medium ${
                      event.status === "occupied"
                        ? "text-emerald-600"
                        : event.status === "away"
                          ? "text-yellow-600"
                          : event.status === "warning"
                            ? "text-red-500"
                            : "text-gray-500"
                    }`}
                  >
                    {statusLabels[event.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-900">오늘의 시간대별 피크 점유율</h3>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <BarChart data={hourlyData}>
              <XAxis
                dataKey="hour"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                domain={[0, 100]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="occupancy" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
