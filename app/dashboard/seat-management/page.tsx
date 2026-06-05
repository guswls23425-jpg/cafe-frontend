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
import { Minus, Plus, Save, RotateCcw, GripVertical, Lock, Unlock, Loader2 } from "lucide-react"
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

const logStatusColors = {
  occupied: "bg-emerald-500",
  away: "bg-yellow-500",
  released: "bg-gray-400",
  warning: "bg-red-500",
}

const logStatusLabels = {
  occupied: "[사용중]",
  away: "[자리비움]",
  released: "[해제됨]",
  warning: "[경고]",
}

const logStatusTextColors = {
  occupied: "text-emerald-600",
  away: "text-yellow-600",
  released: "text-gray-500",
  warning: "text-red-500",
}

const hourlyData = [
  { hour: "9시", occupancy: 45 },
  { hour: "10시", occupancy: 62 },
  { hour: "11시", occupancy: 78 },
  { hour: "12시", occupancy: 95 },
  { hour: "13시", occupancy: 88 },
  { hour: "14시", occupancy: 75 },
  { hour: "15시", occupancy: 68 },
  { hour: "16시", occupancy: 82 },
  { hour: "17시", occupancy: 90 },
  { hour: "18시", occupancy: 85 },
]

const chartConfig = {
  occupancy: { label: "점유율 %", color: "#22c55e" },
}

type TableStatus = "active" | "away" | "available"

// ✨ 백엔드 DB 구조(posX, posY)에 맞게 인터페이스 완벽 수정
interface TableData {
  id: number
  name: string
  status: TableStatus
  awayTime?: string
  posX: number // 💡 position.x 대신 직접 posX로 관리
  posY: number // 💡 position.y 대신 직접 posY로 관리
}

const GRID_SIZE = 20
const TABLE_WIDTH = 120
const TABLE_HEIGHT = 100

const createInitialTables = (): TableData[] => {
  const tables: TableData[] = []
  for (let i = 0; i < 16; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    tables.push({
      id: i + 1,
      name: `테이블 ${i + 1}`,
      status: "available",
      posX: col * (TABLE_WIDTH + 20) + 20, 
      posY: row * (TABLE_HEIGHT + 20) + 20 
    })
  }
  return tables
}

const statusConfig = {
  active: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    label: "사용중",
    dot: "bg-emerald-500",
  },
  away: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    label: "자리비움",
    dot: "bg-yellow-500",
  },
  available: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    label: "이용가능",
    dot: "bg-gray-400",
  },
}

interface DraggableTableProps {
  table: TableData
  onStatusChange: (id: number) => void
  isEditMode: boolean
}

