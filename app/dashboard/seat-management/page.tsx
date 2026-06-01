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
import { Minus, Plus, Save, RotateCcw, Copy, ExternalLink, GripVertical, Lock, Unlock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeaderStats } from "@/components/dashboard/header-stats"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

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
          <GripVertical className="h-4 w-4 text-zinc-500" />
        </div>
      )}
      <div className="absolute right-2 top-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      </div>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-white">{table.name}</div>
        <div className="mt-1 text-xs text-zinc-400">{config.label}</div>
        {table.awayTime && (
          <div
            className={`mt-1 text-xs font-medium ${isWarning ? "text-red-400" : "text-yellow-500"}`}
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
        <GripVertical className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="absolute right-2 top-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      </div>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-white">{table.name}</div>
        <div className="mt-1 text-xs text-zinc-400">{config.label}</div>
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
  const [copied, setCopied] = useState(false)
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
        const response = await fetch(`http://localhost:8080/api/auth/${storedOwnerId}/cafe-name`);
        
        if (response.ok) {
          const name = await response.text(); 
          setCafeName(name); 
        } else {
          console.error("해당 사장님의 카페 정보를 찾을 수 없습니다.");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("사장님 정보를 가져오지 못했습니다:", error);
        setIsLoading(false);
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
        const response = await fetch(`http://localhost:8080/api/seats/search?cafeName=${encodeURIComponent(cafeName)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            setTables(data);
            setTableCount(data.length);
          } else {
            setTables(createInitialTables()); 
          }
        }
      } catch (error) {
        console.error("DB에서 좌석 정보를 불러오지 못했습니다:", error);
        setTables(createInitialTables()); 
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
      const response = await fetch(`http://localhost:8080/api/seats/save?cafeName=${encodeURIComponent(cafeName)}`, {
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

  const openGuestPreview = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("guestCafeName", cafeName)
      window.open("/guest", "_blank")
    }
  }

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

  const guestUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/guest`
    : "/guest"

  const copyGuestLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const activeTable = tables.find(t => t.id === activeId)

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <SidebarNav />
      
      <main className="ml-64 flex-1 text-zinc-100">
        <HeaderStats />
        
        <div className="space-y-6 p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Table Canvas Editor */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">자리현황표 관리</h2>
                  <p className="mt-1 text-sm text-zinc-400">
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
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
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
                  <span className="text-sm text-zinc-400 ml-2">테이블 수: {tableCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={() => adjustTableCount(-1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={() => adjustTableCount(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4">
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

              {/* 🟢 부드러운 다크 스켈레톤 로딩 조건식 복구 연동 */}
              {isLoading ? (
                <div className="flex min-h-[500px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  <p className="mt-3 text-sm text-zinc-400">최신 배치도를 불러오는 중...</p>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div 
                    ref={canvasRef}
                    className={`relative min-h-[500px] rounded-xl border bg-zinc-900/30 ${
                      isEditMode ? "border-emerald-500/50" : "border-zinc-800"
                    }`}
                    style={{
                      backgroundImage: isEditMode 
                        ? `radial-gradient(circle, rgba(63, 63, 70, 0.5) 1px, transparent 1px)`
                        : 'none',
                      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                    }}
                  >
                    {isEditMode && (
                      <div className="absolute left-4 top-4 rounded-lg bg-emerald-900/50 px-3 py-1.5 text-xs text-emerald-300">
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
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  onClick={resetAllToAvailable}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  상태 초기화
                </Button>
                {isEditMode && (
                  <Button 
                    variant="outline" 
                    className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={resetPositions}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    배치 초기화
                  </Button>
                )}
              </div>
            </div>

            {/* Guest Link Settings */}
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">손님 모드 설정</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cafe-display-name" className="text-zinc-300">표시될 카페명</Label>
                    <Input
                      id="cafe-display-name"
                      value={cafeName}
                      onChange={(e) => setCafeName(e.target.value)}
                      placeholder="카페 이름"
                      className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">손님 접속 링크</Label>
                    <div className="flex gap-2">
                      <Input
                        value={guestUrl}
                        readOnly
                        className="border-zinc-700 bg-zinc-800 text-sm text-zinc-300 focus-visible:ring-emerald-500"
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white shrink-0"
                        onClick={copyGuestLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-sm text-emerald-500">링크가 복사되었습니다!</p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    onClick={openGuestPreview}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    손님 화면 미리보기
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-3 text-lg font-semibold text-white">사용 안내</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• <strong className="text-emerald-400">배치 편집</strong> 버튼을 눌러 테이블 위치를 조정하세요</li>
                  <li>• 편집 모드에서 테이블을 드래그하여 이동합니다</li>
                  <li>• 일반 모드에서 테이블을 클릭하면 상태가 변경됩니다</li>
                  <li>• 이용가능 → 사용중 → 자리비움 순으로 순환</li>
                  <li>• 손님 모드에서는 상태 변경이 불가능합니다</li>
                </ul>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  )
}