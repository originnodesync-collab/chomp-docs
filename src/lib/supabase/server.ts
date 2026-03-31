import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

/**
 * 서버용 Supabase 클라이언트
 * service_role 키로 DB 접근 (RLS 우회)
 * 유저 확인은 getAuthUser() 함수로 별도 수행
 */
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * 요청의 Authorization 헤더에서 유저 정보를 가져옴
 */
export async function getAuthUser() {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");

  if (!authorization) return null;

  const token = authorization.replace("Bearer ", "");
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}
