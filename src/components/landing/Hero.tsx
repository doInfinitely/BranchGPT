import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Now with pay-as-you-go pricing
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
          Branch your AI conversations
          <br />
          <span className="text-emerald-600">like a pro</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Explore multiple paths in one conversation. Fork replies, compare models side-by-side,
          and navigate your chat history as a visual tree.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Start for free
          </Link>
          <Link
            href="/app"
            className="px-8 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            Open app
          </Link>
        </div>

        {/* App preview */}
        <div className="relative max-w-5xl mx-auto">
          <div className="rounded-xl border border-gray-200 bg-gray-100 shadow-2xl overflow-hidden aspect-video">
            <img
              src="/hero-preview.png"
              alt="BranchGPT app preview showing a branching conversation tree"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Gradient glow behind the preview */}
          <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-b from-emerald-100/50 to-transparent blur-2xl" />
        </div>
      </div>
    </section>
  );
}
