"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";
import { createClient } from "@/lib/supabase/client";

interface Photo {
  id: number;
  image_url: string;
  is_failed: boolean;
  like_count: number;
  created_at: string;
  recipe: { id: number; title: string } | null;
  user: { nickname: string; active_title: string | null } | null;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tab, setTab] = useState<"all" | "fail">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("recipe_cook_photos")
        .select("*, recipe:recipes(id, title), user:users(nickname, active_title)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (tab === "fail") {
        query = query.eq("is_failed", true);
      }

      const { data } = await query;
      setPhotos((data as unknown as Photo[]) || []);
      setLoading(false);
    }
    fetchPhotos();
  }, [tab]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("all")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${tab === "all" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            📸 전체 결과사진
          </button>
          <button onClick={() => setTab("fail")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${tab === "fail" ? "bg-cta text-white" : "bg-surface border border-border text-text-sub"}`}>
            💀 망한음식 자랑대회
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-surface border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">{tab === "fail" ? "💀" : "📸"}</p>
            <p className="text-text-sub text-sm">
              {tab === "fail" ? "아직 망한 음식이 없습니다" : "결과사진이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="aspect-square bg-border">
                  <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-text line-clamp-1">
                    {photo.recipe?.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-text-sub">{photo.user?.nickname}</span>
                    <span className="text-xs text-text-sub">❤️ {photo.like_count}</span>
                  </div>
                  {photo.is_failed && <span className="text-xs text-red-400">💀 망작</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
