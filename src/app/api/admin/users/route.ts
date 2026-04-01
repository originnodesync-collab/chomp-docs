import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") return null;
  return { supabase, dbUser };
}

// GET: 유저 목록
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { supabase } = admin;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const q = searchParams.get("q") || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("users")
    .select("id, nickname, email, role, level, points, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`nickname.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, count } = await query;

  return NextResponse.json({
    users: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  });
}

// PATCH: 유저 role 변경
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { supabase } = admin;
  const { user_id, role } = await request.json();

  if (!user_id || !["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  await supabase.from("users").update({ role }).eq("id", user_id);

  return NextResponse.json({ success: true });
}
