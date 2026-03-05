import Link from "next/link";

const models = [
  { name: "GPT-4o", input: "$3.50", output: "$14.00" },
  { name: "GPT-4o mini", input: "$0.21", output: "$0.84" },
  { name: "Claude Sonnet 4.6", input: "$4.20", output: "$21.00" },
  { name: "Claude Haiku 4.5", input: "$1.12", output: "$5.60" },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
          Simple, pay-as-you-go pricing
        </h2>
        <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-12">
          Start free with 5 messages. Then pay only for what you use — no subscriptions, no commitments.
          Or bring your own API key for unlimited use at no charge.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free tier */}
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Free
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
            <p className="text-gray-500 mb-6">5 free messages to try it out</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-center gap-2">
                <Check /> 5 AI messages included
              </li>
              <li className="flex items-center gap-2">
                <Check /> All models available
              </li>
              <li className="flex items-center gap-2">
                <Check /> Full branching features
              </li>
              <li className="flex items-center gap-2">
                <Check /> Bring your own key (unlimited)
              </li>
            </ul>
            <Link
              href="/login"
              className="block w-full text-center py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Get started
            </Link>
          </div>

          {/* Pay as you go */}
          <div className="rounded-xl border-2 border-emerald-600 bg-white p-8 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-emerald-600 text-white text-xs font-semibold rounded-full">
              Popular
            </div>
            <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">
              Pay as you go
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              Usage-based
            </div>
            <p className="text-gray-500 mb-6">Per-token pricing with no minimum</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-center gap-2">
                <Check /> Unlimited messages
              </li>
              <li className="flex items-center gap-2">
                <Check /> All models available
              </li>
              <li className="flex items-center gap-2">
                <Check /> Monthly invoicing via Stripe
              </li>
              <li className="flex items-center gap-2">
                <Check /> Usage dashboard in settings
              </li>
            </ul>
            <Link
              href="/login"
              className="block w-full text-center py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Start for free
            </Link>
          </div>
        </div>

        {/* Per-model pricing table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-6 font-semibold text-gray-900">Model</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-900">Input / 1M tokens</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-900">Output / 1M tokens</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 px-6 text-gray-700 font-medium">{m.name}</td>
                  <td className="py-3 px-6 text-right text-gray-600">{m.input}</td>
                  <td className="py-3 px-6 text-right text-gray-600">{m.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-600 shrink-0">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
