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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { supabase } = admin;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from("reports")
    .select("*, reporter:users!reporter_id(id, nickname)", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    reports: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  });
}
