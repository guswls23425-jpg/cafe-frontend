"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Coffee, Mail, Lock, User, Store, Eye, EyeOff, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // 스프링 부트 서버로 로그인 요청 쏘기
      const response = await fetch("http://34.64.58.23:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json(); // 응답을 JSON 객체로 받기

        // 🟢 [수정완료] 관리자 페이지(SeatManagementPage)의 규칙에 맞춰 sessionStorage에 저장!
        sessionStorage.setItem("ownerId", data.ownerId);     // ✨ 이 줄이 없어서 튕겼던 것입니다!
        sessionStorage.setItem("cafeName", data.cafeName);   // 관리자용 카페 이름 기록
        sessionStorage.setItem("guestCafeName", data.cafeName); // 미리보기용 손님 세션도 미리 세팅
  
        // 브라우저 저장소에 cafeId와 cafeName 저장하기
        localStorage.setItem("cafeId", data.cafeId);
        localStorage.setItem("cafeName", data.cafeName);
  
        alert(data.message);
        router.push("/dashboard"); // 대시보드로 이동
      } else {
        // 로그인 실패 시 (상태코드 401 등)
        setIsLoading(false)
        setError("이메일 또는 비밀번호가 일치하지 않습니다.")
      }
    } catch (err) {
      // 서버가 꺼져있거나 네트워크 에러 시
      setIsLoading(false)
      setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.")
    }
    
  }

  const handleClose = () => {
    router.push("/")
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50/95 px-4 cursor-pointer"
      onClick={handleBackdropClick}
    >
      {/* 배경 그라데이션 효과 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-gray-200 bg-white shadow-lg cursor-default">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2">
              <Coffee className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-semibold text-gray-900">카페모니터</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl text-gray-900">로그인</CardTitle>
            <CardDescription className="text-gray-500">
              카페 좌석 모니터링 대시보드에 접속하세요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-700">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300 bg-gray-50 pl-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-700">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300 bg-gray-50 pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 bg-gray-50 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-500">로그인 상태 유지</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-500 hover:text-emerald-600"
              >
                비밀번호 찾기
              </Link>
            </div>
            {/* 에러 메시지 출력 영역 */}
            {error && (
              <div className="text-sm text-red-500 font-medium text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  로그인
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">또는</span>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-500">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-medium text-emerald-500 hover:text-emerald-600"
              >
                회원가입
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
interface GuestAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuestAccessModal({ open, onOpenChange }: GuestAccessModalProps) {
  const router = useRouter()
  const [cafeName, setCafeName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cafeName.trim()) {
      // Store cafe name in sessionStorage for guest access
      sessionStorage.setItem("guestCafeName", cafeName.trim())
      router.push("/guest")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader className="items-center space-y-4">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Coffee className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-medium">카페모니터</span>
          </div>
          <div className="text-center">
            <DialogTitle className="text-2xl">손님 모드</DialogTitle>
            <DialogDescription>
              카페 좌석 현황을 확인하려면 카페 이름을 입력하세요
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-cafe-name">카페명</Label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="guest-cafe-name"
                type="text"
                placeholder="카페 이름을 입력하세요"
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                className="bg-input pl-10"
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!cafeName.trim()}>
            좌석 현황 보기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            관리자이신가요? 로그인하여 좌석을 관리하세요
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
