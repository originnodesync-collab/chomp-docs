"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile(authId: string) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .single();
      return data;
    }

    async function init() {
      try {
        // getSession으로 먼저 시도
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
          setLoading(false);
          return;
        }

        // session이 없으면 getUser로 재시도
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const profile = await fetchProfile(authUser.id);
          setUser(profile);
        }
      } catch {
        // 무시
      }
      setLoading(false);
    }

    init();

    // 로그인/로그아웃 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
