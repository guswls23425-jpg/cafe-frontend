"use client"

import { useEffect, useRef, useState } from "react"
import { Coffee, ArrowLeft, Store, ArrowRight, Loader2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

// ─── 상수 (seat-management와 동일) ────────────────────────────────────────────
const TABLE_WIDTH  = 120
const TABLE_HEIGHT = 100
const CHAIR_DEPTH  = 14
const CHAIR_W      = 18
const CHAIR_H      = 8

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type TableStatus   = "active" | "away" | "available" | "cleaning"
type TableShape    = "rect" | "rounded" | "circle"
type RestroomType  = "male" | "female" | "both"
interface RestroomMarker {
  id: number
  type: RestroomType
  posX: number
  posY: number
}

interface WindowMarker {
  id: number
  posX: number
  posY: number
  angle?: number
  length?: number
}

interface TableData {
  id: number
  name: string
  status: TableStatus
  awayTime?: string
  posX: number
  posY: number
  personCount: number
  shape?: TableShape
  tableWidth?: number
  tableHeight?: number
  capacity?: number
  rotation?: number
  chairAngles?: number[]
  floorNumber?: number
}

interface FloorData {
  id: number
  label: string
  tables: TableData[]
  restrooms?: RestroomMarker[]
  windows?: WindowMarker[]
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const statusConfig: Record<TableStatus, { label: string }> = {
  active:    { label: "사용중"   },
  away:      { label: "자리비움" },
  available: { label: "이용가능" },
  cleaning:  { label: "청소중"   },
}

const statusSvgColors: Record<TableStatus, {
  bg: string; border: string; dot: string; chairFilled: string; chairEmpty: string; text: string
}> = {
  active:    { bg:"#ecfdf5", border:"#6ee7b7", dot:"#10b981", chairFilled:"#10b981", chairEmpty:"#d1fae5", text:"#065f46" },
  away:      { bg:"#fefce8", border:"#fde68a", dot:"#f59e0b", chairFilled:"#f59e0b", chairEmpty:"#fef3c7", text:"#92400e" },
  available: { bg:"#f9fafb", border:"#e5e7eb", dot:"#9ca3af", chairFilled:"#9ca3af", chairEmpty:"#f3f4f6", text:"#6b7280" },
  cleaning:  { bg:"#fff1f2", border:"#fca5a5", dot:"#ef4444", chairFilled:"#ef4444", chairEmpty:"#fee2e2", text:"#991b1b" },
}

// ─── 의자 유틸 ────────────────────────────────────────────────────────────────
function initChairAngles(capacity: number): number[] {
  return Array.from({ length: capacity }, (_, i) =>
    ((i / capacity) * Math.PI * 2 - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
  )
}

function angleToChairPos(
  angle: number, shape: TableShape | undefined,
  tw: number, th: number, cx: number, cy: number
): { x: number; y: number; rotate: number } {
  const hw = tw / 2, hh = th / 2
  const cos = Math.cos(angle), sin = Math.sin(angle)

  if (shape === "circle") {
    const ex = cos * hw, ey = sin * hh
    return { x: cx + ex + cos * CHAIR_DEPTH, y: cy + ey + sin * CHAIR_DEPTH, rotate: (angle * 180 / Math.PI) + 90 }
  }

  const sx = Math.abs(cos) < 1e-9 ? Infinity : hw / Math.abs(cos)
  const sy = Math.abs(sin) < 1e-9 ? Infinity : hh / Math.abs(sin)
  const s  = Math.min(sx, sy)
  const ex = cos * s, ey = sin * s

  let nx: number, ny: number, chairRotate: number
  if (sx <= sy) {
    nx = ex >= 0 ? 1 : -1; ny = 0
    chairRotate = ex >= 0 ? 90 : 270
  } else {
    nx = 0; ny = ey >= 0 ? 1 : -1
    chairRotate = ey >= 0 ? 180 : 0
  }
  return { x: cx + ex + nx * CHAIR_DEPTH, y: cy + ey + ny * CHAIR_DEPTH, rotate: chairRotate }
}

function getChairPositions(
  shape: TableShape | undefined,
  tw: number, th: number, cx: number, cy: number,
  angles: number[], personCount: number
) {
  return angles.map((angle, i) => ({
    ...angleToChairPos(angle, shape, tw, th, cx, cy),
    filled: i < (personCount ?? 0),
  }))
}

// ─── SVG 의자 ─────────────────────────────────────────────────────────────────
function GuestChair({ x, y, rotate, filled, filledColor, emptyColor }: {
  x: number; y: number; rotate: number; filled: boolean
  filledColor: string; emptyColor: string
}) {
  const hw = CHAIR_W / 2, hh = CHAIR_H / 2
  return (
    <rect
      x={x - hw} y={y - hh} width={CHAIR_W} height={CHAIR_H} rx={3}
      fill={filled ? filledColor : emptyColor}
      stroke={filled ? filledColor : "#d1d5db"}
      strokeWidth={1}
      transform={`rotate(${rotate}, ${x}, ${y})`}
    />
  )
}

// ─── SVG 탑뷰 테이블 (읽기 전용) ─────────────────────────────────────────────
function GuestTable({ table }: { table: TableData }) {
  const shape    = table.shape    ?? "rect"
  const w        = table.tableWidth  ?? TABLE_WIDTH
  const h        = table.tableHeight ?? TABLE_HEIGHT
  const capacity = table.capacity ?? 4
  const rotation = table.rotation ?? 0
  const cd       = CHAIR_DEPTH
  const outerW   = w + cd * 2
  const outerH   = h + cd * 2
  const cx       = cd + w / 2
  const cy       = cd + h / 2

  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const colors    = statusSvgColors[statusKey] ?? statusSvgColors.available
  const label     = statusConfig[statusKey]?.label ?? ""
  const isCleaning = statusKey === "cleaning"
  const awaySeconds = table.awayTime ? parseInt(table.awayTime) : 0
  const isWarning   = statusKey === "away" && awaySeconds >= 300

  const angles = (table.chairAngles && table.chairAngles.length === capacity)
    ? table.chairAngles
    : initChairAngles(capacity)
  const chairs = getChairPositions(shape, w, h, cx, cy, angles, table.personCount)

  return (
    <div style={{ position: "absolute", left: table.posX ?? 0, top: table.posY ?? 0 }}>
      <svg
        width={outerW} height={outerH}
        style={{
          display: "block",
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          overflow: "visible",
        }}
      >
        {/* 의자 */}
        {chairs.map((c, i) => (
          <GuestChair key={i} x={c.x} y={c.y} rotate={c.rotate} filled={c.filled}
            filledColor={colors.chairFilled} emptyColor={colors.chairEmpty} />
        ))}

        {/* 테이블 바디 */}
        {shape === "circle" ? (
          <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2}
            fill={colors.bg} stroke={isCleaning ? "#ef4444" : colors.border}
            strokeWidth={isCleaning ? 2 : 1.5} />
        ) : (
          <rect x={cd} y={cd} width={w} height={h}
            rx={shape === "rounded" ? Math.min(w, h) * 0.3 : 10}
            fill={colors.bg} stroke={isCleaning ? "#ef4444" : colors.border}
            strokeWidth={isCleaning ? 2 : 1.5} />
        )}

        {/* 상태 점 */}
        <circle cx={cx + w / 2 - 10} cy={cy - h / 2 + 10} r={4} fill={colors.dot}
          className={isCleaning ? "animate-pulse" : ""} />

        {/* 테이블 이름 */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill={colors.text} fontWeight="600">
          {table.name}
        </text>

        {/* 상태 텍스트 */}
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill={colors.text}>
          {label}
        </text>

        {/* 자리비움 시간 */}
        {table.awayTime && awaySeconds > 0 && (
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize={8}
            fill={isWarning ? "#ef4444" : "#b45309"}>
            {awaySeconds >= 60
              ? `${Math.floor(awaySeconds / 60)}분 ${awaySeconds % 60}초`
              : `${awaySeconds}초`}
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── 화장실 아이콘 (읽기 전용, 바 형태) ─────────────────────────────────────
const R_LEN = 24
const R_T   = 5
const R_GAP = 3

const R_COLORS: Record<string, string[]> = {
  male:   ["#1D4ED8"],
  female: ["#DC2626"],
  both:   ["#1D4ED8", "#DC2626"],
}

function GuestRestroom({ marker }: { marker: RestroomMarker }) {
  const colors = R_COLORS[marker.type] ?? ["#6b7280"]
  const w = R_LEN * colors.length + R_GAP * (colors.length - 1)
  return (
    <div style={{ position: "absolute", left: marker.posX, top: marker.posY }}>
      <svg width={w} height={R_T} style={{ display: "block" }}>
        {colors.map((color, i) => (
          <rect key={i} x={i * (R_LEN + R_GAP)} y={0} width={R_LEN} height={R_T} rx={2} fill={color} />
        ))}
      </svg>
    </div>
  )
}

// ─── 창문 (읽기 전용) ────────────────────────────────────────────────────────
function GuestWindow({ marker }: { marker: WindowMarker }) {
  const len = marker.length ?? 80
  const T   = 5
  const ang = marker.angle ?? 0
  return (
    <div style={{
      position: "absolute",
      left: marker.posX,
      top: marker.posY - T / 2,
      width: len,
      height: T,
      transformOrigin: `0 ${T / 2}px`,
      transform: `rotate(${ang}deg)`,
    }}>
      <svg width={len} height={T} style={{ display: "block" }}>
        <rect x={0} y={0} width={len} height={T} rx={2} fill="#bae6fd" stroke="#38bdf8" strokeWidth={1} />
        <line x1={len/2} y1={0} x2={len/2} y2={T} stroke="#38bdf8" strokeWidth={0.8} />
      </svg>
    </div>
  )
}

// ─── flat seats → floors 변환 ─────────────────────────────────────────────────
function groupSeatsByFloor(seats: TableData[]): FloorData[] {
  const map = new Map<number, TableData[]>()
  for (const seat of seats) {
    const fn = seat.floorNumber ?? 1
    if (!map.has(fn)) map.set(fn, [])
    map.get(fn)!.push(seat)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([fn, tables]) => ({ id: fn, label: `${fn}층`, tables }))
}

// ─── 서버에서 층 데이터 로드 ─────────────────────────────────────────────────
async function fetchFloorsFromServer(cafeName: string): Promise<FloorData[] | null> {
  try {
    const res = await fetch(
      `http://34.64.58.23:8080/api/seats/floors?cafeName=${encodeURIComponent(cafeName)}`
    )
    if (res.ok) {
      const data: Array<{
        floorNumber: number; label: string; seats: TableData[]
        restrooms?: RestroomMarker[]; windows?: WindowMarker[]
      }> = await res.json()
      if (data && data.some(f => (f.seats ?? []).length > 0)) {
        return data.map(f => ({
          id: f.floorNumber,
          label: f.label,
          tables: f.seats ?? [],
          restrooms: f.restrooms ?? [],
          windows:   (f.windows ?? []).map(w => ({ ...w, angle: w.angle ?? 0, length: w.length ?? 80 })),
        }))
      }
    }
  } catch {}
  // 폴백: search API (overlay 없음)
  try {
    const res = await fetch(
      `http://34.64.58.23:8080/api/seats/search?cafeName=${encodeURIComponent(cafeName)}`
    )
    if (res.ok) {
      const seats: TableData[] = await res.json()
      if (seats && seats.length > 0) return groupSeatsByFloor(seats)
    }
  } catch {}
  return null
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function GuestPage() {
  const [cafeName, setCafeName]   = useState("")
  const [inputValue, setInputValue] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [floors, setFloors]             = useState<FloorData[]>([])
  const [activeFloorId, setActiveFloorId] = useState<number>(1)
  const floorsRef = useRef<FloorData[]>([])
  useEffect(() => { floorsRef.current = floors }, [floors])

  const currentFloor    = floors.find(f => f.id === activeFloorId) ?? floors[0]
  const tables          = currentFloor?.tables ?? []
  const availableCount  = tables.filter(t => t.status === "available").length
  const activeCount     = tables.filter(t => t.status === "active").length
  const awayCount       = tables.filter(t => t.status === "away").length
  const cleaningCount   = tables.filter(t => t.status === "cleaning").length

  // ── 초기 로딩 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const storedCafeName = sessionStorage.getItem("guestCafeName")
    if (!storedCafeName) { setShowInput(true); setIsLoading(false); return }
    setCafeName(storedCafeName)

    const load = async () => {
      setIsLoading(true)
      try {
        // 서버 데이터 우선 (shape/size/chairAngles/restrooms/windows 모두 포함)
        const serverFloors = await fetchFloorsFromServer(storedCafeName)
        if (serverFloors && serverFloors.length > 0) {
          setFloors(serverFloors)
          setActiveFloorId(serverFloors[0].id)
          setIsLoading(false)
          return
        }
        // 서버 실패 → localStorage 폴백
        try {
          const raw = localStorage.getItem(`cafemonitor-floor-layout-${storedCafeName}`)
          if (raw) {
            const local: FloorData[] = JSON.parse(raw)
            if (local.length > 0) { setFloors(local); setActiveFloorId(local[0].id); setIsLoading(false); return }
          }
        } catch {}
        // 데이터 없음
        sessionStorage.removeItem("guestCafeName")
        setShowInput(true)
        alert("카페 정보를 찾을 수 없습니다. 다시 입력해주세요.")
      } catch {
        sessionStorage.removeItem("guestCafeName")
        setShowInput(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ── SSE 실시간 수신 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cafeName || isLoading) return
    const es = new EventSource(`http://34.64.58.23:8080/api/seats/stream`)

    es.addEventListener("seat-update", (e: MessageEvent) => {
      try {
        const event: {
          cafeName: string
          floorId: number
          seats: Array<{ name: string; status: string; awayTime: string; personCount: number }>
        } = JSON.parse(e.data)
        if (event.cafeName !== cafeName) return

        const statusMap = new Map<string, { status: TableStatus; awayTime?: string; personCount: number }>()
        for (const seat of event.seats) {
          statusMap.set(seat.name, {
            status: seat.status as TableStatus,
            awayTime: seat.awayTime || undefined,
            personCount: seat.personCount ?? 0,
          })
        }

        setFloors(prev => prev.map(f => ({
          ...f,
          tables: f.tables.map(t => {
            const live = statusMap.get(t.name)
            if (!live) return t
            if (live.status === t.status && live.awayTime === t.awayTime && live.personCount === t.personCount) return t
            return { ...t, status: live.status, awayTime: live.awayTime, personCount: live.personCount }
          }),
        })))
      } catch {}
    })

    es.onerror = () => {}
    return () => es.close()
  }, [cafeName, isLoading])

  // ── 카페명 검색 ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = inputValue.trim()
    if (!name) return
    setIsLoading(true)
    try {
      const serverFloors = await fetchFloorsFromServer(name)
      if (serverFloors && serverFloors.length > 0) {
        sessionStorage.setItem("guestCafeName", name)
        setCafeName(name)
        setFloors(serverFloors)
        setActiveFloorId(serverFloors[0].id)
        setShowInput(false)
      } else {
        alert("🚨 등록되지 않은 카페이거나, 아직 좌석 배치가 완료되지 않았습니다.\n카페 이름을 다시 확인해주세요!")
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
        {/* 통계 요약 */}
        <div className={`mb-8 grid gap-4 ${cleaningCount > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
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
          {cleaningCount > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{cleaningCount}</div>
              <div className="text-sm text-gray-500">청소중</div>
            </div>
          )}
        </div>

        {/* 범례 */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500">범례:</span>
          {[
            { color: "bg-emerald-500", label: "사용중"   },
            { color: "bg-yellow-500",  label: "자리비움" },
            { color: "bg-gray-400",    label: "이용가능" },
            { color: "bg-red-400",     label: "청소중"   },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${color}`} />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>

        {/* 층 선택 탭 */}
        {floors.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {floors.map((floor) => {
              const isActive = activeFloorId === floor.id
              return (
                <button key={floor.id} type="button" onClick={() => setActiveFloorId(floor.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-white text-emerald-600"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}>
                  <Building2 className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
                  {floor.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 배치도 캔버스 (읽기 전용) */}
        <div className="h-[600px] overflow-auto rounded-xl border border-gray-200 bg-gray-100/50">
          <div key={activeFloorId} className="relative" style={{ width: 1200, height: 900 }}>
            {tables.map((table) => (
              <GuestTable key={`${activeFloorId}-${table.id}`} table={table} />
            ))}
            {(currentFloor?.restrooms ?? []).map(r => (
              <GuestRestroom key={r.id} marker={r} />
            ))}
            {(currentFloor?.windows ?? []).map(w => (
              <GuestWindow key={w.id} marker={w} />
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