const DraggableTable = memo(function DraggableTable({ table, onStatusChange, isEditMode }: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !isEditMode,
  })

  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available
  const isWarning =
    statusKey === "away" &&
    table.awayTime &&
    parseInt(table.awayTime.split(":")[0]) >= 5

  const style: React.CSSProperties = {
    position: "absolute",
    // ✨ 스타일 좌표 지정도 백엔드 변수명(table.posX, table.posY)으로 변경!
    left: table.posX ?? 0,
    top: table.posY ?? 0,
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1, 
    willChange: isEditMode ? "transform" : "auto",
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 transition-colors ${config.bg} ${config.border} ${
        isEditMode ? "cursor-move" : "cursor-pointer hover:scale-105"
      }`}
      onClick={() => !isEditMode && onStatusChange(table.id)}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}
      <div className="absolute right-2 top-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      </div>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-gray-900">{table.name}</div>
        <div className="mt-1 text-xs text-gray-500">{config.label}</div>
        {table.awayTime && (
          <div
            className={`mt-1 text-xs font-medium ${isWarning ? "text-red-500" : "text-yellow-600"}`}
          >
            {table.awayTime}
          </div>
        )}
      </div>
    </div>
  )
})

const TableOverlay = memo(function TableOverlay({ table }: { table: TableData }) {
  const statusKey = (table.status?.toLowerCase() || "available") as TableStatus
  const config = statusConfig[statusKey] || statusConfig.available

  return (
    <div
      style={{
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT,
        willChange: "transform",
      }}
      className={`rounded-xl border p-3 shadow-2xl ${config.bg} ${config.border}`}
    >
      <div className="absolute left-1/2 top-1 -translate-x-1/2">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="absolute right-2 top-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      </div>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-gray-900">{table.name}</div>
        <div className="mt-1 text-xs text-gray-500">{config.label}</div>
      </div>
    </div>
  )
})

export default function SeatManagementPage() {
  const router = useRouter()
  const [tables, setTables] = useState<TableData[]>([])
  const [isLoading, setIsLoading] = useState(true) // 🟢 로딩 상태 전격 복구!
  const [tableCount, setTableCount] = useState(16)
  const [cafeName, setCafeName] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // ------------------------------------------------------------------
  // [1] 페이지 진입: '로그인한 사장님 고유 ID' 세션에서 꺼내 카페 이름 가져오기
  // ------------------------------------------------------------------
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      const storedOwnerId = sessionStorage.getItem("ownerId");
      
      if (!storedOwnerId) {
        alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
        router.push("/login");
        return;
      }

      try {
        // ✨ 수정: 고정 '1'번 대신 진짜 로그인한 storedOwnerId로 백엔드 호출!
        const response = await fetch(`http://34.64.58.23:8080/api/auth/${storedOwnerId}/cafe-name`);
        
        if (response.ok) {
          const name = await response.text()
          // JSON 따옴표 제거 후 설정
          setCafeName(name.replace(/^"|"$/g, "").trim())
        } else {
          console.error("카페 정보 조회 실패:", response.status)
          setTables(createInitialTables())
          setIsLoading(false)
        }
      } catch (error) {
        console.error("서버 연결 실패:", error)
        setTables(createInitialTables())
        setIsLoading(false)
      }
    };

    fetchOwnerInfo();
  }, [router]);

  // ------------------------------------------------------------------
  // [2] 카페 이름 매핑 완료 후: 해당 카페의 찐 DB 좌석 리스트 로딩
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!cafeName) return; 

    const fetchSavedSeats = async () => {
      setIsLoading(true); // 통신 시작 로딩 ON
      
      try {
        const response = await fetch(`http://34.64.58.23:8080/api/seats/search?cafeName=${encodeURIComponent(cafeName)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            setTables(data)
            setTableCount(data.length)
          } else {
            setTables(createInitialTables())
          }
        } else {
          console.error("좌석 조회 실패 HTTP", response.status)
          setTables(createInitialTables())
        }
      } catch (error) {
        console.error("서버 연결 실패:", error)
        setTables(createInitialTables())
      } finally {
        setIsLoading(false); // 통신 끝 로딩 OFF
      }
    };

    fetchSavedSeats();
  }, [cafeName]);

  // ------------------------------------------------------------------
  // [3] 배치 변경사항 DB 최종 저장
  // ------------------------------------------------------------------
  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`http://34.64.58.23:8080/api/seats/save?cafeName=${encodeURIComponent(cafeName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tables), 
      });

      if (response.ok) {
        alert("🎉 배치 정보가 데이터베이스에 완벽하게 저장되었습니다!");
      } else {
        alert("🚨 저장 실패: 백엔드 서버에서 문제가 발생했습니다.");
      }
    } catch (error) {
      console.error("저장 에러:", error);
      alert("🚨 서버와 연결할 수 없습니다.");
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  // 🟢 드래그 종료 시 좌표 업데이트 로직도 posX, posY 구조로 전면 수정
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    
    if (delta.x === 0 && delta.y === 0) {
      setActiveId(null)
      return
    }

    setTables((prev) =>
      prev.map((table) => {
        if (table.id === active.id) {
          const canvas = canvasRef.current
          const maxX = canvas ? canvas.clientWidth - TABLE_WIDTH : 600
          const maxY = canvas ? canvas.clientHeight - TABLE_HEIGHT : 400

          // ✨기존 table.position.x 지우고 table.posX 기반 계산
          const currentX = table.posX ?? 0
          const currentY = table.posY ?? 0

          const newX = snapToGrid(Math.max(0, Math.min(maxX, currentX + delta.x)))
          const newY = snapToGrid(Math.max(0, Math.min(maxY, currentY + delta.y)))

          return {
            ...table,
            posX: newX,
            posY: newY
          }
        }
        return table
      })
    )
    setActiveId(null)
  }

  const adjustTableCount = (delta: number) => {
    const newCount = Math.max(1, Math.min(24, tableCount + delta))
    setTableCount(newCount)

    if (newCount > tables.length) {
      const newTables = [...tables]
      for (let i = tables.length; i < newCount; i++) {
        const col = i % 4
        const row = Math.floor(i / 4)
        newTables.push({
          id: i + 1,
          name: `테이블 ${i + 1}`,
          status: "available",
          posX: col * (TABLE_WIDTH + 20) + 20, 
          posY: row * (TABLE_HEIGHT + 20) + 20 
        })
      }
      setTables(newTables)
    } else if (newCount < tables.length) {
      setTables(tables.slice(0, newCount))
    }
  }

  const cycleTableStatus = useCallback((tableId: number) => {
    if (isEditMode) return
    
    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== tableId) return table

        const statusOrder: TableStatus[] = ["available", "active", "away"]
        const currentIndex = statusOrder.indexOf(table.status)
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

        return {
          ...table,
          status: nextStatus,
          awayTime: nextStatus === "away" ? "00:00" : undefined,
        }
      })
    )
  }, [isEditMode])

  const resetAllToAvailable = () => {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        status: "available" as TableStatus,
        awayTime: undefined,
      }))
    )
  }

  // 🟢 배치 초기화 함수도 posX, posY 규칙으로 전면 정렬
  const resetPositions = () => {
    setTables((prev) =>
      prev.map((table, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        return {
          ...table,
          posX: col * (TABLE_WIDTH + 20) + 20, 
          posY: row * (TABLE_HEIGHT + 20) + 20 
        }
      })
    )
  }

  const activeTable = tables.find(t => t.id === activeId)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav />

      <main className="ml-64 flex-1 text-gray-900">
        <HeaderStats />

        <div className="space-y-6 p-6">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Table Canvas Editor */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">자리현황표 관리</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isEditMode
                      ? "테이블을 드래그하여 위치를 변경하세요"
                      : "테이블을 클릭하여 상태를 변경하세요"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    className={isEditMode
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    {isEditMode ? (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        배치 편집 중
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        배치 편집
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-500 ml-2">테이블 수: {tableCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => adjustTableCount(-1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => adjustTableCount(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-gray-500">범례:</span>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-700">사용중</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-700">자리비움</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-700">이용가능</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex min-h-[500px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-100/50">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  <p className="mt-3 text-sm text-gray-500">최신 배치도를 불러오는 중...</p>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    ref={canvasRef}
                    className={`relative min-h-[500px] rounded-xl border bg-gray-100/50 ${
                      isEditMode ? "border-emerald-400" : "border-gray-200"
                    }`}
                    style={{
                      backgroundImage: isEditMode
                        ? `radial-gradient(circle, rgba(156, 163, 175, 0.6) 1px, transparent 1px)`
                        : 'none',
                      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                    }}
                  >
                    {isEditMode && (
                      <div className="absolute left-4 top-4 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs text-emerald-700 border border-emerald-200">
                        배치 편집 모드 - 테이블을 드래그하세요
                      </div>
                    )}
                    
                    {tables.map((table) => (
                      <DraggableTable
                        key={table.id}
                        table={table}
                        onStatusChange={cycleTableStatus}
                        isEditMode={isEditMode}
                      />
                    ))}
                  </div>

                  <DragOverlay>
                    {activeId && activeTable ? (
                      <TableOverlay table={activeTable} />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  변경사항 저장
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  onClick={resetAllToAvailable}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  상태 초기화
                </Button>
                {isEditMode && (
                  <Button
                    variant="outline"
                    className="border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={resetPositions}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    배치 초기화
                  </Button>
                )}
              </div>
            </div>

            {/* Guest Link Settings */}
            <div className="flex flex-col gap-4">
              {/* 실시간 좌석 활동 로그 */}
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

              {/* 시간대별 점유율 차트 */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-medium text-gray-900">오늘의 시간대별 점유율</h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <ChartContainer config={chartConfig} className="h-[160px] w-full">
                    <BarChart data={hourlyData}>
                      <XAxis
                        dataKey="hour"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={false}
                        domain={[0, 100]}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="occupancy" fill="#22c55e" radius={[4, 4, 0, 0]} />
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