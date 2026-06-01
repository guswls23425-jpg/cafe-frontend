"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Grid,
  BarChart3, 
  Settings, 
  Coffee,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "좌석 관리",
    href: "/dashboard/seat-management", 
    icon: Grid,
  },
  {
    title: "분석 및 인사이트",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "시스템 설정",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()

  // 로그아웃 처리 함수 만들기
  const handleLogout = () => {
    // 1. 브라우저에 저장된 사장님 정보 싹 지우기
    localStorage.removeItem("cafeId");
    localStorage.removeItem("cafeName");
    sessionStorage.removeItem("guestCafeName"); // (선택) 손님 모드 기록도 삭제
    
    // 2. 로그인 페이지로 쫓아내기
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Coffee className="h-6 w-6 text-emerald-500" />
        <span className="text-lg font-semibold text-white">카페모니터</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
