import React, { useState, useEffect } from 'react';
import { Camera, Save, X, Link2, MessageSquare, Bell } from "lucide-react"

export default function Video_line() {
  // 💡 GCP 서버의 외부 IP로 변경해 주세요. (예: http://34.123.45.67:8080)
  const BACKEND_URL = "https://cafe-monitor.duckdns.org";
  const [streamUrl, setStreamUrl] = useState(`${BACKEND_URL}/api/video/stream`)

  const [hasError, setHasError] = useState(false);

  // 3. 화면이 브라우저에 안전하게 그려진 직후(마운트)에 꼬리표를 붙여줍니다!
  useEffect(() => {
    setStreamUrl(`${BACKEND_URL}/api/video/stream?t=${Date.now()}`)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4">
      <div className="w-full bg-gray-900 rounded-lg shadow-lg overflow-hidden relative aspect-video flex items-center justify-center border border-gray-700">
        
        {/* 에러 발생 시 보여줄 화면 */}
        {hasError ? (
          <div className="text-gray-400 flex flex-col items-center">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>비디오 스트림을 불러올 수 없습니다.</p>
            <p className="text-sm">서버 상태나 AI 연결을 확인해 주세요.</p>
          </div>
        ) : (
          /* Next.js의 <Image> 태그 대신 일반 <img> 태그를 사용해야 합니다.
            <Image> 태그는 최적화를 시도하기 때문에 무한히 들어오는 스트리밍 데이터와 충돌합니다.
          */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamUrl}
            alt="AI Video Stream"
            className="w-full h-full object-contain"
            onError={() => setHasError(true)}
          />
        )}

      </div>
      
      {/* 상태 표시줄 */}
      <div className="w-full mt-3 flex justify-between items-center px-2">
        <span className="flex items-center text-sm font-medium text-gray-700">
          <span className={`w-3 h-3 rounded-full mr-2 ${hasError ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
          {hasError ? '연결 끊김' : '실시간 스트리밍 중'}
        </span>
      </div>
    </div>
  );
}