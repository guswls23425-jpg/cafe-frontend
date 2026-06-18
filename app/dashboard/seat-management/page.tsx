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

type TableShape = "rect" | "rounded" | "circle"

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
  capacity?: number   // 최대 수용 인원 (의자 수), 1~8
  rotation?: number   // 회전 각도 (도), 0~359
}

interface FloorData {
  id: number          // 고유 id (삭제 후에도 중복 없음)
  label: string       // "1층", "2층", ...
  tables: TableData[]
  tableCount: number
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const GRID_SIZE    = 20
const TABLE_WIDTH  = 120
const TABLE_HEIGHT = 100
const MIN_TABLE_W  = 80
const MIN_TABLE_H  = 70
const MAX_TABLE_W  = 300
const MAX_TABLE_H  = 240
const CHAIR_DEPTH  = 14   // 테이블 엣지~의자 중심 거리 (px)
const CHAIR_W      = 18   // 의자 너비 (테이블 엣지 방향)
const CHAIR_H      = 8    // 의자 깊이 (수직 방향)

// 상태별 SVG 색상 (Tailwind 클래스 대신 hex)
const statusSvgColors: Record<TableStatus, {
  bg: string; border: string; dot: string; chairFilled: string; chairEmpty: string; text: string
}> = {
  active:    { bg:"#ecfdf5", border:"#6ee7b7", dot:"#10b981", chairFilled:"#10b981", chairEmpty:"#d1fae5", text:"#065f46" },
  away:      { bg:"#fefce8", border:"#fde68a", dot:"#f59e0b", chairFilled:"#f59e0b", chairEmpty:"#fef3c7", text:"#92400e" },
  available: { bg:"#f9fafb", border:"#e5e7eb", dot:"#9ca3af", chairFilled:"#9ca3af", chairEmpty:"#f3f4f6", text:"#6b7280" },
  cleaning:  { bg:"#fff1f2", border:"#fca5a5", dot:"#ef4444", chairFilled:"#ef4444", chairEmpty:"#fee2e2", text:"#991b1b" },
}

function getTableDims(table: TableData) {
  const w      = table.tableWidth  ?? TABLE_WIDTH
  const h      = table.tableHeight ?? TABLE_HEIGHT
  const outerW = w + CHAIR_DEPTH * 2
  const outerH = h + CHAIR_DEPTH * 2
  return { w, h, outerW, outerH }
}

// ─── 의자 배분 (capacity → [top, bottom, left, right]) ───────────────────────
function distributeChairs(n: number): [number, number, number, number] {
  const map: Record<number, [number,number,number,number]> = {
    0:[0,0,0,0], 1:[1,0,0,0], 2:[1,1,0,0], 3:[1,1,0,1],
    4:[1,1,1,1], 5:[2,2,0,1], 6:[2,2,1,1], 7:[2,2,1,2], 8:[2,2,2,2],
  }
  return map[Math.min(8, Math.max(0, n))] ?? [2,2,2,2]
}

type ChairPos = { x: number; y: number; rotate: number; filled: boolean }

function getChairPositions(
  shape: TableShape | undefined,
  tw: number, th: number,
  capacity: number, personCount: number
): ChairPos[] {
  const chairs: ChairPos[] = []
  const cd = CHAIR_DEPTH
  const tx = cd   // 테이블 왼쪽 상단 x (SVG 내부 오프셋)
  const ty = cd   // 테이블 왼쪽 상단 y

  if (shape === "circle") {
    const cx = tx + tw / 2
    const cy = ty + th / 2
    const r  = Math.min(tw, th) / 2 + cd * 0.7
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2
      chairs.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        rotate: (angle * 180 / Math.PI) + 90,
        filled: i < personCount,
      })
    }
  } else {
    const [top, bottom, left, right] = distributeChairs(capacity)
    const addChairs = (
      count: number,
      xFn: (i: number) => number,
      yFn: (i: number) => number,
      rot: number
    ) => {
      for (let i = 0; i < count; i++) {
        chairs.push({ x: xFn(i), y: yFn(i), rotate: rot, filled: chairs.length < personCount })
      }
    }
    addChairs(top,    i => tx + (tw / (top    + 1)) * (i + 1), _ => ty - cd * 0.6,      0)
    addChairs(bottom, i => tx + (tw / (bottom + 1)) * (i + 1), _ => ty + th + cd * 0.6, 180)
    addChairs(left,   _ => tx - cd * 0.6, i => ty + (th / (left  + 1)) * (i + 1),       270)
    addChairs(right,  _ => tx + tw + cd * 0.6, i => ty + (th / (right + 1)) * (i + 1),  90)
  }
  return chairs
}

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
      posY: row * ((TABLE_HEIGHT + CHAIR_DEPTH * 2) + 20) + 20,
      personCount: 0,
      shape: "rect",
      tableWidth: TABLE_WIDTH,
      tableHeight: TABLE_HEIGHT,
      capacity: 4,
      rotation: 0,
    }
  })
}

