"use client"

import { useState, useRef, memo, useCallback, useEffect } from "react"
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
  ChevronUp, ChevronDown, Minus, Plus, X, Building2,
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

// ─── 이벤트 로그 / 차트 데이터 ────────────────────────────────────────────────
const mockEvents = [
  { time: "14:23", message: "테이블 3", status: "away" as const },
  { time: "14:20", message: "테이블 9 제한 시간 초과", status: "warning" as const },
  { time: "14:15", message: "테이블 5 자동 해제됨", status: "released" as const },
  { time: "14:10", message: "테이블 7", status: "away" as const },
  { time: "14:02", message: "테이블 12", status: "occupied" as const },
  { time: "13:55", message: "테이블 2", status: "occupied" as const },
  { time: "13:48", message: "테이블 8", status: "away" as const },
  { time: "13:42", message: "테이블 8 자동 해제됨", status: "released" as const },
  { time: "13:35", message: "테이블 4", status: "occupied" as const },
  { time: "13:28", message: "테이블 11", status: "occupied" as const },
]
const logStatusColors  = { occupied:"bg-emerald-500", away:"bg-yellow-500", released:"bg-gray-400", warning:"bg-red-500" }
const logStatusLabels  = { occupied:"[사용중]", away:"[자리비움]", released:"[해제됨]", warning:"[경고]" }
const logStatusTextColors = { occupied:"text-emerald-600", away:"text-yellow-600", released:"text-gray-500", warning:"text-red-500" }

const hourlyData = [
  { hour:"9시",  occupancy:45 }, { hour:"10시", occupancy:62 }, { hour:"11시", occupancy:78 },
  { hour:"12시", occupancy:95 }, { hour:"13시", occupancy:88 }, { hour:"14시", occupancy:75 },
  { hour:"15시", occupancy:68 }, { hour:"16시", occupancy:82 }, { hour:"17시", occupancy:90 },
  { hour:"18시", occupancy:85 },
]
const chartConfig = { occupancy: { label:"점유율 %", color:"#22c55e" } }

// ─── 테이블 / 층 타입 ─────────────────────────────────────────────────────────
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
}

// ─── DraggableTable ───────────────────────────────────────────────────────────
interface DraggableTableProps {
  table: TableData
  onStatusChange: (id: number) => void
  onPersonCountChange: (id: number, delta: number) => void
  isEditMode: boolean
}

