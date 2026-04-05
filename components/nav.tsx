import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <Link href="/" className="font-semibold text-zinc-900">
          Shop Pipeline
        </Link>
        <div className="flex gap-6 text-sm">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Customers
          </Link>
          <Link
            href="/orders"
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Orders
          </Link>
        </div>
      </div>
    </nav>
  );
}
