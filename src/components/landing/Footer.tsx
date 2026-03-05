import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                <circle cx="12" cy="4" r="3" fill="currentColor" />
                <circle cx="6" cy="16" r="3" fill="currentColor" />
                <circle cx="18" cy="16" r="3" fill="currentColor" />
                <path d="M12 7v4M12 11l-6 5M12 11l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              BranchGPT
            </Link>
            <p className="text-sm text-gray-500">
              Branching conversations for AI power users.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-gray-700">Features</a></li>
              <li><Link href="/pricing" className="hover:text-gray-700">Pricing</Link></li>
              <li><a href="https://github.com/your-repo/branchgpt" className="hover:text-gray-700">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Developers</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://www.npmjs.com/package/branchgpt" className="hover:text-gray-700">npm Package</a></li>
              <li><a href="https://github.com/your-repo/branchgpt" className="hover:text-gray-700">Source Code</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-gray-700">Privacy</a></li>
              <li><a href="#" className="hover:text-gray-700">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} BranchGPT. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
