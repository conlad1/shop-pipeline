import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id: Number(id) } });

  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          &larr; All Customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">
          {customer.fullName}
        </h1>
        <p className="text-sm text-zinc-500">{customer.email}</p>
      </div>
      <nav className="mb-8 flex gap-4 border-b border-zinc-200 text-sm">
        <Link
          href={`/customers/${id}`}
          className="border-b-2 border-transparent px-1 pb-3 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
        >
          Dashboard
        </Link>
        <Link
          href={`/customers/${id}/orders`}
          className="border-b-2 border-transparent px-1 pb-3 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
        >
          Orders
        </Link>
        <Link
          href={`/customers/${id}/orders/new`}
          className="border-b-2 border-transparent px-1 pb-3 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
        >
          New Order
        </Link>
      </nav>
      {children}
    </div>
  );
}
