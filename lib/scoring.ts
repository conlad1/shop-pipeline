export function computeLateDeliveryScore(order: {
  orderDate: Date | string;
  estimatedDelivery: Date | string;
  status: string;
  quantity: number;
  totalPrice: number;
}): number {
  const now = Date.now();
  const estimatedMs = new Date(order.estimatedDelivery).getTime();
  const orderMs = new Date(order.orderDate).getTime();

  // Factor 1: Delivery urgency — how close/past the estimated delivery (0–0.5)
  const daysUntilDelivery = (estimatedMs - now) / (1000 * 60 * 60 * 24);
  const deliveryUrgency = Math.min(0.5, Math.max(0, (3 - daysUntilDelivery) / 6));

  // Factor 2: Order age relative to delivery window (0–0.2)
  const deliveryWindowDays = (estimatedMs - orderMs) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - orderMs) / (1000 * 60 * 60 * 24);
  const ageRatio =
    deliveryWindowDays > 0
      ? Math.min(0.2, (elapsedDays / deliveryWindowDays) * 0.2)
      : 0.2;

  // Factor 3: Large orders are harder to fulfill (0–0.15)
  const sizeFactor = Math.min(0.15, (order.quantity / 20) * 0.15);

  // Factor 4: Pending orders more likely late than shipped (0–0.15)
  const statusPenalty = order.status === "pending" ? 0.15 : 0;

  const score = Math.min(1, Math.max(0, deliveryUrgency + ageRatio + sizeFactor + statusPenalty));
  return Math.round(score * 1000) / 1000;
}
