import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🔬</div>
        <h1 className="text-2xl font-bold text-text mb-2">실험 실패!</h1>
        <p className="text-text-sub text-sm mb-8">
          이 페이지는 연구 데이터에 없습니다
        </p>
        <Link
          href="/"
          className="bg-cta text-white font-semibold px-6 py-3 rounded-xl text-sm active:scale-[0.97] transition-transform"
        >
          연구실로 돌아가기
        </Link>
      </div>
    </div>
  );
}
