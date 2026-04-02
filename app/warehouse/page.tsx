import { prisma } from "@/lib/db";
import { RunScoringButton } from "@/components/run-scoring-button";
import { StatusBadge } from "@/components/status-badge";

export default async function WarehousePage() {
  const orders = await prisma.order.findMany({
    orderBy: { riskScore: "desc" },
    take: 50,
    include: {
      customer: { select: { fullName: true } },
      items: { include: { product: true } },
      shipment: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Risk Score Priority Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Top 50 orders ranked by risk score.
          </p>
        </div>
        <RunScoringButton />
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ordered</th>
              <th className="px-4 py-3">Est. Delivery</th>
              <th className="px-4 py-3">Risk Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order, i) => {
              const estimatedDelivery = new Date(order.orderDatetime);
              estimatedDelivery.setDate(estimatedDelivery.getDate() + (order.shipment?.promisedDays ?? 7));
              const status = order.shipment
                ? order.shipment.lateDelivery ? "late" : "on time"
                : "processing";
              const product = order.items.map((i) => i.product.productName).join(", ") || "—";
              const quantity = order.items.reduce((sum, i) => sum + i.quantity, 0);

              return (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {order.customer.fullName}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {product}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{quantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {order.orderDatetime.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {estimatedDelivery.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono font-bold ${
                        order.riskScore >= 70
                          ? "text-danger"
                          : order.riskScore >= 40
                            ? "text-warning"
                            : "text-success"
                      }`}
                    >
                      {order.riskScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            No scored orders yet. Click &quot;Run Scoring&quot; to generate
            predictions.
          </p>
        )}
      </div>
    </div>
  );
}
