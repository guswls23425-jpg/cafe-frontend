"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Coffee, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cafeName: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }
    setIsLoading(true)
    setError("")
    
    try {
      // 2. 스프링 부트 서버로 회원가입 요청 쏘기
      const response = await fetch("http://34.64.58.23:8080/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: formData.name, // 프론트의 name을 백엔드의 userName으로 매칭
          email: formData.email,
          cafeName: formData.cafeName,
          password: formData.password
        }),
      })

      if (response.ok) {
        // 회원가입 성공 시
        alert("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.")
        router.push("/login")
      } else {
        // 이메일 중복 등의 실패 사유 처리
        const errorMsg = await response.text()
        setError(errorMsg || "회원가입 처리에 실패했습니다.")
      }
    } catch (err) {
      setError("서버와 연결할 수 없습니다. 서버가 켜져 있는지 확인해주세요.")
    } finally {
      setIsLoading(false)
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

  const passwordRequirements = [
    { text: "최소 8자 이상", met: formData.password.length >= 8 },
    { text: "숫자 포함", met: /\d/.test(formData.password) },
    { text: "특수문자 포함", met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
  ]

  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-zinc-950/95 px-4 py-8 cursor-pointer"
      onClick={handleBackdropClick}
    >
      {/* 배경 그라데이션 효과 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-zinc-800 bg-zinc-900/80 backdrop-blur-sm cursor-default">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white z-10"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2">
              <Coffee className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-semibold text-white">카페모니터</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl text-white">회원가입</CardTitle>
            <CardDescription className="text-zinc-400">
              새 계정을 만들어 좌석 모니터링을 시작하세요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-zinc-300">
                이름
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-zinc-300">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cafeName" className="text-sm text-zinc-300">
                카페명
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="cafeName"
                  type="text"
                  placeholder="카페 이름을 입력하세요"
                  value={formData.cafeName}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-zinc-300">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="border-zinc-700 bg-zinc-800 pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1 pt-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <Check
                        className={`h-3 w-3 ${
                          req.met ? "text-emerald-500" : "text-zinc-600"
                        }`}
                      />
                      <span className={req.met ? "text-emerald-500" : "text-zinc-500"}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-zinc-300">
                비밀번호 확인
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="border-zinc-700 bg-zinc-800 pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2 pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                required
              />
              <span className="text-sm text-zinc-400">
                <Link href="/terms" className="text-emerald-500 hover:text-emerald-400">
                  이용약관
                </Link>
                {" 및 "}
                <Link href="/privacy" className="text-emerald-500 hover:text-emerald-400">
                  개인정보처리방침
                </Link>
                에 동의합니다
              </span>
            </label>

            {/* 통신 에러 메시지 출력 영역 */}
            {error && (
              <div className="text-sm text-red-500 font-medium text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isLoading || !agreeTerms}
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
                  계정 생성 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  회원가입
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-500 hover:text-emerald-400"
            >
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
