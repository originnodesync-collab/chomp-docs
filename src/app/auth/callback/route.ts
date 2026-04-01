import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // 비밀번호 재설정 플로우: update-password 페이지로 이동
    if (type === "recovery") {
      if (!error) {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      return NextResponse.redirect(`${origin}/auth/reset-password?error=expired`);
    }

    if (!error && data.user) {
      // 유저 프로필이 없으면 생성
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", data.user.id)
        .single();

      if (!existingUser) {
        const nickname =
          data.user.user_metadata?.name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          "쩝쩝유저";

        await supabase.from("users").insert({
          auth_id: data.user.id,
          email: data.user.email,
          nickname,
          profile_image_url: data.user.user_metadata?.avatar_url || null,
        });
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
