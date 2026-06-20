"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"

export default function SystemSettingsPage() {
  const router = useRouter()
  const [cafeName, setCafeName] = useState("")
  const [kakaoConnected, setKakaoConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("cafeName")
    if (!stored) { router.push("/login"); return }
    setCafeName(stored)
  }, [router])

  useEffect(() => {
    if (!cafeName) return
    const params = new URLSearchParams(window.location.search)
    const kakaoResult = params.get("kakao")
    if (kakaoResult) {
      window.history.replaceState({}, "", window.location.pathname)
    }
    fetch(`http://34.64.58.23:8080/api/kakao/status?cafeName=${encodeURIComponent(cafeName)}`)
      .then(r => r.json())
      .then(d => setKakaoConnected(d.connected))
      .catch(() => setKakaoConnected(false))
  }, [cafeName])

  const handleKakaoLogin = async () => {
    if (!cafeName) return
    setIsLoading(true)
    const res = await fetch(`http://34.64.58.23:8080/api/kakao/login-url?cafeName=${encodeURIComponent(cafeName)}`)
    const data = await res.json()
    window.location.href = data.url
  }

  const handleKakaoDisconnect = async () => {
    if (!cafeName || !confirm("카카오톡 연동을 해제하시겠습니까?")) return
    setIsDisconnecting(true)
    try {
      await fetch(`http://34.64.58.23:8080/api/kakao/disconnect?cafeName=${encodeURIComponent(cafeName)}`, { method: "DELETE" })
      setKakaoConnected(false)
    } catch {
      alert("연동 해제 중 오류가 발생했습니다.")
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <div className="flex flex-1 flex-col pl-64">
        <HeaderStats />
        <main className="flex-1 p-6">
          <h1 className="mb-6 text-xl font-semibold text-gray-900">시스템 설정</h1>

          {/* 카카오톡 연동 */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">카카오톡 알림 연동</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${kakaoConnected ? "bg-green-400" : "bg-gray-300"}`} />
                <span className="text-sm text-gray-700">카카오톡 알림</span>
                <span className="text-xs text-gray-400">
                  {kakaoConnected === null ? "확인 중..." : kakaoConnected ? "연동됨" : "미연동"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {kakaoConnected && (
                  <button
                    onClick={handleKakaoDisconnect}
                    disabled={isDisconnecting}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    {isDisconnecting ? "해제 중..." : "연동 해제"}
                  </button>
                )}
                <button
                  onClick={handleKakaoLogin}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#FEE500", color: "#000" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                    <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.1 4 6.6l-1 3.6 4.2-2.8c.9.1 1.8.2 2.8.2 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
                  </svg>
                  {kakaoConnected ? "재연동" : "카카오 로그인"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              연동 후 테이블 상태 변경 시 카카오톡으로 알림을 받을 수 있습니다.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