function createFloor(id: number, index: number): FloorData {
  return { id, label: `${index}층`, tables: [], tableCount: 0 }
}

// ─── SVG 의자 ─────────────────────────────────────────────────────────────────
function SvgChair({ x, y, rotate, filled, filledColor, emptyColor }: {
  x: number; y: number; rotate: number; filled: boolean
  filledColor: string; emptyColor: string
}) {
  return (
    <rect
      x={x - CHAIR_W / 2} y={y - CHAIR_H / 2}
      width={CHAIR_W} height={CHAIR_H} rx={3}
      fill={filled ? filledColor : emptyColor}
      stroke={filled ? filledColor : "#d1d5db"}
      strokeWidth={0.5}
      transform={`rotate(${rotate},${x},${y})`}
    />
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

// ─── 모양별 border-radius ─────────────────────────────────────────────────────
function shapeRadius(shape: TableShape | undefined, w: number, h: number): string {
  switch (shape) {
    case "circle":  return "50%"
    case "rounded": return `${Math.min(w, h) * 0.35}px`
    default:        return "12px"
  }
}

// ─── DraggableTable ───────────────────────────────────────────────────────────
interface DraggableTableProps {
  table: TableData
  onLogOpen: (table: TableData) => void
  isEditMode: boolean
  onResize: (id: number, w: number, h: number) => void
  onShapeChange: (id: number, shape: TableShape) => void
  onCapacityChange: (id: number, delta: number) => void
  onRotationChange: (id: number, deg: number) => void
}

const SHAPES: { key: TableShape; label: string; icon: string }[] = [
  { key: "rect",    label: "사각형",      icon: "⬜" },
  { key: "rounded", label: "둥근 사각형", icon: "▢"  },
  { key: "circle",  label: "원형",        icon: "⭕" },
]

const DraggableTable = memo(function DraggableTable({
  table, onLogOpen, isEditMode, onResize, onShapeChange, onCapacityChange, onRotationChange,
}: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !isEditMode,
  })

  const { w, h, outerW, outerH } = getTableDims(table)
  const shape      = table.shape    ?? "rect"
  const capacity   = table.capacity ?? 4
  const rotation   = table.rotation ?? 0
  const statusKey  = (table.status?.toLowerCase() || "available") as TableStatus
  const colors     = statusSvgColors[statusKey] ?? statusSvgColors.available
  const config     = statusConfig[statusKey]    ?? statusConfig.available
  const awaySeconds = table.awayTime ? parseInt(table.awayTime) : 0
  const isWarning   = statusKey === "away" && awaySeconds >= 300
  const isCleaning  = statusKey === "cleaning"
  const awayStr     = awaySeconds >= 60
    ? `${Math.floor(awaySeconds / 60)}분 ${awaySeconds % 60}초`
    : `${awaySeconds}초`

  // SVG 좌표
  const cd = CHAIR_DEPTH
  const tx = cd                  // 테이블 좌상단 x
  const ty = cd                  // 테이블 좌상단 y
  const cx = tx + w / 2          // 테이블 중심 x
  const cy = ty + h / 2          // 테이블 중심 y
  const radius = shape === "circle" ? "50%" : shape === "rounded" ? `${Math.min(w,h)*0.3}px` : "10px"

  const chairs = getChairPositions(shape, w, h, capacity, table.personCount)

  // ── 리사이즈 핸들 ──────────────────────────────────────────────────────────
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: w, startH: h }
    const onMove = (me: MouseEvent) => {
      if (!resizeRef.current) return
      const { startX, startY, startW, startH } = resizeRef.current
      const newW = Math.round(Math.max(MIN_TABLE_W, Math.min(MAX_TABLE_W, startW + me.clientX - startX)) / GRID_SIZE) * GRID_SIZE
      const newH = Math.round(Math.max(MIN_TABLE_H, Math.min(MAX_TABLE_H, startH + me.clientY - startY)) / GRID_SIZE) * GRID_SIZE
      onResize(table.id, newW, shape === "circle" ? newW : newH)
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const outerStyle: React.CSSProperties = {
    position: "absolute",
    left: table.posX ?? 0,
    top:  table.posY ?? 0,
    width: outerW,
    height: outerH,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    willChange: isEditMode ? "transform" : "auto",
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <div
      ref={setNodeRef} style={outerStyle}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
      className={`relative ${isEditMode ? "cursor-move" : "cursor-pointer"}`}
    >
      {/* 청소 경고 배지 */}
      {isCleaning && (
        <div className="absolute -left-2 -top-2 z-20 animate-bounce pointer-events-none drop-shadow-[0_2px_6px_rgba(239,68,68,0.7)]">
          <MessageCircleWarning className="h-6 w-6 text-red-500" fill="#fff1f2" />
        </div>
      )}

      {/* ── 탑뷰 SVG ─────────────────────────────────────────────────────── */}
      <svg
        width={outerW} height={outerH}
        style={{ display: "block", transform: `rotate(${rotation}deg)`, transformOrigin: "center center", overflow: "visible" }}
        onClick={() => { if (!isEditMode) onLogOpen(table) }}
      >
        {/* 의자 */}
        {chairs.map((c, i) => (
          <SvgChair key={i}
            x={c.x} y={c.y} rotate={c.rotate} filled={c.filled}
            filledColor={colors.chairFilled} emptyColor={colors.chairEmpty}
          />
        ))}

        {/* 테이블 바디 */}
        {shape === "circle" ? (
          <ellipse
            cx={cx} cy={cy} rx={w/2} ry={h/2}
            fill={colors.bg} stroke={isCleaning ? "#ef4444" : colors.border}
            strokeWidth={isCleaning ? 2 : 1.5}
          />
        ) : (
          <rect
            x={tx} y={ty} width={w} height={h}
            rx={shape === "rounded" ? Math.min(w,h)*0.3 : 10}
            fill={colors.bg} stroke={isCleaning ? "#ef4444" : colors.border}
            strokeWidth={isCleaning ? 2 : 1.5}
          />
        )}

        {/* 상태 점 */}
        <circle
          cx={cx + w/2 - 10} cy={cy - h/2 + 10}
          r={4} fill={colors.dot}
          className={isCleaning ? "animate-pulse" : ""}
        />

        {/* 편집 모드 그립 아이콘 */}
        {isEditMode && (
          <text x={cx} y={cy - h/2 + 12} textAnchor="middle" fontSize={9} fill="#9ca3af">⠿</text>
        )}

        {/* 테이블 이름 */}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={11} fontWeight={600} fill="#111827"
          style={{ userSelect: "none" }}>
          {table.name}
        </text>

        {/* 상태 라벨 */}
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill={colors.text}
          style={{ userSelect: "none" }}>
          {config.label}
        </text>

        {/* 자리비움 시간 */}
        {table.awayTime && statusKey === "away" && (
          <text x={cx} y={cy + 23} textAnchor="middle" fontSize={8}
            fill={isWarning ? "#ef4444" : "#f59e0b"}
            style={{ userSelect: "none" }}>
            {awayStr}
          </text>
        )}

        {/* 로그 보기 안내 */}
        {!isEditMode && (
          <text x={cx} y={ty + h - 5} textAnchor="middle" fontSize={8} fill="#9ca3af"
            style={{ userSelect: "none" }}>
            로그 보기
          </text>
        )}
      </svg>

      {/* ── 편집 모드 전용 UI (SVG 바깥, rotation 미적용) ─────────────────── */}
      {isEditMode && (
        <>
          {/* 통합 툴바 (테이블 위) */}
          <div
            className="absolute -top-9 left-0 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 shadow-sm text-xs"
            onPointerDown={e => e.stopPropagation()}
            style={{ whiteSpace: "nowrap" }}
          >
            {/* 모양 선택 */}
            {SHAPES.map(s => (
              <button key={s.key} type="button" title={s.label}
                onClick={e => { e.stopPropagation(); onShapeChange(table.id, s.key) }}
                className={`rounded px-1 py-0.5 transition-colors ${
                  shape === s.key ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >{s.icon}</button>
            ))}

            <span className="mx-0.5 text-gray-200">|</span>

            {/* capacity 조절 */}
            <button type="button" onClick={e => { e.stopPropagation(); onCapacityChange(table.id, -1) }}
              className="rounded px-1 text-gray-500 hover:bg-gray-100">−</button>
            <span className="text-gray-600">{capacity}인</span>
            <button type="button" onClick={e => { e.stopPropagation(); onCapacityChange(table.id, +1) }}
              className="rounded px-1 text-gray-500 hover:bg-gray-100">+</button>

            <span className="mx-0.5 text-gray-200">|</span>

            {/* rotation 조절 (45도씩) */}
            <button type="button" title="반시계 45°"
              onClick={e => { e.stopPropagation(); onRotationChange(table.id, (rotation - 45 + 360) % 360) }}
              className="rounded px-1 text-gray-500 hover:bg-gray-100">↺</button>
            <span className="text-gray-600">{rotation}°</span>
            <button type="button" title="시계 45°"
              onClick={e => { e.stopPropagation(); onRotationChange(table.id, (rotation + 45) % 360) }}
              className="rounded px-1 text-gray-500 hover:bg-gray-100">↻</button>
          </div>

          {/* 리사이즈 핸들 (우하단) */}
          <div
            className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize flex items-end justify-end"
            onMouseDown={handleResizeMouseDown}
            onPointerDown={e => e.stopPropagation()}
            style={{ zIndex: 10 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400 mb-0.5 mr-0.5">
              <path d="M11 1L1 11M11 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </>
      )}
    </div>
  )
})

// ─── TableOverlay (드래그 중 고스트) ──────────────────────────────────────────
const TableOverlay = memo(function TableOverlay({ table }: { table: TableData }) {
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const colors    = statusSvgColors[statusKey] ?? statusSvgColors.available
  const { w, h, outerW, outerH } = getTableDims(table)
  const shape    = table.shape    ?? "rect"
  const capacity = table.capacity ?? 4
  const rotation = table.rotation ?? 0
  const cd = CHAIR_DEPTH
  const cx = cd + w / 2
  const cy = cd + h / 2
  const chairs = getChairPositions(shape, w, h, capacity, table.personCount)
  return (
    <div style={{ width: outerW, height: outerH, willChange: "transform", opacity: 0.85 }}>
      <svg width={outerW} height={outerH}
        style={{ display: "block", transform: `rotate(${rotation}deg)`, transformOrigin: "center center", overflow: "visible" }}>
        {chairs.map((c, i) => (
          <SvgChair key={i} x={c.x} y={c.y} rotate={c.rotate} filled={c.filled}
            filledColor={colors.chairFilled} emptyColor={colors.chairEmpty} />
        ))}
        {shape === "circle" ? (
          <ellipse cx={cx} cy={cy} rx={w/2} ry={h/2} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
        ) : (
          <rect x={cd} y={cd} width={w} height={h}
            rx={shape === "rounded" ? Math.min(w,h)*0.3 : 10}
            fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
        )}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#111827"
          style={{ userSelect:"none" }}>{table.name}</text>
      </svg>
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
  const [selectedLogDate, setSelectedLogDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  )

  // 실시간 이벤트 로그
  const EVENT_LOG_KEY = "cafemonitor-event-log"
  const [eventLog, setEventLog] = useState<EventItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(EVENT_LOG_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

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
    tables.map(({ id, name, posX, posY, shape, tableWidth, tableHeight, capacity, rotation }) => ({
      id, name, posX, posY,
      status: "available", personCount: 0,
      shape:       shape       ?? "rect",
      tableWidth:  tableWidth  ?? TABLE_WIDTH,
      tableHeight: tableHeight ?? TABLE_HEIGHT,
      capacity:    capacity    ?? 4,
      rotation:    rotation    ?? 0,
    }))

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
      const { outerW, outerH } = getTableDims(table)
      const maxX = canvas ? canvas.scrollWidth  - outerW : 800
      const maxY = canvas ? canvas.scrollHeight - outerH : 600
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
          posY: Math.floor(idx / 4) * ((TABLE_HEIGHT + CHAIR_DEPTH * 2) + 20) + 20,
          personCount: 0,
          shape: "rect" as TableShape,
          tableWidth: TABLE_WIDTH,
          tableHeight: TABLE_HEIGHT,
          capacity: 4,
          rotation: 0,
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


  // ── 테이블 리사이즈 ──────────────────────────────────────────────────────────
  const handleResize = useCallback((id: number, newW: number, newH: number) => {
    setTables(prev => prev.map(t =>
      t.id === id ? { ...t, tableWidth: newW, tableHeight: newH } : t
    ))
  }, [setTables])

  // ── 테이블 모양 변경 ──────────────────────────────────────────────────────────
  const handleShapeChange = useCallback((id: number, shape: TableShape) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t
      if (shape === "circle") {
        const size = t.tableWidth ?? TABLE_WIDTH
        return { ...t, shape, tableWidth: size, tableHeight: size }
      }
      return { ...t, shape }
    }))
  }, [setTables])

  // ── capacity 조절 ─────────────────────────────────────────────────────────────
  const handleCapacityChange = useCallback((id: number, delta: number) => {
    setTables(prev => prev.map(t =>
      t.id === id ? { ...t, capacity: Math.max(1, Math.min(8, (t.capacity ?? 4) + delta)) } : t
    ))
  }, [setTables])

  // ── rotation 변경 ─────────────────────────────────────────────────────────────
  const handleRotationChange = useCallback((id: number, deg: number) => {
    setTables(prev => prev.map(t =>
      t.id === id ? { ...t, rotation: deg } : t
    ))
  }, [setTables])

  // ── 로그 fetch (테이블·날짜 변경 시 공통 사용) ─────────────────────────────
  const fetchAiLogs = useCallback(async (seatId: number, date: string) => {
    setAiLogs([])
    setIsLogLoading(true)
    try {
      const res = await fetch(
        `http://34.64.58.23:8080/api/ai/logs/seat?seatId=${seatId}&date=${date}`
      )
      if (res.ok) {
        const data: AiLog[] = await res.json()
        setAiLogs(data)
      }
    } catch { /* 로그 없음 */ }
    finally { setIsLogLoading(false) }
  }, [])

  // ── 로그 다이얼로그 열기 ──────────────────────────────────────────────────
  const handleLogOpen = useCallback(async (table: TableData) => {
    const today = new Date().toISOString().slice(0, 10)
    setLogDialogTable(table)
    setSelectedLogDate(today)
    fetchAiLogs(table.id, today)
  }, [fetchAiLogs])

  const resetPositions = () =>
    setTables(prev => prev.map((t, i) => ({
      ...t,
      posX: (i % 4) * (TABLE_WIDTH + 20) + 20,
      posY: Math.floor(i / 4) * ((TABLE_HEIGHT + CHAIR_DEPTH * 2) + 20) + 20,
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
                          onResize={handleResize}
                          onShapeChange={handleShapeChange}
                          onCapacityChange={handleCapacityChange}
                          onRotationChange={handleRotationChange}
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
            {/* 날짜 선택기 */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="date"
                value={selectedLogDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  const date = e.target.value
                  setSelectedLogDate(date)
                  if (logDialogTable) fetchAiLogs(logDialogTable.id, date)
                }}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-xs text-gray-400">날짜를 선택해 이력을 조회하세요</span>
            </div>
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
