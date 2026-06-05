import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"
import {
  WeeklyTrendsChart,
  ProblemTablesChart,
  StayDurationChart,
  AIInsightCard,
} from "@/components/analytics/analytics-charts"

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <main className="ml-64 flex-1">
        <HeaderStats />
        <div className="space-y-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900">분석 및 인사이트</h2>
          
          {/* 주간 추이 차트 */}
          <WeeklyTrendsChart />

          {/* 2열 레이아웃 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ProblemTablesChart />
            <StayDurationChart />
          </div>

          {/* AI 인사이트 섹션 */}
          <AIInsightCard />
        </div>
      </main>
    </div>
  )
}
