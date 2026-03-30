"use client";

import { useRouter } from "next/navigation";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-text mb-2">로그인이 필요합니다</h3>
        <p className="text-sm text-text-sub mb-6">
          이 기능을 사용하려면 로그인해주세요
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/auth/login")}
            className="w-full bg-cta text-white font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform"
          >
            로그인하기
          </button>
          <button
            onClick={onClose}
            className="w-full text-text-sub text-sm py-2"
          >
            나중에 할게요
          </button>
        </div>
      </div>
    </div>
  );
}
