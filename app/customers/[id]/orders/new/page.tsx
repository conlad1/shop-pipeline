import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { NewOrderForm } from "@/components/new-order-form";

export default async function NewOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id: Number(id) } });

  if (!customer) notFound();

  const defaultAddress = [customer.city, customer.state, customer.zipCode].filter(Boolean).join(", ");

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-zinc-900">
        Place a New Order
      </h2>
      <NewOrderForm customerId={id} defaultAddress={defaultAddress} />
    </div>
  );
}
