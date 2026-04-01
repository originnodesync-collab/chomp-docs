"use client";

import { useEffect, useState } from "react";

interface ShareButtonsProps {
  title: string;
  recipeId: number;
  imageUrl?: string | null;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Kakao: any;
  }
}

export default function ShareButtons({ title, recipeId, imageUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/recipe/${recipeId}`
    : `https://cook-olive-seven.vercel.app/recipe/${recipeId}`;

  // 카카오 SDK 동적 로드
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appKey) return;

    if (window.Kakao?.isInitialized()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKakaoReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(appKey);
        setKakaoReady(true);
      }
    };
    document.head.appendChild(script);
  }, []);

  const handleKakaoShare = () => {
    if (!kakaoReady || !window.Kakao) return;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `🍳 ${title}`,
        description: "쩝쩝박사들의 연구노트에서 이 레시피를 확인해보세요!",
        imageUrl: imageUrl || "https://cook-olive-seven.vercel.app/og-image.png",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "레시피 보기",
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 미지원 시 fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInstagramShare = () => {
    // 인스타그램은 직접 공유 API 없음 → 이미지가 있으면 다운로드 유도, 없으면 링크 복사
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${title}.jpg`;
      a.target = "_blank";
      a.click();
      alert("이미지를 저장한 후 인스타그램 스토리에 공유해보세요! 📸");
    } else {
      handleCopyLink();
      alert("링크를 복사했어요! 인스타그램 스토리에 붙여넣어보세요 📸");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 카카오 공유 */}
      {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
        <button
          onClick={handleKakaoShare}
          disabled={!kakaoReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEE500] text-[#191919] text-xs font-semibold disabled:opacity-40 active:scale-[0.97] transition-transform"
          title="카카오로 공유"
        >
          💬 카카오
        </button>
      )}

      {/* 링크 복사 */}
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-text-sub text-xs font-semibold active:scale-[0.97] transition-all"
        title="링크 복사"
      >
        {copied ? "✓ 복사됨" : "🔗 링크 복사"}
      </button>

      {/* 인스타그램 */}
      <button
        onClick={handleInstagramShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-text-sub text-xs font-semibold active:scale-[0.97] transition-transform"
        title="인스타그램 스토리 공유"
      >
        📸 인스타
      </button>
    </div>
  );
}
