import { prisma } from "@/lib/db";
import { CustomerCard } from "@/components/customer-card";

export default async function HomePage() {
  const customers = await prisma.customer.findMany({
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Select a Customer</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Choose a customer to view their dashboard and orders.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
      {customers.length === 0 && (
        <p className="mt-8 text-center text-zinc-400">
          No customers found. Run the seed script to populate data.
        </p>
      )}
    </div>
  );
}
