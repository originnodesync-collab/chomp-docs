"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();
        setUser(data);
      }
      setLoading(false);
    }

    getUser();

    // 로그인/로그아웃 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("auth_id", session.user.id)
            .single();
          setUser(data);
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
