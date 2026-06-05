"use client"

import { useEffect, useState } from "react"
import { Coffee, ArrowLeft, Store, ArrowRight, Loader2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

// ─── 상수 (seat-management와 동일) ────────────────────────────────────────────
const TABLE_WIDTH       = 120
const TABLE_HEIGHT      = 100
const ICON_SIZE         = Math.round(TABLE_WIDTH / 6) // 20px
const PERSON_ROW_HEIGHT = ICON_SIZE + 16
const TOTAL_HEIGHT      = TABLE_HEIGHT + PERSON_ROW_HEIGHT

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type TableStatus = "active" | "away" | "available"

interface TableData {
  id: number
  name: string
  status: TableStatus
  awayTime?: string
  posX: number
  posY: number
  personCount: number
}

interface FloorData {
  id: number
  label: string
  tables: TableData[]
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const statusConfig = {
  active:    { bg: "bg-emerald-50", border: "border-emerald-300", label: "사용중",   dot: "bg-emerald-500" },
  away:      { bg: "bg-yellow-50",  border: "border-yellow-300",  label: "자리비움", dot: "bg-yellow-500"  },
  available: { bg: "bg-gray-50",    border: "border-gray-200",    label: "이용가능", dot: "bg-gray-400"    },
}

// ─── 사람 아이콘 (읽기 전용) ──────────────────────────────────────────────────
function PersonIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      className={filled ? "text-gray-800" : "text-gray-300"}>
      <circle cx="12" cy="7" r="4.5" fill="currentColor" />
      <path d="M3 22c0-5 4-9 9-9s9 4 9 9" fill="currentColor" clipPath="inset(0 0 2px 0)" />
    </svg>
  )
}

