import { prisma } from "@/lib/db";
import { OrderTable } from "@/components/order-table";

export default async function OrderHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const orders = await prisma.order.findMany({
    where: { customerId: Number(id) },
    orderBy: { orderDatetime: "desc" },
    include: {
      items: { include: { product: true } },
      shipment: true,
    },
  });

  const displayOrders = orders.map((o) => {
    const estimatedDelivery = new Date(o.orderDatetime);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (o.shipment?.promisedDays ?? 7));
    return {
      id: o.id,
      product: o.items.map((i) => i.product.productName).join(", ") || "—",
      quantity: o.items.reduce((sum, i) => sum + i.quantity, 0),
      orderTotal: o.orderTotal,
      status: o.shipment ? (o.shipment.lateDelivery ? "late" : "on time") : "processing",
      orderDatetime: o.orderDatetime,
      estimatedDelivery,
      riskScore: o.riskScore,
    };
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">
        Order History ({orders.length})
      </h2>
      <OrderTable orders={displayOrders} />
    </div>
  );
}
