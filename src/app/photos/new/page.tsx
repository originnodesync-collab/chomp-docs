"use client";
import { fetchWithAuth } from "@/lib/api";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { useUser } from "@/hooks/useUser";
import { IMAGE_UPLOAD } from "@/lib/constants";

function PhotoUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeIdParam = searchParams.get("recipe_id");
  const { user, loading: userLoading } = useUser();

  const [recipeId, setRecipeId] = useState(recipeIdParam || "");
  const [isFailed, setIsFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (userLoading) return null;
  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-text-sub mb-4">로그인이 필요합니다</p>
            <button onClick={() => router.push("/auth/login")}
              className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold">로그인하기</button>
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 타입 체크
    if (!IMAGE_UPLOAD.allowedTypes.includes(file.type)) {
      setError("jpg, png, webp 파일만 업로드 가능합니다");
      return;
    }

    // 용량 체크
    if (file.size > IMAGE_UPLOAD.maxSizeBytes) {
      setError("5MB 이하 파일만 업로드 가능합니다");
      return;
    }

    setError("");

    // 미리보기 + 리사이징
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxPx = IMAGE_UPLOAD.maxResizePx;

        if (width > maxPx || height > maxPx) {
          if (width > height) {
            height = (height / width) * maxPx;
            width = maxPx;
          } else {
            width = (width / height) * maxPx;
            height = maxPx;
          }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setPreview(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview || !recipeId) {
      setError("레시피 ID와 사진을 모두 입력해주세요");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Cloudinary가 설정되어 있으면 Cloudinary로, 아니면 data URL 직접 저장
      let imageUrl = preview;

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (cloudName) {
        const formData = new FormData();
        const blob = await (await fetch(preview)).blob();
        formData.append("file", blob);
        formData.append("upload_preset", "chomp_docs");

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        const cloudData = await cloudRes.json();
        imageUrl = cloudData.secure_url;
      }

      const res = await fetchWithAuth("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: Number(recipeId),
          image_url: imageUrl,
          is_failed: isFailed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("📸 업로드 완료!");
      router.push("/photos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
      <h2 className="text-xl font-bold text-text mb-4">결과사진 올리기</h2>

      <div className="flex flex-col gap-4">
        {/* 레시피 ID */}
        <input
          type="number" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}
          placeholder="레시피 번호 (레시피 상세에서 이동 시 자동 입력)"
          className="bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cta"
        />

        {/* 사진 선택 */}
        <div
          onClick={() => fileRef.current?.click()}
          className="bg-surface border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-cta/40 transition-colors"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" className="max-h-60 mx-auto rounded-lg" />
          ) : (
            <>
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm text-text-sub">클릭해서 사진을 선택하세요</p>
              <p className="text-xs text-text-sub mt-1">jpg, png, webp / 5MB 이하</p>
            </>
          )}
        </div>
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange} className="hidden"
        />

        {/* 망한음식 토글 */}
        <label className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={isFailed} onChange={(e) => setIsFailed(e.target.checked)}
            className="w-5 h-5 accent-cta" />
          <div>
            <p className="text-sm font-semibold text-text">💀 망한음식 자랑대회</p>
            <p className="text-xs text-text-sub">실패한 요리도 자랑해보세요!</p>
          </div>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button onClick={handleUpload} disabled={uploading || !preview || !recipeId}
          className="w-full bg-cta text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform">
          {uploading ? "업로드 중..." : "📸 업로드"}
        </button>
      </div>
    </main>
  );
}

export default function PhotoUploadPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<main className="flex-1 p-6"><p className="text-text-sub">로딩 중...</p></main>}>
        <PhotoUploadContent />
      </Suspense>
      <BottomTabBar />
    </>
  );
}
