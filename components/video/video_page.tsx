"use client"

// 🌟 1. useEffect를 추가로 불러옵니다.
import { useState, useEffect } from "react" 
import { Camera, Save, X, Link2, MessageSquare, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export function CameraFeedSimulator() {
  const BACKEND_URL = "http://34.64.58.23:8080"
  
  // 🌟 2. 일반 변수였던 streamUrl을 useState로 바꿉니다. 처음엔 꼬리표 없이 시작!
  const [streamUrl, setStreamUrl] = useState(`${BACKEND_URL}/api/video/stream`)
  const [hasError, setHasError] = useState(false)

  // 🌟 3. 화면이 다 그려진 직후(클라이언트 측)에 꼬리표(시간)를 딱! 붙여줍니다.
  useEffect(() => {
    setStreamUrl(`${BACKEND_URL}/api/video/stream?t=${Date.now()}`)
  }, [])

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 flex flex-col h-full min-h-0">
      <CardHeader className='flex-none'>
        <CardTitle className="flex items-center gap-2 text-white">
          <Camera className="h-5 w-5 text-emerald-500" />
          매장 실시간 CCTV 피드
        </CardTitle>
        <CardDescription className="text-zinc-400">
          테이블 감지 영역(ROI) 오버레이 및 실시간 영상
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col pb-6 min-h-0">
        
        {/* 비디오 컨테이너 */}
        <div className="relative flex-1 min-h-0 w-full aspect-video overflow-hidden rounded-lg border border-zinc-700 bg-black flex items-center justify-center shadow-inner">
          <div className="relative w-full max-h-full aspect-video flex-shrink-0 bg-zinc-900"></div>
          
          {/* 바탕에 깔리는 실제 카메라 피드 */}
          {!hasError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={streamUrl}
              alt="AI Live Stream"
              className="absolute inset-0 w-full h-full object-cover z-0"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="z-0 flex flex-col items-center justify-center text-zinc-500">
              <Camera className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">비디오 스트림에 연결할 수 없습니다.</p>
              <p className="text-xs mt-1">AI 서버 상태를 확인해 주세요.</p>
            </div>
          )}

          {/* ROI 오버레이 그리드 */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            
          </div>

          {/* 라이브 상태 표시 (우측 상단) */}
          <div className={`absolute right-3 top-3 flex items-center gap-1.5 rounded shadow-md px-2 py-1 z-20 ${hasError ? 'bg-zinc-700' : 'bg-red-500'}`}>
            <div className={`h-1.5 w-1.5 rounded-full bg-white ${!hasError ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold text-white tracking-wider">
              {hasError ? 'OFFLINE' : 'LIVE'}
            </span>
          </div>

          {/* 카메라 정보 메타데이터 (좌측 하단) */}
          <div className="absolute bottom-3 left-3 rounded bg-black/70 backdrop-blur-sm px-2 py-1 text-[10px] text-zinc-300 z-20 border border-white/10">
            CAM-01 | AI Vision | MJPEG
          </div>
        </div>

        <p className="mt-4 flex-none text-xs text-zinc-400 text-center">
          녹색 박스는 AI가 모니터링 중인 테이블 감지(ROI) 영역을 나타냅니다. 마우스로 클릭하여 세부 조정이 가능합니다.
        </p>
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
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5 text-amber-500" />
          규칙 설정
        </CardTitle>
        <CardDescription className="text-zinc-400">
          모니터링 규칙 및 알림 연동 설정
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 자리비움 시간 슬라이더 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-zinc-300">최대 자리비움 허용 시간</Label>
            <span className="rounded bg-zinc-800 px-2 py-1 text-sm font-medium text-emerald-400">
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
          <div className="flex justify-between text-xs text-zinc-500">
            <span>5분</span>
            <span>30분</span>
          </div>
        </div>

        {/* Discord 웹훅 */}
        <div className="space-y-2">
          <Label htmlFor="discord-webhook" className="flex items-center gap-2 text-sm text-zinc-300">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            Discord 웹훅 URL
          </Label>
          <Input
            id="discord-webhook"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
            className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

        {/* 카카오톡 API 키 */}
        <div className="space-y-2">
          <Label htmlFor="kakao-api" className="flex items-center gap-2 text-sm text-zinc-300">
            <Link2 className="h-4 w-4 text-yellow-400" />
            카카오톡 알림 API 키
          </Label>
          <Input
            id="kakao-api"
            type="password"
            placeholder="카카오톡 API 키를 입력하세요"
            value={kakaoApiKey}
            onChange={(e) => setKakaoApiKey(e.target.value)}
            className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
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
            className="flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <X className="mr-2 h-4 w-4" />
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}