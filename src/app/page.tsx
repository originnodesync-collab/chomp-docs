import Link from "next/link";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";

const menuCards = [
  {
    href: "/cook",
    icon: "🍳",
    title: "요리하러가기",
    description: "재료로 레시피 찾기",
    highlight: true,
  },
  {
    href: "/hall-of-fame",
    icon: "🏆",
    title: "명예의 전당",
    description: "이번 주 인기 레시피",
    highlight: false,
  },
  {
    href: "/recipes/new",
    icon: "📝",
    title: "레시피 올리기",
    description: "나만의 레시피 등록",
    highlight: false,
  },
  {
    href: "/photos/new",
    icon: "📸",
    title: "결과사진 올리기",
    description: "요리 결과를 자랑하세요",
    highlight: false,
  },
];

// 임시 랭킹 데이터 (나중에 API로 교체)
const mockRanking = [
  { rank: 1, medal: "🥇", title: "김치찌개", likeCount: 142 },
  { rank: 2, medal: "🥈", title: "된장찌개", likeCount: 128 },
  { rank: 3, medal: "🥉", title: "제육볶음", likeCount: 95 },
  { rank: 4, medal: "", title: "불고기", likeCount: 87 },
  { rank: 5, medal: "", title: "계란말이", likeCount: 72 },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* 2×2 메뉴 카드 */}
        <section className="grid grid-cols-2 gap-3 mb-8">
          {menuCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`block rounded-xl p-4 border transition-all active:scale-[0.97] ${
                card.highlight
                  ? "bg-cta text-white border-cta shadow-md"
                  : "bg-surface text-text border-border hover:border-cta/30"
              }`}
            >
              <span className="text-2xl block mb-2">{card.icon}</span>
              <p
                className={`font-semibold text-sm ${
                  card.highlight ? "text-white" : "text-text"
                }`}
              >
                {card.title}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  card.highlight ? "text-white/80" : "text-text-sub"
                }`}
              >
                {card.description}
              </p>
            </Link>
          ))}
        </section>

        {/* 랭킹 미리보기 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-text">쩝쩝 명예의 전당</h2>
            <Link
              href="/hall-of-fame"
              className="text-xs text-text-sub hover:text-cta"
            >
              전체보기 →
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {mockRanking.map((item, idx) => (
              <div
                key={item.rank}
                className={`flex items-center px-4 py-3 ${
                  idx < mockRanking.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="w-8 text-center font-bold text-sm text-text-sub">
                  {item.medal || item.rank}
                </span>
                <span className="flex-1 text-sm font-medium text-text ml-2">
                  {item.title}
                </span>
                <span className="text-xs text-text-sub">
                  ❤️ {item.likeCount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
