import { computeLateDeliveryScore } from "@/lib/scoring";

type OrderInput = {
  id: number;
  orderDate: string;
  estimatedDelivery: string;
  status: string;
  quantity: number;
  totalPrice: number;
};

export async function POST(request: Request) {
  const body = await request.json();
  const orders: OrderInput[] = body.orders;

  if (!Array.isArray(orders)) {
    return Response.json({ error: "orders array is required" }, { status: 400 });
  }

  const scores = orders.map((order) => ({
    orderId: order.id,
    score: computeLateDeliveryScore(order),
  }));

  return Response.json({ scores });
}
