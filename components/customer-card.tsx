import Link from "next/link";

export function CustomerCard({
  customer,
}: {
  customer: { id: number; fullName: string; email: string; city: string | null; state: string | null; zipCode: string | null };
}) {
  const location = [customer.city, customer.state, customer.zipCode].filter(Boolean).join(", ");
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-6 shadow-sm hover:border-primary hover:shadow-md transition-all"
    >
      <h2 className="text-lg font-semibold text-zinc-900">{customer.fullName}</h2>
      <p className="mt-1 text-sm text-zinc-500">{customer.email}</p>
      {location && <p className="mt-2 text-sm text-zinc-400">{location}</p>}
    </Link>
  );
}