// ─── 테이블 카드 (읽기 전용) ──────────────────────────────────────────────────
function TableCard({ table }: { table: TableData }) {
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available
  const isWarning = statusKey === "away" && table.awayTime && parseInt(table.awayTime.split(":")[0]) >= 5

  return (
    <div
      style={{
        position: "absolute",
        left: table.posX ?? 0,
        top: table.posY ?? 0,
        width: TABLE_WIDTH,
        height: TOTAL_HEIGHT,
      }}
    >
      <div
        className={`flex flex-col overflow-hidden rounded-xl border ${config.bg} ${config.border}`}
        style={{ height: TOTAL_HEIGHT }}
      >
        {/* 테이블 정보 */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-3 text-center">
          <div className="absolute right-2 top-2">
            <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
          </div>
          <div className="text-sm font-semibold text-gray-900">{table.name}</div>
          <div className="mt-0.5 text-xs text-gray-500">{config.label}</div>
          {table.awayTime && (
            <div className={`mt-0.5 text-xs font-medium ${isWarning ? "text-red-500" : "text-yellow-600"}`}>
              {table.awayTime}
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className={`h-px w-full border-t ${config.border}`} />

        {/* 인원 아이콘 (읽기 전용) */}
        <div
          className="flex items-center justify-center gap-0.5 bg-white/60 px-2"
          style={{ height: PERSON_ROW_HEIGHT }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <PersonIcon key={i} size={ICON_SIZE} filled={i < (table.personCount ?? 0)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function GuestPage() {
  const [cafeName, setCafeName] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 층 상태
  const [floors, setFloors] = useState<FloorData[]>([])
  const [activeFloorId, setActiveFloorId] = useState<number>(1)

  const currentFloor = floors.find(f => f.id === activeFloorId) ?? floors[0]
  const tables = currentFloor?.tables ?? []

  const availableCount = tables.filter(t => t.status === "available").length
  const activeCount    = tables.filter(t => t.status === "active").length
  const awayCount      = tables.filter(t => t.status === "away").length

  // ── 초기 로딩 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const storedCafeName = sessionStorage.getItem("guestCafeName")
    if (!storedCafeName) {
      setShowInput(true)
      setIsLoading(false)
      return
    }
    setCafeName(storedCafeName)

    const fetchSeats = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `http://34.64.58.23:8080/api/seats/floors?cafeName=${encodeURIComponent(storedCafeName)}`
        )
        if (response.ok) {
          const data: Array<{ floorNumber: number; label: string; seats: TableData[] }> = await response.json()
          if (data && data.length > 0) {
            setFloors(data.map(f => ({ id: f.floorNumber, label: f.label, tables: f.seats ?? [] })))
            setActiveFloorId(data[0].floorNumber)
          } else {
            sessionStorage.removeItem("guestCafeName")
            setShowInput(true)
            alert("카페 정보를 찾을 수 없습니다. 다시 입력해주세요.")
          }
        } else {
          sessionStorage.removeItem("guestCafeName")
          setShowInput(true)
        }
      } catch {
        sessionStorage.removeItem("guestCafeName")
        setShowInput(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSeats()
  }, [])

  // ── 카페명 검색 ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const inputName = inputValue.trim()
    if (!inputName) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `http://34.64.58.23:8080/api/seats/floors?cafeName=${encodeURIComponent(inputName)}`
      )
      if (response.ok) {
        const data: Array<{ floorNumber: number; label: string; seats: TableData[] }> = await response.json()
        if (data && data.length > 0 && data.some(f => (f.seats ?? []).length > 0)) {
          sessionStorage.setItem("guestCafeName", inputName)
          setCafeName(inputName)
          setFloors(data.map(f => ({ id: f.floorNumber, label: f.label, tables: f.seats ?? [] })))
          setActiveFloorId(data[0].floorNumber)
          setShowInput(false)
        } else {
          alert("🚨 등록되지 않은 카페이거나, 아직 좌석 배치가 완료되지 않았습니다.\n카페 이름을 다시 확인해주세요!")
        }
      }
    } catch {
      alert("🚨 서버와 연결할 수 없습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── 카페명 입력 화면 ─────────────────────────────────────────────────────
  if (showInput) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <Coffee className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
            <h2 className="text-xl font-semibold text-gray-900">손님 모드</h2>
            <p className="mt-1 text-sm text-gray-500">카페 이름을 입력하세요</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">카페명</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="예: 메가커피 강남점"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="border-gray-300 bg-gray-50 pl-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!inputValue.trim() || isLoading}>
              {isLoading ? "조회 중..." : "좌석 현황 보기"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            관리자이신가요?{" "}
            <Link href="/login" className="text-emerald-500 hover:text-emerald-600">로그인하기</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── 로딩 화면 ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-sm text-gray-500">실시간 좌석 배치도를 불러오는 중...</p>
      </div>
    )
  }

  if (!cafeName) return null

  // ── 메인 화면 ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">{cafeName}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">손님 모드</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* 통계 요약 (현재 층 기준) */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-500">{availableCount}</div>
            <div className="text-sm text-gray-500">이용가능</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
            <div className="text-sm text-gray-500">사용중</div>
          </div>
          <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{awayCount}</div>
            <div className="text-sm text-gray-500">자리비움</div>
          </div>
        </div>

        {/* 범례 */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500">범례:</span>
          {[
            { color: "bg-emerald-500", label: "사용중" },
            { color: "bg-yellow-500",  label: "자리비움" },
            { color: "bg-gray-400",    label: "이용가능" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${color}`} />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>

        {/* 층 탭 (읽기 전용) */}
        {floors.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {floors.map((floor) => {
              const isActive = activeFloorId === floor.id
              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setActiveFloorId(floor.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-white text-emerald-600"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <Building2 className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
                  {floor.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 배치도 캔버스 (읽기 전용 + 스크롤) */}
        <div className="h-[500px] overflow-auto rounded-xl border border-gray-200">
          <div
            className="relative bg-gray-100/50"
            style={{ width: 1200, height: 900 }}
          >
            {tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
          <p>실시간 좌석 현황은 AI가 자동으로 업데이트합니다.</p>
          <p className="mt-1">자리비움 상태의 좌석은 곧 이용 가능할 수 있습니다.</p>
        </div>
      </main>
    </div>
  )
}
