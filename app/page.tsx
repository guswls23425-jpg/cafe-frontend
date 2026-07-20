"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Coffee, Shield, BarChart3, Bell, Zap, MapPin, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const KAKAO_JS_KEY = "06a819d38eb8027717af114f7e625c12"
const BACKEND = "http://34.64.58.23:8080"

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void
        Map: new (el: HTMLElement, opts: object) => KakaoMap
        LatLng: new (lat: number, lng: number) => object
        Marker: new (opts: object) => KakaoMarker
        InfoWindow: new (opts: object) => KakaoInfoWindow
        Size: new (w: number, h: number) => object
        MarkerImage: new (src: string, size: object) => object
        event: { addListener: (target: object, type: string, cb: () => void) => void }
      }
    }
  }
}

interface KakaoMap {
  setCenter: (latlng: object) => void
}
interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void
}
interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void
  close: () => void
}

interface CafeLocation {
  cafeName: string
  address: string
  lat: number
  lng: number
}

export default function HomePage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<KakaoMap | null>(null)
  const [cafeLocations, setCafeLocations] = useState<CafeLocation[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)

  // 카페 위치 데이터 fetch
  useEffect(() => {
    fetch(`${BACKEND}/api/auth/cafe-locations`)
      .then(r => r.json())
      .then(d => setCafeLocations(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  // 카카오맵 SDK 로드
  useEffect(() => {
    if (document.getElementById("kakao-map-sdk")) { setMapReady(true); return }
    const script = document.createElement("script")
    script.id = "kakao-map-sdk"
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`
    script.async = true
    script.onload = () => {
      window.kakao.maps.load(() => setMapReady(true))
    }
    document.head.appendChild(script)
  }, [])

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return

    const initMap = (lat: number, lng: number) => {
      const map = new window.kakao.maps.Map(mapRef.current!, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 5,
      })
      mapInstanceRef.current = map
      setMapInitialized(true)
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => initMap(pos.coords.latitude, pos.coords.longitude),
        () => { setLocationDenied(true); initMap(37.5665, 126.978) }
      )
    } else {
      initMap(37.5665, 126.978)
    }
  }, [mapReady])

  // 마커 표시 (지도 + 카페 데이터 모두 준비되면)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || cafeLocations.length === 0) return

    cafeLocations.forEach(cafe => {
      const marker = new window.kakao.maps.Marker({
        map,
        position: new window.kakao.maps.LatLng(cafe.lat, cafe.lng),
        title: cafe.cafeName,
      })

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:10px 14px;font-size:13px;border-radius:8px;max-width:220px;line-height:1.5;">
          <div style="font-weight:700;color:#059669;margin-bottom:2px">☕ ${cafe.cafeName}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${cafe.address}</div>
          <button onclick="sessionStorage.setItem('guestCafeName','${cafe.cafeName}');location.href='/guest'"
            style="width:100%;padding:6px 0;background:#059669;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
            카페 좌석 확인
          </button>
        </div>`,
      })

      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.open(map, marker)
      })

      window.kakao.maps.event.addListener(map, "click", () => {
        infowindow.close()
      })
    })
  }, [mapInitialized, cafeLocations])

  return (
    <div className="flex min-h-screen flex-col">
      {/* 카카오맵 전체화면 배경 */}
      <div ref={mapRef} className="fixed inset-0 z-0" />

      {/* 위치 거부 안내 */}
      {locationDenied && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur-sm">
          위치 권한이 없어 서울 기준으로 표시됩니다
        </div>
      )}

      {/* 헤더 */}
      <header className="relative z-10 border-b border-white/20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-emerald-500" />
            <span className="text-lg font-semibold text-gray-900">카페모니터</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 — 지도 위 중앙 카드 */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-20 pointer-events-none">
        <div className="w-full max-w-lg rounded-2xl bg-white/90 p-10 shadow-2xl backdrop-blur-md text-center pointer-events-auto">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-600">
            <Zap className="h-4 w-4" />
            실시간 AI 기반 좌석 모니터링
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900">
            카페 좌석 관리의<br />
            <span className="text-emerald-500">새로운 기준</span>
          </h1>
          <p className="mb-6 text-gray-500">
            CCTV와 AI 컴퓨터 비전을 활용하여 실시간으로 좌석 현황을 파악하고,
            노쇼와 자리비움 문제를 효과적으로 관리하세요.
          </p>

          {cafeLocations.length > 0 && (
            <div className="mb-6 flex items-center justify-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span>지도에 <strong className="text-emerald-600">{cafeLocations.length}개</strong> 카페가 표시되어 있습니다</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/guest">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-600 px-8 text-white hover:bg-emerald-700">
                카페 좌석 현황 검색
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-300 px-8 text-gray-700 hover:bg-gray-50">
                카페 관리자 로그인
              </Button>
            </Link>
          </div>
        </div>

        {/* 스크롤 유도 */}
        <div className="mt-8 animate-bounce text-white/80 pointer-events-none">
          <ChevronDown className="h-6 w-6 drop-shadow" />
        </div>
      </main>

      {/* 기능 섹션 */}
      <section className="relative z-10 py-16 px-6 pointer-events-none">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-white drop-shadow md:text-3xl">주요 기능</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-white/40 bg-white/75 p-6 shadow-sm backdrop-blur-md pointer-events-auto">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">실시간 대시보드</h3>
              <p className="text-sm text-gray-500">모든 좌석의 현황을 한눈에 파악하고, 시간대별 점유율 통계를 확인하세요.</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/75 p-6 shadow-sm backdrop-blur-md pointer-events-auto">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Bell className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">스마트 알림</h3>
              <p className="text-sm text-gray-500">자리비움 시간 초과 시 카카오톡으로 즉시 알림을 받아보세요.</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/75 p-6 shadow-sm backdrop-blur-md pointer-events-auto">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">AI 분석 인사이트</h3>
              <p className="text-sm text-gray-500">AI가 패턴을 분석하여 테이블 회전율을 높이는 맞춤 권장 사항을 제공합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10 border-t border-white/20 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-gray-900">카페모니터</span>
            </div>
            <p className="text-sm text-white/60">© 2026 카페모니터. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
