import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ recipes: [] });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .ilike("title", `%${q}%`)
    .order("like_count", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ recipes: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipes: data || [] });
}