const DraggableTable = memo(function DraggableTable({
  table, onStatusChange, onPersonCountChange, isEditMode,
}: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !isEditMode,
  })
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available
  const isWarning = statusKey === "away" && table.awayTime && parseInt(table.awayTime.split(":")[0]) >= 5

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

  return (
    <div ref={setNodeRef} style={style} {...(isEditMode ? { ...attributes, ...listeners } : {})}
      className={isEditMode ? "cursor-move" : "cursor-pointer"}>
      <div className={`flex flex-col overflow-hidden rounded-xl border transition-colors ${config.bg} ${config.border}`}
        style={{ height: TOTAL_HEIGHT }}>
        {/* 테이블 정보 */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-3 text-center"
          onClick={() => !isEditMode && onStatusChange(table.id)}>
          {isEditMode && (
            <div className="absolute left-1/2 top-1 -translate-x-1/2">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}
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
        <div className={`h-px w-full border-t ${config.border}`} />
        {/* 인원 아이콘 */}
        <div className="flex items-center justify-between bg-white/60 px-2"
          style={{ height: PERSON_ROW_HEIGHT }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <PersonIcon key={i} size={ICON_SIZE} filled={i < table.personCount} />
            ))}
          </div>
          <div className="flex flex-col">
            <button onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onPersonCountChange(table.id, 1) }}
              disabled={table.personCount === 4}
              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-25">
              <ChevronUp className="h-3 w-3" />
            </button>
            <button onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onPersonCountChange(table.id, -1) }}
              disabled={table.personCount === 0}
              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-25">
              <ChevronDown className="h-3 w-3" />
            </button>
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
      <div className="flex items-center justify-between bg-white/60 px-2" style={{ height: PERSON_ROW_HEIGHT }}>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <PersonIcon key={i} size={ICON_SIZE} filled={i < table.personCount} />
          ))}
        </div>
        <div className="flex flex-col opacity-40">
          <ChevronUp className="h-3 w-3 text-gray-400" />
          <ChevronDown className="h-3 w-3 text-gray-400" />
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

  // 층 관리 상태 — 초기값을 localStorage에서 복구
  const FLOORS_STORAGE_KEY = "cafemonitor-floors-v3"

  const loadFloorsFromStorage = (): { floors: FloorData[]; activeFloorId: number; nextFloorId: number } | null => {
    try {
      const raw = localStorage.getItem(FLOORS_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch { return null }
  }

  const cached = loadFloorsFromStorage()
  const [floors, setFloors] = useState<FloorData[]>(cached?.floors ?? [createFloor(1, 1)])
  const [activeFloorId, setActiveFloorId] = useState<number>(cached?.activeFloorId ?? 1)
  const [nextFloorId, setNextFloorId] = useState(cached?.nextFloorId ?? 2)

  // floors가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(FLOORS_STORAGE_KEY, JSON.stringify({ floors, activeFloorId, nextFloorId }))
    } catch {}
  }, [floors, activeFloorId, nextFloorId])


  // 현재 층 데이터
  const currentFloor = floors.find(f => f.id === activeFloorId) ?? floors[0]
  const tables = currentFloor?.tables ?? []
  const tableCount = currentFloor?.tableCount ?? 0

  /** 현재 층의 tables를 업데이트하는 헬퍼 */
  const setTables = useCallback((updater: (prev: TableData[]) => TableData[]) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId ? { ...f, tables: updater(f.tables) } : f
    ))
  }, [activeFloorId])

  /** 현재 층의 tableCount를 업데이트하는 헬퍼 */
  const setTableCount = useCallback((count: number) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId ? { ...f, tableCount: count } : f
    ))
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
      setIsLoading(true)
      try {
        // localStorage의 층 구조를 기준으로 유지하면서, 서버의 테이블 데이터만 병합
        const storageData = loadFloorsFromStorage()
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

        // floors API 실패 or 서버에 데이터 없음 → 구 search API로 1층 데이터만 보완
        const searchRes = await fetch(
          `http://34.64.58.23:8080/api/seats/search?cafeName=${encodeURIComponent(cafeName)}`
        )
        if (searchRes.ok) {
          const seats: TableData[] = await searchRes.json()
          if (seats && seats.length > 0) {
            // 1층 테이블만 교체, 나머지 층 구조는 localStorage 유지
            setFloors(localFloors.map(f =>
              f.id === 1 ? { ...f, tables: seats, tableCount: seats.length } : f
            ))
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

  // ── [3] 저장 (신규 floors API → 폴백: 구 save API) ──────────────────────
  const handleSaveChanges = async () => {
    try {
      const body = floors.map(f => ({
        floorNumber: f.id,
        label: f.label,
        seats: f.tables,
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
          f.tables.map(t => ({ ...t, floorNumber: f.id }))
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
    const body = updatedFloors.map(f => ({
      floorNumber: f.id,
      label: f.label,
      seats: f.tables,
    }))
    try {
      const res = await fetch(
        `http://34.64.58.23:8080/api/seats/floors/save?cafeName=${encodeURIComponent(cafeName)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      )
      if (!res.ok) {
        // floors/save 실패 시 전 층 flat list로 폴백
        const allSeats = updatedFloors.flatMap(f =>
          f.tables.map(t => ({ ...t, floorNumber: f.id }))
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
  const adjustTableCount = (delta: number) => {
    const newCount = Math.max(1, Math.min(24, tableCount + delta))
    setTableCount(newCount)
    if (newCount > tables.length) {
      const extra: TableData[] = Array.from({ length: newCount - tables.length }, (_, i) => {
        const idx = tables.length + i
        return {
          id: idx + 1,
          name: `테이블 ${idx + 1}`,
          status: "available",
          posX: (idx % 4) * (TABLE_WIDTH + 20) + 20,
          posY: Math.floor(idx / 4) * (TOTAL_HEIGHT + 20) + 20,
          personCount: 0,
        }
      })
      setTables(prev => [...prev, ...extra])
    } else {
      setTables(prev => prev.slice(0, newCount))
    }
  }

  // ── 인원 / 상태 변경 ──────────────────────────────────────────────────────
  const handlePersonCountChange = useCallback((tableId: number, delta: number) => {
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, personCount: Math.max(0, Math.min(4, (t.personCount ?? 0) + delta)) } : t
    ))
  }, [setTables])

  const cycleTableStatus = useCallback((tableId: number) => {
    if (isEditMode) return
    setTables(prev => prev.map(table => {
      if (table.id !== tableId) return table
      const order: TableStatus[] = ["available", "active", "away"]
      const next = order[(order.indexOf(table.status) + 1) % order.length]
      return { ...table, status: next, awayTime: next === "away" ? "00:00" : undefined }
    }))
  }, [isEditMode, setTables])

  const resetAllToAvailable = () =>
    setTables(prev => prev.map(t => ({ ...t, status: "available" as TableStatus, awayTime: undefined })))

  const resetPositions = () =>
    setTables(prev => prev.map((t, i) => ({
      ...t,
      posX: (i % 4) * (TABLE_WIDTH + 20) + 20,
      posY: Math.floor(i / 4) * (TOTAL_HEIGHT + 20) + 20,
    })))

  const activeTable = tables.find(t => t.id === activeId)

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />

      <main className="ml-64 flex-1 text-gray-900">
        <HeaderStats />

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
                          onStatusChange={cycleTableStatus}
                          onPersonCountChange={handlePersonCountChange}
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
                  변경사항 저장 ({currentFloor?.label})
                </Button>
                <Button variant="outline"
                  className="border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                  onClick={resetAllToAvailable}>
                  <RotateCcw className="mr-2 h-4 w-4" />상태 초기화
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
                <h3 className="mb-3 text-sm font-medium text-gray-900">실시간 좌석 활동 로그</h3>
                <ScrollArea className="h-[280px] rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="space-y-3">
                    {mockEvents.map((event, index) => (
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
                    ))}
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
    </div>
  )
}
