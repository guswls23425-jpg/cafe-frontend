"use client"

import { useState, useEffect, useCallback } from "react"
import { Camera, Save, X, Link2, MessageSquare, Bell, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"


const BACKEND_URL = "https://cafe-monitor.duckdns.org"

function CameraFeed({ sourceId, index }: { sourceId: string; index: number }) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setStreamUrl(`${BACKEND_URL}/api/video/stream?sourceId=${encodeURIComponent(sourceId)}&t=${Date.now()}`)
  }, [sourceId])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setStreamUrl(`${BACKEND_URL}/api/video/stream?sourceId=${encodeURIComponent(sourceId)}&t=${Date.now()}`)
  }, [sourceId])

  return (
    <div className="flex flex-col min-h-0">
      <p className="mb-1 flex-none text-xs font-medium text-gray-500">CAM-{String(index + 1).padStart(2, "0")} · {sourceId}</p>
      <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-lg border border-gray-300 bg-gray-900 flex items-center justify-center shadow-inner" style={{ aspectRatio: "16/9" }}>
        {streamUrl && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamUrl}
            alt={`AI Live Stream ${sourceId}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <Camera className="h-8 w-8 opacity-30" />
            <p className="text-xs">연결할 수 없습니다.</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-md border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              재연결
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
            <Camera className="h-6 w-6 opacity-40" />
            <p className="text-xs">연결 중...</p>
          </div>
        )}

        <div className={`absolute right-2 top-2 flex items-center gap-1.5 rounded shadow-md px-2 py-1 z-20 ${hasError ? "bg-zinc-700" : "bg-red-500"}`}>
          <div className={`h-1.5 w-1.5 rounded-full bg-white ${!hasError ? "animate-pulse" : ""}`} />
          <span className="text-[10px] font-bold text-white tracking-wider">
            {hasError ? "OFFLINE" : "LIVE"}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CameraFeedSimulator() {
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/video/sources`)
      const data: string[] = await res.json()
      setSources(data.length > 0 ? data : [])
    } catch {
      setSources([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSources()
    const interval = setInterval(fetchSources, 5000)
    return () => clearInterval(interval)
  }, [fetchSources])

  return (
    <Card className="border-gray-200 bg-white flex flex-col h-full min-h-0">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Camera className="h-5 w-5 text-emerald-500" />
              매장 실시간 CCTV 피드
            </CardTitle>
            <CardDescription className="text-gray-500">
              AI 감지 영상 · 연결된 카메라 {loading ? "..." : sources.length}대
            </CardDescription>
          </div>
          <button
            onClick={fetchSources}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            새로고침
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pb-6 min-h-0">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <Camera className="h-8 w-8 opacity-30 mr-2" />
            <p className="text-sm">카메라 목록 불러오는 중...</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <Camera className="h-10 w-10 opacity-30" />
            <p className="text-sm">연결된 카메라가 없습니다.</p>
            <p className="text-xs">AI 서버 상태를 확인해 주세요.</p>
          </div>
        ) : (
          <div className={`grid gap-4 flex-1 min-h-0 ${sources.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {sources.map((sourceId, i) => (
              <CameraFeed key={sourceId} sourceId={sourceId} index={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RuleConfigurations() {
  const [awayTimeLimit, setAwayTimeLimit] = useState([15])
  const [discordWebhook, setDiscordWebhook] = useState("")
  const [kakaoApiKey, setKakaoApiKey] = useState("")

  const handleSave = () => {
    console.log("설정 저장됨:", { awayTimeLimit: awayTimeLimit[0], discordWebhook, kakaoApiKey })
  }

  const handleCancel = () => {
    setAwayTimeLimit([15])
    setDiscordWebhook("")
    setKakaoApiKey("")
  }

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Bell className="h-5 w-5 text-amber-500" />
          규칙 설정
        </CardTitle>
        <CardDescription className="text-gray-500">
          모니터링 규칙 및 알림 연동 설정
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 자리비움 시간 슬라이더 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-gray-700">최대 자리비움 허용 시간</Label>
            <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-emerald-600">
              {awayTimeLimit[0]}분
            </span>
          </div>
          <Slider
            value={awayTimeLimit}
            onValueChange={setAwayTimeLimit}
            min={5}
            max={30}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>5분</span>
            <span>30분</span>
          </div>
        </div>

        {/* Discord 웹훅 */}
        <div className="space-y-2">
          <Label htmlFor="discord-webhook" className="flex items-center gap-2 text-sm text-gray-700">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            Discord 웹훅 URL
          </Label>
          <Input
            id="discord-webhook"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
            className="border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500"
          />
        </div>

        {/* 카카오톡 API 키 */}
        <div className="space-y-2">
          <Label htmlFor="kakao-api" className="flex items-center gap-2 text-sm text-gray-700">
            <Link2 className="h-4 w-4 text-yellow-400" />
            카카오톡 알림 API 키
          </Label>
          <Input
            id="kakao-api"
            type="password"
            placeholder="카카오톡 API 키를 입력하세요"
            value={kakaoApiKey}
            onChange={(e) => setKakaoApiKey(e.target.value)}
            className="border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500"
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Save className="mr-2 h-4 w-4" />
            설정 저장
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 border-gray-300 bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="mr-2 h-4 w-4" />
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}