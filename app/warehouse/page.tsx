import { prisma } from "@/lib/db";
import { RunFraudButton } from "@/components/run-fraud-button";
import { StatusBadge } from "@/components/status-badge";
import Database from "better-sqlite3";
import path from "path";

type FraudPrediction = {
  order_id: number;
  fraud_probability: number;
  is_fraud_predicted: number;
};

function getFraudPredictions(): Map<number, FraudPrediction> {
  try {
    const db = new Database(path.join(process.cwd(), "prisma", "shop.db"), { readonly: true });
    const rows = db.prepare("SELECT order_id, fraud_probability, is_fraud_predicted FROM order_predictions").all() as FraudPrediction[];
    db.close();
    return new Map(rows.map((r) => [r.order_id, r]));
  } catch {
    // Table doesn't exist yet — fraud detection hasn't been run
    return new Map();
  }
}

export default async function WarehousePage() {
  const fraudMap = getFraudPredictions();
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
        <RunFraudButton />
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
              <th className="px-4 py-3">Fraud Prob.</th>
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
              const fraud = fraudMap.get(order.id);

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
                    {fraud ? (
                      <span
                        className={`font-mono font-bold ${
                          fraud.is_fraud_predicted
                            ? "text-danger"
                            : fraud.fraud_probability >= 0.3
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {(fraud.fraud_probability * 100).toFixed(1)}%
                        {fraud.is_fraud_predicted ? " ⚠" : ""}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            No orders yet. Click &quot;Run Fraud Detection&quot; to generate predictions.
          </p>
        )}
      </div>
    </div>
  );
}
