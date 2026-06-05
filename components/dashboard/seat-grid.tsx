"use client"

import { useState, useEffect } from "react"
import { RotateCcw, Plus, Minus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type SeatStatus = "occupied" | "away" | "warning" | "available"

interface TableData {
  tableNumber: number
  status: SeatStatus
  awayTime?: string
}

interface TableCardProps {
  tableNumber: number
  status: SeatStatus
  awayTime?: string
  onForceReset?: () => void
}

const statusConfig = {
  occupied: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
    label: "사용중",
  },
  away: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    dot: "bg-yellow-500",
    label: "자리비움",
  },
  warning: {
    bg: "bg-red-50",
    border: "border-red-300",
    dot: "bg-red-500",
    label: "경고",
  },
  available: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
    label: "이용가능",
  },
}

function TableCard({ tableNumber, status, awayTime, onForceReset }: TableCardProps) {
  const config = statusConfig[status]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative flex h-28 w-full flex-col items-center justify-center rounded-lg border ${config.bg} ${config.border} transition-all hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300`}
        >
          <div className={`absolute right-2 top-2 h-2 w-2 rounded-full ${config.dot}`} />
          <span className="text-lg font-semibold text-gray-900">테이블 {tableNumber}</span>
          <span className="text-xs text-gray-500">{config.label}</span>
          {(status === "away" || status === "warning") && awayTime && (
            <span className={`mt-1 font-mono text-sm ${status === "warning" ? "text-red-500" : "text-yellow-600"}`}>
              {awayTime}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-gray-200 bg-white shadow-md">
        <DropdownMenuItem
          className="cursor-pointer text-gray-700 focus:bg-gray-100 focus:text-gray-900"
          onClick={onForceReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          이용가능으로 초기화
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const getRandomStatus = (): SeatStatus => {
  const statuses: SeatStatus[] = ["occupied", "away", "warning", "available"]
  const weights = [0.5, 0.2, 0.1, 0.2] // 50% occupied, 20% away, 10% warning, 20% available
  const random = Math.random()
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (random < cumulative) return statuses[i]
  }
  return "available"
}

const getRandomAwayTime = (): string => {
  const minutes = Math.floor(Math.random() * 20) + 1
  const seconds = Math.floor(Math.random() * 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const generateInitialTables = (count: number): TableData[] => {
  return Array.from({ length: count }, (_, i) => {
    const status = getRandomStatus()
    return {
      tableNumber: i + 1,
      status,
      awayTime: status === "away" || status === "warning" ? getRandomAwayTime() : undefined,
    }
  })
}

const STORAGE_KEY = "cafemonitor-tables"

export function SeatGrid() {
  const [tables, setTables] = useState<TableData[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // localStorage에서 테이블 데이터 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setTables(parsed)
      } catch {
        setTables(generateInitialTables(16))
      }
    } else {
      setTables(generateInitialTables(16))
    }
    setIsLoaded(true)
  }, [])

  // 테이블 변경 시 localStorage에 저장
  useEffect(() => {
    if (isLoaded && tables.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
    }
  }, [tables, isLoaded])

  const handleForceReset = (tableNumber: number) => {
    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === tableNumber
          ? { ...t, status: "available" as SeatStatus, awayTime: undefined }
          : t
      )
    )
  }

  const handleAddTable = () => {
    const newTableNumber = tables.length + 1
    const status = "available" as SeatStatus
    setTables((prev) => [
      ...prev,
      {
        tableNumber: newTableNumber,
        status,
        awayTime: undefined,
      },
    ])
  }

  const handleRemoveTable = () => {
    if (tables.length > 1) {
      setTables((prev) => prev.slice(0, -1))
    }
  }

  // 로딩 중일 때 스켈레톤 표시
  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">범례:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-gray-700">사용중</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-gray-700">자리비움</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-gray-700">경고</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-gray-700">이용가능</span>
          </div>
        </div>

        {/* 테이블 추가/삭제 버튼 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">테이블 수: {tables.length}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveTable}
            disabled={tables.length <= 1}
            className="h-8 w-8 border-gray-300 bg-white p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">테이블 삭제</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTable}
            className="h-8 w-8 border-gray-300 bg-white p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">테이블 추가</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tables.map((table) => (
          <TableCard
            key={table.tableNumber}
            tableNumber={table.tableNumber}
            status={table.status}
            awayTime={table.awayTime}
            onForceReset={() => handleForceReset(table.tableNumber)}
          />
        ))}
      </div>
    </div>
  )
}
