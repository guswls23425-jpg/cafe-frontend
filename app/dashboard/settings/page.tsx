import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"
import {
  CameraFeedSimulator,
  //RuleConfigurations,
} from "@/components/video/video_page"

export default function SettingsPage() {
  return (
    // 🌟 1. min-h-screen 대신 h-screen과 overflow-hidden으로 모니터 화면 크기에 딱 고정!
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <SidebarNav />
      
      {/* 🌟 2. main에 flex flex-col을 주어 내부 요소들이 세로로 차곡차곡 쌓이게 만듦 */}
      <main className="ml-64 flex-1 flex flex-col">
        {/* 상단 헤더 (자기 크기만큼만 차지) */}
        <HeaderStats />
        
        {/* 🌟 3. p-6 영역에 flex-1 flex flex-col min-h-0을 주어, 헤더를 제외한 '남은 세로 공간'을 싹 다 가져감 */}
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <h2 className="mb-6 text-xl font-semibold text-white flex-none">
            시스템 설정 및 카메라 구성
          </h2>
          
          {/* 🌟 4. 그리드 영역에도 flex-1 min-h-0을 주어 팽창력을 자식(카메라 카드)에게 전달! */}
          <div className="flex-1 w-full h-full min-h-0">
            <CameraFeedSimulator />
          </div>
        </div>
      </main>
    </div>
  )
}
