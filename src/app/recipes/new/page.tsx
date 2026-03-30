"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { useUser } from "@/hooks/useUser";
import LoginModal from "@/components/LoginModal";
import { CATEGORY1_OPTIONS, CATEGORY2_OPTIONS, DIFFICULTY_OPTIONS, SECTION_OPTIONS, SECTION_LABELS, IMAGE_UPLOAD } from "@/lib/constants";

interface StepInput {
  section: string;
  description: string;
  timer_seconds: string;
  tip: string;
}

interface IngredientInput {
  name: string;
  amount: string;
  is_main: boolean;
}

export default function NewRecipePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [showLogin, setShowLogin] = useState(false);

  const [title, setTitle] = useState("");
  const [category1, setCategory1] = useState("반찬");
  const [category2, setCategory2] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("2");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: "", amount: "", is_main: true },
  ]);

  const [steps, setSteps] = useState<StepInput[]>([
    { section: "cook", description: "", timer_seconds: "", tip: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (userLoading) return null;
  if (!user && !userLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-text-sub mb-4">로그인이 필요합니다</p>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-cta text-white px-6 py-2 rounded-xl text-sm font-semibold"
            >
              로그인하기
            </button>
          </div>
        </main>
        <BottomTabBar />
      </>
    );
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", is_main: false }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: keyof IngredientInput, value: string | boolean) => {
    const updated = [...ingredients];
    (updated[idx] as unknown as Record<string, string | boolean>)[field] = value;
    setIngredients(updated);
  };

  const addStep = () => {
    setSteps([...steps, { section: "cook", description: "", timer_seconds: "", tip: "" }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: keyof StepInput, value: string) => {
    const updated = [...steps];
    updated[idx][field] = value;
    setSteps(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!IMAGE_UPLOAD.allowedTypes.includes(file.type)) { setError("jpg, png, webp만 가능"); return; }
    if (file.size > IMAGE_UPLOAD.maxSizeBytes) { setError("5MB 이하만 가능"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxPx = IMAGE_UPLOAD.maxResizePx;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = (height / width) * maxPx; width = maxPx; }
          else { width = (width / height) * maxPx; height = maxPx; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setImagePreview(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (dataUrl: string): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return dataUrl;
    const formData = new FormData();
    const blob = await (await fetch(dataUrl)).blob();
    formData.append("file", blob);
    formData.append("upload_preset", "chomp_docs");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url || dataUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("요리 이름을 입력해주세요"); return; }
    if (ingredients.filter(i => i.name.trim()).length === 0) { setError("재료를 1개 이상 입력해주세요"); return; }
    if (steps.filter(s => s.description.trim()).length === 0) { setError("조리 단계를 1개 이상 입력해주세요"); return; }

    setSubmitting(true);

    try {
      let imageUrl: string | null = null;
      if (imagePreview) {
        imageUrl = await uploadImage(imagePreview);
      }

      const res = await fetch("/api/recipes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category1,
          category2: category2 || null,
          image_url: imageUrl,
          difficulty,
          cook_time_min: cookTime ? Number(cookTime) : null,
          servings: Number(servings),
          description: description.trim() || null,
          ingredients: ingredients.filter(i => i.name.trim()),
          steps: steps.filter(s => s.description.trim()).map((s, idx) => ({
            ...s,
            step_number: idx + 1,
            timer_seconds: s.timer_seconds ? Number(s.timer_seconds) : null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/recipe/${data.recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header level={user?.level} />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <h2 className="text-xl font-bold text-text mb-4">레시피 등록</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 기본 정보 */}
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-text text-sm">기본 정보</h3>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="요리 이름 *" maxLength={50}
              className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cta"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={category1} onChange={(e) => setCategory1(e.target.value)}
                className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm">
                {CATEGORY1_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={category2} onChange={(e) => setCategory2(e.target.value)}
                className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm">
                <option value="">조리방식 (선택)</option>
                {CATEGORY2_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm">
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d === "easy" ? "쉬움" : d === "normal" ? "보통" : "어려움"}</option>
                ))}
              </select>
              <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)}
                placeholder="조리시간(분)" min="1"
                className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm" />
              <input type="number" value={servings} onChange={(e) => setServings(e.target.value)}
                placeholder="인분" min="1"
                className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="한 줄 소개 (선택, 100자)" maxLength={100} rows={2}
              className="bg-base border border-border rounded-lg px-3 py-2.5 text-sm resize-none" />
            {/* 대표 이미지 */}
            <div
              onClick={() => imageRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-cta/40 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="미리보기" className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <>
                  <p className="text-xl mb-1">📷</p>
                  <p className="text-xs text-text-sub">대표 이미지 (선택)</p>
                </>
              )}
            </div>
            <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange} className="hidden" />
          </section>

          {/* 재료 */}
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text text-sm">재료</h3>
              <button type="button" onClick={addIngredient} className="text-cta text-xs font-semibold">+ 추가</button>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button type="button" onClick={() => updateIngredient(idx, "is_main", !ing.is_main)}
                  className={`shrink-0 text-xs px-2 py-1 rounded ${ing.is_main ? "bg-cta/10 text-cta" : "bg-base text-text-sub"}`}>
                  {ing.is_main ? "주" : "부"}
                </button>
                <input type="text" value={ing.name} onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  placeholder="재료명" className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm" />
                <input type="text" value={ing.amount} onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                  placeholder="양" className="w-20 bg-base border border-border rounded-lg px-3 py-2 text-sm" />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => removeIngredient(idx)} className="text-text-sub text-xs">✕</button>
                )}
              </div>
            ))}
          </section>

          {/* 조리 단계 */}
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text text-sm">조리 단계</h3>
              <button type="button" onClick={addStep} className="text-cta text-xs font-semibold">+ 추가</button>
            </div>
            {steps.map((step, idx) => (
              <div key={idx} className="bg-base border border-border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cta">Step {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <select value={step.section} onChange={(e) => updateStep(idx, "section", e.target.value)}
                      className="text-xs bg-surface border border-border rounded px-2 py-1">
                      {SECTION_OPTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
                    </select>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(idx)} className="text-text-sub text-xs">✕</button>
                    )}
                  </div>
                </div>
                <textarea value={step.description} onChange={(e) => updateStep(idx, "description", e.target.value)}
                  placeholder="조리 설명 *" rows={2}
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-sm resize-none" />
                <div className="flex gap-2">
                  <input type="number" value={step.timer_seconds} onChange={(e) => updateStep(idx, "timer_seconds", e.target.value)}
                    placeholder="타이머(초)" min="0"
                    className="w-28 bg-surface border border-border rounded-lg px-3 py-2 text-sm" />
                  <input type="text" value={step.tip} onChange={(e) => updateStep(idx, "tip", e.target.value)}
                    placeholder="팁 (선택)"
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            ))}
          </section>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-cta text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform">
            {submitting ? "등록 중..." : "📝 레시피 등록"}
          </button>
        </form>
      </main>
      <BottomTabBar />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
