import { StatusBadge } from "./status-badge";

type Order = {
  id: number;
  product: string;
  quantity: number;
  orderTotal: number;
  status: string;
  orderDatetime: Date;
  estimatedDelivery: Date;
  riskScore: number;
};

export function OrderTable({
  orders,
  showScore,
  showCustomer,
  customers,
}: {
  orders: Order[];
  showScore?: boolean;
  showCustomer?: boolean;
  customers?: Record<number, string>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            {showCustomer && <th className="px-4 py-3">Customer</th>}
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ordered</th>
            <th className="px-4 py-3">Est. Delivery</th>
            {showScore && <th className="px-4 py-3">Risk Score</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-zinc-50">
              {showCustomer && (
                <td className="px-4 py-3 text-zinc-700">
                  {customers?.[order.id] ?? "—"}
                </td>
              )}
              <td className="px-4 py-3 font-medium text-zinc-900">
                {order.product}
              </td>
              <td className="px-4 py-3 text-zinc-600">{order.quantity}</td>
              <td className="px-4 py-3 text-zinc-600">
                ${order.orderTotal.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {order.orderDatetime.toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {order.estimatedDelivery.toLocaleDateString()}
              </td>
              {showScore && (
                <td className="px-4 py-3">
                  <span
                    className={`font-mono font-medium ${
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">
          No orders found.
        </p>
      )}
    </div>
  );
}
