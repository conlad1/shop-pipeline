"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ActionState = {
  success?: boolean;
  scoredCount?: number;
  error?: string;
} | null;

export async function runScoring(
  _prevState: ActionState
): Promise<ActionState> {
  const scoringUrl =
    process.env.SCORING_API_URL || "http://localhost:3000/api/scoring";

  const orders = await prisma.order.findMany({
    include: {
      shipment: true,
      items: true,
    },
  });

  if (orders.length === 0) {
    return { success: true, scoredCount: 0 };
  }

  const response = await fetch(scoringUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: orders.map((o) => {
        const estimatedDelivery = new Date(o.orderDatetime);
        estimatedDelivery.setDate(estimatedDelivery.getDate() + (o.shipment?.promisedDays ?? 7));
        return {
          id: o.id,
          orderDate: o.orderDatetime.toISOString(),
          estimatedDelivery: estimatedDelivery.toISOString(),
          status: o.shipment ? (o.shipment.lateDelivery ? "late" : "shipped") : "pending",
          quantity: o.items.reduce((sum, i) => sum + i.quantity, 0),
          totalPrice: o.orderTotal,
        };
      }),
    }),
  });

  if (!response.ok) {
    return { error: `Scoring API returned ${response.status}` };
  }

  const { scores } = (await response.json()) as {
    scores: Array<{ orderId: number; score: number }>;
  };

  await prisma.$transaction(
    scores.map((s) =>
      prisma.order.update({
        where: { id: s.orderId },
        data: { riskScore: Math.round(s.score * 100 * 10) / 10 },
      })
    )
  );

  revalidatePath("/warehouse");

  return { success: true, scoredCount: scores.length };
}
