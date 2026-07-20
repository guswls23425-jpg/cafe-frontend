"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { HeaderStats } from "@/components/dashboard/header-stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, RefreshCw, Flame } from "lucide-react"

const BACKEND = "https://cafe-monitor.duckdns.org"

interface TrendIdea {
  emoji: string
  title: string
  description: string
  category?: string
  createdAt: string
}

export default function TrendPage() {
  const [cafeName, setCafeName] = useState("")
  const [ideas, setIdeas] = useState<TrendIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("cafeName")
    if (stored) setCafeName(stored)
  }, [])

  const fetchIdeas = (name: string) => {
    if (!name) return
    setLoading(true)
    fetch(`${BACKEND}/api/trend?cafeName=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => { setIdeas(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (cafeName) fetchIdeas(cafeName) }, [cafeName])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch(`${BACKEND}/api/trend/refresh?cafeName=${encodeURIComponent(cafeName)}`, { method: "POST" })
      fetchIdeas(cafeName)
    } finally {
      setRefreshing(false)
    }
  }

  const menuItems = ideas.filter(i => i.category === "menu")
  const ideaItems = ideas.filter(i => i.category !== "menu")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />
      <main className="ml-64 flex-1">
        <HeaderStats />
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI 트렌드
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                네이버 블로그 · SNS 트렌드를 분석해 이번 주 인기 메뉴와 적용 아이디어를 제공합니다
                {ideas.length > 0 && (
                  <span className="ml-2 text-gray-400">
                    · 최근 업데이트 {new Date(ideas[0].createdAt).toLocaleDateString("ko-KR")} · 매주 월요일 자동 갱신
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading || !cafeName}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-sm text-gray-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> AI가 최신 트렌드를 분석하고 있습니다...
            </div>
          ) : ideas.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm text-gray-400">트렌드 정보를 불러오지 못했습니다.</p>
              <p className="mt-1 text-xs text-gray-400">새로고침 버튼을 눌러 다시 시도해보세요.</p>
            </div>
          ) : (
            <>
              {/* 이번주 인기 메뉴 */}
              {menuItems.length > 0 && (
                <Card className="border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                      <Flame className="h-5 w-5 text-orange-500" />
                      이번주 인기 메뉴
                      <span className="text-xs font-normal text-gray-400">지금 유행하는 음료 · 베이커리</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {menuItems.map((item, i) => (
                        <div key={i} className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-2xl">{item.emoji}</span>
                            <span className="font-semibold text-gray-900">{item.title}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 적용 아이디어 */}
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    적용 아이디어
                    <span className="text-xs font-normal text-gray-400">SNS 바이럴 포인트가 담긴 실행 아이디어</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {ideaItems.map((item, i) => (
                      <div key={i} className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-2xl">{item.emoji}</span>
                          <span className="font-semibold text-gray-900">{item.title}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
