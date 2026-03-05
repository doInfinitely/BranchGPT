import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
            <circle cx="12" cy="4" r="3" fill="currentColor" />
            <circle cx="6" cy="16" r="3" fill="currentColor" />
            <circle cx="18" cy="16" r="3" fill="currentColor" />
            <path d="M12 7v4M12 11l-6 5M12 11l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          BranchGPT
        </Link>

        <div className="hidden sm:flex items-center gap-8 text-sm text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">
            Pricing
          </a>
          <Link
            href="/login"
            className="text-gray-900 font-medium hover:text-emerald-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
