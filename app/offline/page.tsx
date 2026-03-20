import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <section className="glass-panel w-full rounded-[2rem] px-6 py-8 text-center">
        <p className="text-sm font-medium text-ink/55">오프라인 안내</p>
        <h1 className="mt-3 text-2xl font-bold">인터넷 연결이 끊겼습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          이미 저장된 체크리스트와 최근 방문한 화면은 계속 사용할 수 있습니다. 연결이 복구되면 그대로 이어서 쓸 수 있어요.
        </p>
        <Link
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-ink px-5 text-sm font-semibold text-white"
          href="/"
        >
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}
