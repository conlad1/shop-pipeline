import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { OrderTable } from "@/components/order-table";

export default async function CustomerDashboard({
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

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.orderTotal, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const lateCount = orders.filter((o) => o.shipment?.lateDelivery).length;
  const onTimeCount = orders.filter((o) => o.shipment && !o.shipment.lateDelivery).length;
  const processingCount = orders.filter((o) => !o.shipment).length;

  const recentOrders = orders.slice(0, 5).map((o) => {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={totalOrders} />
        <StatCard
          label="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
        />
        <StatCard
          label="Avg Order Value"
          value={`$${avgOrderValue.toFixed(2)}`}
        />
        <StatCard
          label="Delivery"
          value={`${onTimeCount} on time`}
          subtitle={`${lateCount} late · ${processingCount} processing`}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Recent Orders
        </h2>
        <OrderTable orders={recentOrders} />
      </div>
    </div>
  );
}
