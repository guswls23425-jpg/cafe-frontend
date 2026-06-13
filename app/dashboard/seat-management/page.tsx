"use client"

import { useState, useRef, memo, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Save, RotateCcw, GripVertical, Lock, Unlock, Loader2,
  Minus, Plus, X, Building2, AlertTriangle, MessageCircleWarning,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HeaderStats } from "@/components/dashboard/header-stats"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── 이벤트 로그 / 차트 데이터 ────────────────────────────────────────────────
type EventStatus = TableStatus | "released"

interface EventItem {
  time: string
  message: string
  status: EventStatus
}

const logStatusColors: Record<EventStatus, string> = {
  active:    "bg-emerald-500",
  away:      "bg-yellow-500",
  available: "bg-gray-400",
  cleaning:  "bg-red-500",
  released:  "bg-gray-300",
}
const logStatusLabels: Record<EventStatus, string> = {
  active:    "[사용중]",
  away:      "[자리비움]",
  available: "[빈자리]",
  cleaning:  "[청소필요]",
  released:  "[해제됨]",
}
const logStatusTextColors: Record<EventStatus, string> = {
  active:    "text-emerald-600",
  away:      "text-yellow-600",
  available: "text-gray-400",
  cleaning:  "text-red-500",
  released:  "text-gray-400",
}

const hourlyData = [
  { hour:"9시",  occupancy:45 }, { hour:"10시", occupancy:62 }, { hour:"11시", occupancy:78 },
  { hour:"12시", occupancy:95 }, { hour:"13시", occupancy:88 }, { hour:"14시", occupancy:75 },
  { hour:"15시", occupancy:68 }, { hour:"16시", occupancy:82 }, { hour:"17시", occupancy:90 },
  { hour:"18시", occupancy:85 },
]
const chartConfig = { occupancy: { label:"점유율 %", color:"#22c55e" } }

// ─── AI 로그 타입 ─────────────────────────────────────────────────────────────
interface AiLog {
  id: number
  status: string
  rawAiStatus: string
  statusLabel: string
  awayTime: string
  statusDuration: number | null
  createdAt: string
}

// ─── 테이블 / 층 타입 ─────────────────────────────────────────────────────────
type TableStatus = "active" | "away" | "available" | "cleaning"

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
  id: number          // 고유 id (삭제 후에도 중복 없음)
  label: string       // "1층", "2층", ...
  tables: TableData[]
  tableCount: number
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const GRID_SIZE         = 20
const TABLE_WIDTH       = 120
const TABLE_HEIGHT      = 100
const ICON_SIZE         = Math.round(TABLE_WIDTH / 6)   // 20px
const PERSON_ROW_HEIGHT = ICON_SIZE + 16
const TOTAL_HEIGHT      = TABLE_HEIGHT + PERSON_ROW_HEIGHT

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function createInitialTables(count = 16): TableData[] {
  return Array.from({ length: count }, (_, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    return {
      id: i + 1,
      name: `테이블 ${i + 1}`,
      status: "available",
      posX: col * (TABLE_WIDTH + 20) + 20,
      posY: row * (TOTAL_HEIGHT + 20) + 20,
      personCount: 0,
    }
  })
}

function createFloor(id: number, index: number): FloorData {
  return { id, label: `${index}층`, tables: [], tableCount: 0 }
}

// ─── 아이콘 ───────────────────────────────────────────────────────────────────
function PersonIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={filled ? "text-gray-800" : "text-gray-300"}>
      <circle cx="12" cy="7" r="4.5" fill="currentColor" />
      <path d="M3 22c0-5 4-9 9-9s9 4 9 9" fill="currentColor" clipPath="inset(0 0 2px 0)" />
    </svg>
  )
}

// ─── 상태 스타일 ──────────────────────────────────────────────────────────────
const statusConfig = {
  active:    { bg:"bg-emerald-50", border:"border-emerald-300", label:"사용중",   dot:"bg-emerald-500" },
  away:      { bg:"bg-yellow-50",  border:"border-yellow-300",  label:"자리비움", dot:"bg-yellow-500"  },
  available: { bg:"bg-gray-50",    border:"border-gray-200",    label:"이용가능", dot:"bg-gray-400"    },
  cleaning:  { bg:"bg-red-50",     border:"border-red-400",     label:"청소필요", dot:"bg-red-500"     },
}

