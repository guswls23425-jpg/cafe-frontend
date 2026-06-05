import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"
import { SeatGrid } from "@/components/dashboard/seat-grid"
import { EventLog } from "@/components/dashboard/event-log"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <main className="ml-64 flex-1">
        <HeaderStats />
        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">실시간 카페 좌석 현황</h2>
            <SeatGrid />
          </div>
          <div className="lg:col-span-1">
            <EventLog />
          </div>
        </div>
      </main>
    </div>
  )
}
