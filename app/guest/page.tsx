"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Coffee, ArrowLeft, Store, ArrowRight, Loader2 } from "lucide-react" // 💡 Loader2 추가
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const TABLE_WIDTH = 120
const TABLE_HEIGHT = 100

type TableStatus = "active" | "away" | "available"

// ✨ 백엔드 DB 구조(posX, posY)에 맞게 인터페이스 수정
interface TableData {
  id: number
  name: string
  status: TableStatus
  awayTime?: string
  posX: number // 💡 position.x 대신 직접 posX로 받음
  posY: number // 💡 position.y 대신 직접 posY로 받음
}

const statusConfig = {
  active: {
    bg: "bg-emerald-900/50",
    border: "border-emerald-500",
    label: "사용중",
    dot: "bg-emerald-500",
  },
  away: {
    bg: "bg-yellow-900/50",
    border: "border-yellow-500",
    label: "자리비움",
    dot: "bg-yellow-500",
  },
  available: {
    bg: "bg-zinc-900/50",
    border: "border-zinc-800",
    label: "이용가능",
    dot: "bg-zinc-500",
  },
}

export default function GuestPage() {
  const router = useRouter()
  const [cafeName, setCafeName] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [tables, setTables] = useState<TableData[]>([]) 
  const [isLoading, setIsLoading] = useState(true) // 🟢 주석 해제하여 로딩 상태 활성화!

  const availableCount = tables.filter((t) => t.status === "available").length
  const activeCount = tables.filter((t) => t.status === "active").length
  const awayCount = tables.filter((t) => t.status === "away").length

  useEffect(() => {
    const storedCafeName = sessionStorage.getItem("guestCafeName")
    if (!storedCafeName) {
      setShowInput(true)
      setIsLoading(false) // 입력창을 띄워줄 때는 대기 로딩을 끈다
      return
    }
    setCafeName(storedCafeName)

    const fetchSeats = async () => {
      setIsLoading(true) // 🟢 조회 시작 시 로딩 ON
      try {
        const response = await fetch(`http://localhost:8080/api/seats/search?cafeName=${encodeURIComponent(storedCafeName)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setTables(data);
          } else {
            sessionStorage.removeItem("guestCafeName");
            setShowInput(true);
            alert("카페 정보를 찾을 수 없습니다. 다시 입력해주세요.");
          }
        }
      } catch (error) {
        console.error("좌석 로딩 실패:", error);
      } finally {
        setIsLoading(false) // 🟢 성공하든 실패하든 로딩 OFF
      }
    };

    fetchSeats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const inputName = inputValue.trim()
    
    if (!inputName) return
    setIsLoading(true) // 검색 시에도 로딩 처리

    try {
      const response = await fetch(`http://localhost:8080/api/seats/search?cafeName=${encodeURIComponent(inputName)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          sessionStorage.setItem("guestCafeName", inputName)
          setCafeName(inputName)
          setTables(data) 
          setShowInput(false)
        } else {
          alert("🚨 등록되지 않은 카페이거나, 아직 좌석 배치가 완료되지 않았습니다.\n카페 이름을 다시 확인해주세요!");
        }
      }
    } catch (error) {
      console.error("카페 확인 에러:", error);
      alert("🚨 서버와 연결할 수 없습니다.");
    } finally {
      setIsLoading(false)
    }
  }

  // 🟢 1단계 방어선: 카페 이름 입력창 우선 렌더링
  if (showInput) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8">
          <div className="mb-6 text-center">
            <Coffee className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">손님 모드</h2>
            <p className="mt-1 text-sm text-zinc-400">카페 이름을 입력하세요</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">카페명</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="예: 메가커피 강남점"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? "조회 중..." : "좌석 현황 보기"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-zinc-400">
            관리자이신가요?{" "}
            <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 🟢 2단계 방어선: 데이터를 긁어오는 도중일 때 띄워줄 다크 로딩 인디케이터
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-zinc-400 text-sm">실시간 좌석 배치도를 불러오는 중...</p>
      </div>
    )
  }

  if (!cafeName) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">{cafeName}</span>
            </div>
          </div>
          <div className="text-sm text-zinc-400">손님 모드</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Stats Summary */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-500">{availableCount}</div>
            <div className="text-sm text-zinc-400">이용가능</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-3xl font-bold text-white">{activeCount}</div>
            <div className="text-sm text-zinc-400">사용중</div>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{awayCount}</div>
            <div className="text-sm text-zinc-400">자리비움</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm text-zinc-400">범례:</span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-zinc-300">사용중</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-zinc-300">자리비움</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-zinc-500" />
            <span className="text-sm text-zinc-300">이용가능</span>
          </div>
        </div>

        {/* Table Canvas View (Read-Only) */}
        <div className="relative min-h-[500px] w-full overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
          {tables.map((table) => {
            // 💡 범례 방어선 설정 (혹시 다 대문자로 오거나 빈 값이 와도 에러 안 나게 처리)
            const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
            const config = statusConfig[statusKey] || statusConfig.available
            const isWarning = statusKey === "away" && table.awayTime && parseInt(table.awayTime.split(":")[0]) >= 5

            return (
              <div
                key={table.id}
                // ✨ 중요: 백엔드 변수 구조명(table.posX, table.posY)으로 직접 스타일 매핑!
                style={{
                  position: "absolute",
                  left: table.posX ?? 0,
                  top: table.posY ?? 0,
                  width: TABLE_WIDTH,
                  height: TABLE_HEIGHT,
                }}
                className={`rounded-xl border p-3 transition-colors ${config.bg} ${config.border}`}
              >
                {/* 우측 상단 상태 점 */}
                <div className="absolute right-2 top-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
                </div>
                
                {/* 중앙 텍스트 정보 */}
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="text-sm font-semibold text-white">{table.name}</div>
                  <div className="mt-1 text-xs text-zinc-400">{config.label}</div>
                  {table.awayTime && (
                    <div className={`mt-1 text-xs font-medium ${isWarning ? "text-red-400" : "text-yellow-500"}`}>
                      {table.awayTime}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center text-sm text-zinc-400">
          <p>실시간 좌석 현황은 AI가 자동으로 업데이트합니다.</p>
          <p className="mt-1">자리비움 상태의 좌석은 곧 이용 가능할 수 있습니다.</p>
        </div>
      </main>
    </div>
  )
}