// ─── AI 로그 상태 표시용 ──────────────────────────────────────────────────────
const aiLogStatusStyle: Record<string, { color: string; label: string }> = {
  active:    { color: "bg-emerald-500", label: "사용중" },
  available: { color: "bg-gray-400",   label: "이용가능" },
  away:      { color: "bg-yellow-500", label: "자리비움" },
  cleaning:  { color: "bg-red-500",    label: "청소필요" },
}

// ─── DraggableTable ───────────────────────────────────────────────────────────
interface DraggableTableProps {
  table: TableData
  onLogOpen: (table: TableData) => void
  isEditMode: boolean
}

const DraggableTable = memo(function DraggableTable({
  table, onLogOpen, isEditMode,
}: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !isEditMode,
  })
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available
  const awaySeconds = table.awayTime ? parseInt(table.awayTime) : 0
  const isWarning = statusKey === "away" && awaySeconds >= 300  // 5분 이상 경고
  const isCleaning = statusKey === "cleaning"

  const style: React.CSSProperties = {
    position: "absolute",
    left: table.posX ?? 0,
    top: table.posY ?? 0,
    width: TABLE_WIDTH,
    height: TOTAL_HEIGHT,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    willChange: isEditMode ? "transform" : "auto",
    zIndex: isDragging ? 1000 : 1,
  }

  const handleClick = () => {
    if (isEditMode) return
    onLogOpen(table)
  }

  return (
    <div ref={setNodeRef} style={style} {...(isEditMode ? { ...attributes, ...listeners } : {})}
      className={`relative ${isEditMode ? "cursor-move" : "cursor-pointer"}`}>

      {/* 청소 필요 경고 배지 — 별표 (overflow-hidden 바깥에 배치) */}
      {isCleaning && (
        <div className="absolute -left-3 -top-3 z-20 animate-bounce pointer-events-none drop-shadow-[0_2px_6px_rgba(239,68,68,0.7)]">
          <MessageCircleWarning className="h-7 w-7 text-red-500" fill="#fef2f2" />
        </div>
      )}

      <div className={`relative flex flex-col overflow-hidden rounded-xl border transition-colors ${config.bg} ${config.border} ${isCleaning ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
        style={{ height: TOTAL_HEIGHT }}>

        {/* 테이블 정보 */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-3 text-center"
          onClick={handleClick}>
          {isEditMode && (
            <div className="absolute left-1/2 top-1 -translate-x-1/2">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <span className={`inline-block h-2 w-2 rounded-full ${config.dot} ${isCleaning ? "animate-pulse" : ""}`} />
          </div>
          <div className="text-sm font-semibold text-gray-900">{table.name}</div>
          <div className={`mt-0.5 text-xs font-medium ${isCleaning ? "text-red-600" : "text-gray-500"}`}>{config.label}</div>
          {table.awayTime && !isCleaning && (
            <div className={`mt-0.5 text-xs font-medium ${isWarning ? "text-red-500" : "text-yellow-600"}`}>
              {awaySeconds >= 60 ? `${Math.floor(awaySeconds / 60)}분 ${awaySeconds % 60}초` : `${awaySeconds}초`}
            </div>
          )}
          {!isEditMode && (
            <div className="mt-1 text-[10px] text-gray-400">로그 보기</div>
          )}
        </div>
        <div className={`h-px w-full border-t ${config.border}`} />
        {/* 인원 아이콘 */}
        <div className="flex items-center justify-center bg-white/60 px-2"
          style={{ height: PERSON_ROW_HEIGHT }}>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <PersonIcon key={i} size={ICON_SIZE} filled={i < table.personCount} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── TableOverlay (드래그 중 고스트) ──────────────────────────────────────────
const TableOverlay = memo(function TableOverlay({ table }: { table: TableData }) {
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available
  return (
    <div style={{ width: TABLE_WIDTH, height: TOTAL_HEIGHT, willChange: "transform" }}
      className={`flex flex-col overflow-hidden rounded-xl border shadow-2xl ${config.bg} ${config.border}`}>
      <div className="relative flex flex-1 flex-col items-center justify-center px-3 text-center">
        <div className="absolute left-1/2 top-1 -translate-x-1/2">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <div className="absolute right-2 top-2">
          <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
        </div>
        <div className="text-sm font-semibold text-gray-900">{table.name}</div>
        <div className="mt-0.5 text-xs text-gray-500">{config.label}</div>
      </div>
      <div className={`h-px w-full border-t ${config.border}`} />
      <div className="flex items-center justify-center bg-white/60 px-2" style={{ height: PERSON_ROW_HEIGHT }}>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <PersonIcon key={i} size={ICON_SIZE} filled={i < table.personCount} />
          ))}
        </div>
      </div>
    </div>
  )
})

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SeatManagementPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [cafeName, setCafeName] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 로그 다이얼로그
  const [logDialogTable, setLogDialogTable] = useState<TableData | null>(null)
  const [aiLogs, setAiLogs] = useState<AiLog[]>([])
  const [isLogLoading, setIsLogLoading] = useState(false)

  // 실시간 이벤트 로그
  const EVENT_LOG_KEY = "cafemonitor-event-log"
  const [eventLog, setEventLog] = useState<EventItem[]>([])

  // 폴링용 floors ref (stale closure 방지)
  const floorsRef = useRef<FloorData[]>([])
  // 테이블별 마지막 로그 기록 상태 — 같은 상태는 중복 기록 안 함
  const lastLoggedStatusRef = useRef<Map<string, TableStatus>>(new Map())

  // 층 관리 상태 — 서버/클라이언트 모두 동일한 기본값으로 시작 후 useEffect에서 복구
  const FLOORS_STORAGE_KEY = "cafemonitor-floors-v3"

  const loadFloorsFromStorage = (): { floors: FloorData[]; activeFloorId: number; nextFloorId: number } | null => {
    try {
      const raw = localStorage.getItem(FLOORS_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch { return null }
  }

  const [floors, setFloors] = useState<FloorData[]>([createFloor(1, 1)])
  const [activeFloorId, setActiveFloorId] = useState<number>(1)
  const [nextFloorId, setNextFloorId] = useState(2)

  // 마운트 시 localStorage에서 floors 복구 — 레이아웃(위치/이름)만 사용, AI 상태는 제거
  useEffect(() => {
    const cached = loadFloorsFromStorage()
    if (cached) {
      // status/awayTime/personCount는 AI 전용 — localStorage 값은 stale이므로 초기화
      const layoutOnly = cached.floors.map(f => ({
        ...f,
        tables: f.tables.map(t => ({
          ...t,
          status: "available" as TableStatus,
          awayTime: undefined,
          personCount: 0,
        })),
      }))
      setFloors(layoutOnly)
      setActiveFloorId(cached.activeFloorId)
      setNextFloorId(cached.nextFloorId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // floors가 변경될 때마다 localStorage에 저장 + ref 동기화
  // localStorage에는 레이아웃(posX/posY/name/층 구조)만 저장 — AI 상태는 제외
  useEffect(() => {
    floorsRef.current = floors
    try {
      const layoutToSave = {
        activeFloorId,
        nextFloorId,
        floors: floors.map(f => ({
          ...f,
          tables: f.tables.map(({ id, name, posX, posY }) => ({
            id, name, posX, posY,
            status: "available" as TableStatus,
            personCount: 0,
          })),
        })),
      }
      localStorage.setItem(FLOORS_STORAGE_KEY, JSON.stringify(layoutToSave))
    } catch {}
  }, [floors, activeFloorId, nextFloorId])

  // 마운트 시 eventLog localStorage 복구 (hydration 이후에만 실행)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EVENT_LOG_KEY)
      if (raw) setEventLog(JSON.parse(raw))
    } catch {}
  }, [])

  // eventLog가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(eventLog))
    } catch {}
  }, [eventLog])


  // 현재 층 데이터
  const currentFloor = floors.find(f => f.id === activeFloorId) ?? floors[0]
  const tables = currentFloor?.tables ?? []
  const tableCount = tables.length  // tableCount는 항상 tables.length와 동일

  /** 현재 층의 tables를 업데이트하는 헬퍼 */
  const setTables = useCallback((updater: (prev: TableData[]) => TableData[]) => {
    setFloors(prev => prev.map(f => {
      if (f.id !== activeFloorId) return f
      const next = updater(f.tables)
      return { ...f, tables: next, tableCount: next.length }
    }))
  }, [activeFloorId])

  // ── [1] 로그인 정보 확인 ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      const storedOwnerId = sessionStorage.getItem("ownerId")
      if (!storedOwnerId) {
        alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.")
        router.push("/login")
        return
      }
      try {
        const response = await fetch(`http://34.64.58.23:8080/api/auth/${storedOwnerId}/cafe-name`)
        if (response.ok) {
          const name = await response.text()
          setCafeName(name.replace(/^"|"$/g, "").trim())
        } else {
          setIsLoading(false)
        }
      } catch {
        setIsLoading(false)
      }
    }
    fetchOwnerInfo()
  }, [router])

  // ── [2] 카페 이름 확인 후 층별 좌석 로딩 ────────────────────────────────────
  useEffect(() => {
    if (!cafeName) return

    const fetchAllFloors = async () => {
      // localStorage에 이미 데이터가 있으면 스피너 없이 백그라운드 갱신
      const storageData = loadFloorsFromStorage()
      if (!storageData) setIsLoading(true)
      try {
        // localStorage의 층 구조를 기준으로 유지하면서, 서버의 테이블 데이터만 병합
        const localFloors: FloorData[] = storageData?.floors ?? [createFloor(1, 1)]

        // 신규 floors API 시도
        const floorsRes = await fetch(
          `http://34.64.58.23:8080/api/seats/floors?cafeName=${encodeURIComponent(cafeName)}`
        )
        if (floorsRes.ok) {
          const data: Array<{ floorNumber: number; label: string; seats: TableData[] }> = await floorsRes.json()
          const serverHasRealData = data && data.some(f => (f.seats ?? []).length > 0)

          if (serverHasRealData) {
            // 서버에 실제 데이터가 있으면 서버 기준으로 교체
            const merged = data.map(f => ({
              id: f.floorNumber,
              label: f.label,
              tables: f.seats ?? [],
              tableCount: (f.seats ?? []).length,
            }))
            // 단, localStorage에만 있는 추가 층(빈 층)도 유지
            const serverIds = new Set(merged.map(f => f.id))
            const localOnly = localFloors.filter(f => !serverIds.has(f.id))
            const combined = [...merged, ...localOnly].sort((a, b) => a.id - b.id)
            setFloors(combined)
            setActiveFloorId(combined[0].id)
            setNextFloorId(Math.max(...combined.map(f => f.id)) + 1)
            setIsLoading(false)
            return
          }
        }

        // floors API 실패 or 서버에 데이터 없음 → 구 search API 폴백
        const searchRes = await fetch(
          `http://34.64.58.23:8080/api/seats/search?cafeName=${encodeURIComponent(cafeName)}`
        )
        if (searchRes.ok) {
          const seats: TableData[] = await searchRes.json()
          if (seats && seats.length > 0) {
            // floorNumber가 있으면 층별로 분배, 없으면 상태(status)만 업데이트
            const byFloor = new Map<number, TableData[]>()
            let hasFloorInfo = false
            for (const s of seats) {
              const fn = (s as TableData & { floorNumber?: number }).floorNumber
              if (fn && fn > 1) hasFloorInfo = true
              const key = fn ?? 1
              if (!byFloor.has(key)) byFloor.set(key, [])
              byFloor.get(key)!.push(s)
            }

            if (hasFloorInfo) {
              // floorNumber 정보가 있음 → 층별로 분배
              setFloors(localFloors.map(f => {
                const serverTables = byFloor.get(f.id)
                return serverTables
                  ? { ...f, tables: serverTables, tableCount: serverTables.length }
                  : f
              }))
            } else {
              // floorNumber 없음 (구 DB) → 위치는 localStorage 유지, 상태만 덮어씀
              const statusMap = new Map(seats.map(s => [s.name, s]))
              setFloors(localFloors.map(f => ({
                ...f,
                tables: f.tables.map(t => {
                  const live = statusMap.get(t.name)
                  return live
                    ? { ...t, status: live.status, awayTime: live.awayTime, personCount: live.personCount ?? 0 }
                    : t
                }),
              })))
            }
            setIsLoading(false)
            return
          }
        }

        // 모든 API 실패 + localStorage도 비어있음 → 1층에만 기본 테이블 생성
        if (!storageData) {
          setFloors([{ id: 1, label: "1층", tables: createInitialTables(), tableCount: 16 }])
        }
      } catch {
        // 네트워크 오류 → localStorage 복구 상태 유지
        if (!loadFloorsFromStorage()) {
          setFloors([{ id: 1, label: "1층", tables: createInitialTables(), tableCount: 16 }])
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchAllFloors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeName])

  // ── [3] SSE 실시간 수신 (AI 업데이트 즉시 반영) ──────────────────────────
  // AI → 백엔드 DB 저장 → SSE push → 여기서 수신
  const applyStatusMap = useCallback(
    (statusMap: Map<string, { status: TableStatus; awayTime?: string; personCount: number }>) => {
      // 이벤트 로그 기록 (상태가 바뀐 것만)
      const now = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      const changes: EventItem[] = []
      for (const f of floorsRef.current) {
        for (const t of f.tables) {
          const live = statusMap.get(t.name)
          if (!live) continue
          const lastLogged = lastLoggedStatusRef.current.get(t.name)
          if (live.status !== lastLogged) {
            changes.push({ time: now, message: `${t.name} (${f.label})`, status: live.status })
            lastLoggedStatusRef.current.set(t.name, live.status)
          }
        }
      }
      if (changes.length > 0) setEventLog(prev => [...changes, ...prev].slice(0, 30))

      // 값이 바뀐 경우에만 새 객체 생성 → memo 유효, 불필요한 리렌더 방지
      setFloors(prev => {
        let anyFloorChanged = false
        const next = prev.map(f => {
          let tableChanged = false
          const tables = f.tables.map(t => {
            const live = statusMap.get(t.name)
            if (!live) return t
            if (live.status === t.status && live.awayTime === t.awayTime && live.personCount === t.personCount) return t
            tableChanged = true
            return { ...t, status: live.status, awayTime: live.awayTime, personCount: live.personCount }
          })
          if (!tableChanged) return f
          anyFloorChanged = true
          return { ...f, tables }
        })
        return anyFloorChanged ? next : prev
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (!cafeName || isLoading) return

    const es = new EventSource(
      `http://34.64.58.23:8080/api/seats/stream`
    )

    es.addEventListener("seat-update", (e: MessageEvent) => {
      try {
        const event: {
          cafeName: string
          floorId: number
          seats: Array<{ name: string; status: string; awayTime: string; personCount: number }>
        } = JSON.parse(e.data)

        // 다른 카페 데이터는 무시
        if (event.cafeName !== cafeName) return

        const statusMap = new Map<string, { status: TableStatus; awayTime?: string; personCount: number }>()
        for (const seat of event.seats) {
          statusMap.set(seat.name, {
            status: seat.status as TableStatus,
            awayTime: seat.awayTime || undefined,
            personCount: seat.personCount ?? 0,
          })
        }
        applyStatusMap(statusMap)
      } catch { /* 파싱 오류 무시 */ }
    })

    es.onerror = () => {
      // 연결 끊김 시 EventSource가 자동 재연결 시도
    }

    return () => es.close()
  }, [cafeName, isLoading, applyStatusMap])

  // ── [4] 저장 (신규 floors API → 폴백: 구 save API) ──────────────────────
  // status/awayTime/personCount 는 AI 전용 — 레이아웃(name, posX, posY)만 전송
  const toLayoutOnly = (tables: TableData[]) =>
    tables.map(({ id, name, posX, posY }) => ({ id, name, posX, posY, status: "available", personCount: 0 }))

  const handleSaveChanges = async () => {
    try {
      const body = floors.map(f => ({
        floorNumber: f.id,
        label: f.label,
        seats: toLayoutOnly(f.tables),
      }))

      // 신규 floors/save 시도
      let saved = false
      const floorsRes = await fetch(
        `http://34.64.58.23:8080/api/seats/floors/save?cafeName=${encodeURIComponent(cafeName)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      )
      if (floorsRes.ok) { saved = true }

      // 폴백: 전 층 좌석을 floorNumber 포함 flat list로 저장
      if (!saved) {
        const allSeats = floors.flatMap(f =>
          toLayoutOnly(f.tables).map(t => ({ ...t, floorNumber: f.id }))
        )
        const fallbackRes = await fetch(
          `http://34.64.58.23:8080/api/seats/save?cafeName=${encodeURIComponent(cafeName)}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(allSeats) }
        )
        if (fallbackRes.ok) saved = true
      }

      if (saved) {
        // 전체 층별 배치 데이터를 localStorage에 저장 → 게스트 페이지에서 위치 정보 사용
        try {
          localStorage.setItem(
            `cafemonitor-floor-layout-${cafeName}`,
            JSON.stringify(floors.map(f => ({ id: f.id, label: f.label, tables: f.tables })))
          )
          // 하위 호환: 구조 키도 유지
          localStorage.setItem(
            `cafemonitor-floor-structure-${cafeName}`,
            JSON.stringify(floors.map(f => ({ id: f.id, label: f.label })))
          )
        } catch {}
        alert("🎉 배치 정보가 저장되었습니다!")
      } else {
        alert("🚨 저장 실패: 서버 오류가 발생했습니다.")
      }
    } catch {
      alert("🚨 서버와 연결할 수 없습니다.")
    }
  }

  // ── 층 구조를 서버에 동기화하는 헬퍼 ──────────────────────────────────────
  const syncFloorsToServer = async (updatedFloors: FloorData[]) => {
    if (!cafeName) return
    // 레이아웃(구조) 변경만 전송 — AI가 관리하는 status/awayTime/personCount 제외
    const body = updatedFloors.map(f => ({
      floorNumber: f.id,
      label: f.label,
      seats: toLayoutOnly(f.tables),
    }))
    try {
      const res = await fetch(
        `http://34.64.58.23:8080/api/seats/floors/save?cafeName=${encodeURIComponent(cafeName)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      )
      if (!res.ok) {
        const allSeats = updatedFloors.flatMap(f =>
          toLayoutOnly(f.tables).map(t => ({ ...t, floorNumber: f.id }))
        )
        await fetch(
          `http://34.64.58.23:8080/api/seats/save?cafeName=${encodeURIComponent(cafeName)}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(allSeats) }
        )
      }
    } catch { /* 네트워크 오류는 무시 — 다음 명시적 저장 시 반영됨 */ }
  }

  // ── 층 추가 / 삭제 ────────────────────────────────────────────────────────
  const addFloor = () => {
    const newId = nextFloorId
    const newIndex = floors.length + 1
    const newFloor = createFloor(newId, newIndex)
    const updated = [...floors, newFloor]
    setFloors(updated)
    setNextFloorId(prev => prev + 1)
    setActiveFloorId(newId)
    syncFloorsToServer(updated)
  }

  const removeFloor = (floorId: number) => {
    if (floors.length === 1) return
    const next = floors.filter(f => f.id !== floorId)
    if (activeFloorId === floorId) setActiveFloorId(next[next.length - 1].id)
    setFloors(next)
    // localStorage 즉시 갱신 → 게스트 페이지에서 삭제된 층이 보이지 않도록
    if (cafeName) {
      try {
        localStorage.setItem(
          `cafemonitor-floor-layout-${cafeName}`,
          JSON.stringify(next.map(f => ({ id: f.id, label: f.label, tables: f.tables })))
        )
        localStorage.setItem(
          `cafemonitor-floor-structure-${cafeName}`,
          JSON.stringify(next.map(f => ({ id: f.id, label: f.label })))
        )
      } catch {}
    }
    syncFloorsToServer(next)
  }

  // ── DnD ───────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )
  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as number)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    if (delta.x === 0 && delta.y === 0) { setActiveId(null); return }
    setTables(prev => prev.map(table => {
      if (table.id !== active.id) return table
      const canvas = canvasRef.current
      const maxX = canvas ? canvas.scrollWidth  - TABLE_WIDTH  : 800
      const maxY = canvas ? canvas.scrollHeight - TOTAL_HEIGHT : 600
      return {
        ...table,
        posX: snapToGrid(Math.max(0, Math.min(maxX, (table.posX ?? 0) + delta.x))),
        posY: snapToGrid(Math.max(0, Math.min(maxY, (table.posY ?? 0) + delta.y))),
      }
    }))
    setActiveId(null)
  }

  // ── 테이블 수 조절 ────────────────────────────────────────────────────────
  // tableCount는 tables.length와 항상 동일하게 유지 — 이중 관리 제거
  const adjustTableCount = (delta: number) => {
    const current = tables.length
    const newCount = Math.max(1, Math.min(24, current + delta))
    if (newCount === current) return

    if (newCount > current) {
      // 기존 테이블 id 최댓값 이후로 신규 id 부여 (충돌 방지)
      const allIds = floorsRef.current.flatMap(f => f.tables.map(t => t.id))
      let nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1
      const extra: TableData[] = Array.from({ length: newCount - current }, (_, i) => {
        const idx = current + i
        return {
          id: nextId++,
          name: `테이블 ${idx + 1}`,
          status: "available" as TableStatus,
          posX: (idx % 4) * (TABLE_WIDTH + 20) + 20,
          posY: Math.floor(idx / 4) * (TOTAL_HEIGHT + 20) + 20,
          personCount: 0,
        }
      })
      setFloors(prev => prev.map(f =>
        f.id === activeFloorId
          ? { ...f, tables: [...f.tables, ...extra], tableCount: newCount }
          : f
      ))
    } else {
      setFloors(prev => prev.map(f =>
        f.id === activeFloorId
          ? { ...f, tables: f.tables.slice(0, newCount), tableCount: newCount }
          : f
      ))
    }
  }


  // ── 로그 다이얼로그 열기 ──────────────────────────────────────────────────
  const handleLogOpen = useCallback(async (table: TableData) => {
    setLogDialogTable(table)
    setAiLogs([])
    setIsLogLoading(true)
    try {
      const res = await fetch(`http://34.64.58.23:8080/api/ai/sender?seatId=${table.id}`)
      if (res.ok) {
        const data: AiLog[] = await res.json()
        setAiLogs(data)
      }
    } catch { /* 로그 없음 */ }
    finally { setIsLogLoading(false) }
  }, [])

  const resetPositions = () =>
    setTables(prev => prev.map((t, i) => ({
      ...t,
      posX: (i % 4) * (TABLE_WIDTH + 20) + 20,
      posY: Math.floor(i / 4) * (TOTAL_HEIGHT + 20) + 20,
    })))

  const activeTable = tables.find(t => t.id === activeId)

  // ── 전체 통계 (모든 층 합산) ──────────────────────────────────────────────
  const allTables = useMemo(() => floors.flatMap(f => f.tables), [floors])
  const totalSeats    = allTables.length
  const totalActive   = allTables.filter(t => t.status === "active").length
  const totalAway     = allTables.filter(t => t.status === "away").length
  const totalWarning  = allTables.filter(t => t.status === "cleaning").length

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />

      <main className="ml-64 flex-1 text-gray-900">
        <HeaderStats
          totalSeats={totalSeats}
          activeCount={totalActive}
          awayCount={totalAway}
          warningCount={totalWarning}
        />

        <div className="space-y-6 p-6">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ── 왼쪽: 캔버스 편집 영역 ────────────────────────────────── */}
            <div className="space-y-4 lg:col-span-2">

              {/* 헤더 컨트롤 */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">자리현황표 관리</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isEditMode ? "테이블을 드래그하여 위치를 변경하세요" : "테이블을 클릭하여 상태를 변경하세요"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditMode ? "default" : "outline"} size="sm"
                    className={isEditMode
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                    onClick={() => setIsEditMode(!isEditMode)}>
                    {isEditMode
                      ? <><Unlock className="mr-2 h-4 w-4" />배치 편집 중</>
                      : <><Lock   className="mr-2 h-4 w-4" />배치 편집</>}
                  </Button>
                  <span className="ml-2 text-sm text-gray-500">테이블 수: {tableCount}</span>
                  <Button variant="outline" size="icon"
                    className="h-8 w-8 border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                    onClick={() => adjustTableCount(-1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon"
                    className="h-8 w-8 border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                    onClick={() => adjustTableCount(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 범례 */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-gray-500">범례:</span>
                {[
                  { color:"bg-emerald-500", label:"사용중" },
                  { color:"bg-yellow-500",  label:"자리비움" },
                  { color:"bg-gray-400",    label:"이용가능" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color}`} />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                ))}
              </div>

              {/* ── 층 탭 바 ─────────────────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2">
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
                      {/* 1층(id=1)은 삭제 불가 */}
                      {floor.id !== 1 && (
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); removeFloor(floor.id) }}
                          className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                            isActive ? "hover:bg-emerald-100" : "hover:bg-gray-100"
                          }`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* + 층 추가 */}
                <button
                  onClick={addFloor}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-emerald-400 hover:text-emerald-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  층 추가
                </button>
              </div>

              {/* ── 캔버스 ───────────────────────────────────────────────── */}
              {isLoading ? (
                <div className="flex h-[500px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-100/50">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  <p className="mt-3 text-sm text-gray-500">최신 배치도를 불러오는 중...</p>
                </div>
              ) : (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className={`h-[500px] overflow-auto rounded-xl border ${isEditMode ? "border-emerald-400" : "border-gray-200"}`}>
                    <div
                      ref={canvasRef}
                      className="relative bg-gray-100/50"
                      style={{
                        width: 1200, height: 900,
                        backgroundImage: isEditMode
                          ? `radial-gradient(circle, rgba(156,163,175,0.6) 1px, transparent 1px)`
                          : "none",
                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                      }}
                    >
                      {isEditMode && (
                        <div className="absolute left-4 top-4 z-10 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs text-emerald-700">
                          배치 편집 모드 ({currentFloor?.label}) — 테이블을 드래그하세요
                        </div>
                      )}
                      {tables.map(table => (
                        <DraggableTable
                          key={table.id}
                          table={table}
                          onLogOpen={handleLogOpen}
                          isEditMode={isEditMode}
                        />
                      ))}
                    </div>
                  </div>
                  <DragOverlay>
                    {activeId && activeTable ? <TableOverlay table={activeTable} /> : null}
                  </DragOverlay>
                </DndContext>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  배치 저장 ({currentFloor?.label})
                </Button>
                {isEditMode && (
                  <Button variant="outline"
                    className="border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                    onClick={resetPositions}>
                    <RotateCcw className="mr-2 h-4 w-4" />배치 초기화
                  </Button>
                )}
              </div>
            </div>

            {/* ── 오른쪽: 로그 + 차트 ───────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">실시간 좌석 활동 로그</h3>
                  {eventLog.length > 0 && (
                    <button
                      onClick={() => setEventLog([])}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      초기화
                    </button>
                  )}
                </div>
                <ScrollArea className="h-[280px] rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="space-y-3">
                    {eventLog.length === 0 ? (
                      <p className="py-8 text-center text-xs text-gray-400">AI 상태 변화가 감지되면 여기에 표시됩니다.</p>
                    ) : (
                      eventLog.map((event, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${logStatusColors[event.status]}`} />
                          <div className="flex-1 text-sm">
                            <span className="text-gray-400">{event.time}</span>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className="text-gray-700">{event.message}</span>
                            <span className={`ml-1 font-medium ${logStatusTextColors[event.status]}`}>
                              {logStatusLabels[event.status]}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-medium text-gray-900">오늘의 시간대별 점유율</h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <ChartContainer config={chartConfig} className="h-[160px] w-full">
                    <BarChart data={hourlyData}>
                      <XAxis dataKey="hour" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={{ stroke:"#e5e7eb" }} tickLine={false} />
                      <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={{ stroke:"#e5e7eb" }} tickLine={false} domain={[0,100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="occupancy" fill="#22c55e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── 테이블 로그 다이얼로그 ──────────────────────────────────────────── */}
      <Dialog open={!!logDialogTable} onOpenChange={(open) => { if (!open) setLogDialogTable(null) }}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              {logDialogTable?.status === "cleaning" && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </span>
              )}
              {logDialogTable?.name} — 이벤트 로그
            </DialogTitle>
          </DialogHeader>

          {/* 현재 상태 뱃지 */}
          {logDialogTable && (() => {
            const sk = (logDialogTable.status?.toLowerCase() || "available") as TableStatus
            const cfg = statusConfig[sk] || statusConfig.available
            return (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-sm font-medium text-gray-700">현재 상태: {cfg.label}</span>
                {logDialogTable.awayTime && (
                  <span className="ml-auto text-xs text-gray-500">{logDialogTable.awayTime}</span>
                )}
              </div>
            )
          })()}

          {/* 로그 타임라인 */}
          <ScrollArea className="h-[360px] rounded-lg border border-gray-200 bg-gray-50 p-3">
            {isLogLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : aiLogs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                <AlertTriangle className="h-8 w-8 opacity-30" />
                <p className="text-sm">기록된 이벤트가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {aiLogs.map((log, idx) => {
                  const style = aiLogStatusStyle[log.status] ?? { color: "bg-gray-400", label: log.status }
                  const isAlert = log.status === "cleaning"
                  const date = new Date(log.createdAt)
                  const timeStr = date.toLocaleString("ko-KR", {
                    month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  })
                  return (
                    <div key={log.id ?? idx}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2 ${isAlert ? "bg-red-50 border border-red-200" : "bg-white border border-gray-100"}`}>
                      <div className="mt-1 flex flex-col items-center">
                        <span className={`h-2.5 w-2.5 rounded-full ${style.color} ${isAlert ? "animate-pulse" : ""}`} />
                        {idx < aiLogs.length - 1 && <div className="mt-1 h-full w-px bg-gray-200" style={{ minHeight: 16 }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${isAlert ? "text-red-600" : "text-gray-700"}`}>
                            {style.label}
                          </span>
                          {log.rawAiStatus && log.rawAiStatus !== log.status && (
                            <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
                              {log.rawAiStatus}
                            </span>
                          )}
                          {log.awayTime && (
                            <span className="text-xs text-yellow-600">{log.awayTime}</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-400">{timeStr}</div>
                        {log.statusLabel && (
                          <div className="mt-0.5 text-xs text-gray-500">{log.statusLabel}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
