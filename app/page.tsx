import Link from "next/link"
import { Coffee, Shield, BarChart3, Bell, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 배경 그라데이션 효과 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* 헤더 */}
      <header className="relative border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-emerald-500" />
            <span className="text-lg font-semibold text-gray-900">카페모니터</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="relative flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-600">
              <Zap className="h-4 w-4" />
              실시간 AI 기반 좌석 모니터링
            </div>
            <h1 className="mb-6 text-balance text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              카페 좌석 관리의
              <br />
              <span className="text-emerald-500">새로운 기준</span>
            </h1>
            <p className="mb-8 text-pretty text-lg text-gray-500 md:text-xl">
              CCTV와 AI 컴퓨터 비전을 활용하여 실시간으로 좌석 현황을 파악하고,
              <br className="hidden md:block" />
              노쇼와 자리비움 문제를 효과적으로 관리하세요.
            </p>
            <Link href="/guest">
                <Button size="lg" className="h-14 bg-emerald-600 px-8 text-lg text-white hover:bg-emerald-700"
              >
                  손님모드로 접속
                </Button>
              </Link>

          </div>
        </section>

        {/* 기능 섹션 */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 md:text-3xl">
            주요 기능
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">실시간 대시보드</h3>
              <p className="text-sm text-gray-500">
                모든 좌석의 현황을 한눈에 파악하고, 시간대별 점유율 통계를 확인하세요.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Bell className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">스마트 알림</h3>
              <p className="text-sm text-gray-500">
                자리비움 시간 초과 시 Discord, 카카오톡으로 즉시 알림을 받아보세요.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">AI 분석 인사이트</h3>
              <p className="text-sm text-gray-500">
                AI가 패턴을 분석하여 테이블 회전율을 높이는 맞춤 권장 사항을 제공합니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="relative border-t border-gray-200 bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-gray-900">카페모니터</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 카페모니터. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
