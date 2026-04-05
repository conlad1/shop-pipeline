// import { computeLateDeliveryScore } from "@/lib/scoring";

// type OrderInput = {
//   id: number;
//   orderDate: string;
//   estimatedDelivery: string;
//   status: string;
//   quantity: number;
//   totalPrice: number;
// };

// export async function POST(request: Request) {
//   const body = await request.json();
//   const orders: OrderInput[] = body.orders;

//   if (!Array.isArray(orders)) {
//     return Response.json(
//       { error: "orders array is required" },
//       { status: 400 },
//     );
//   }

//   const scores = orders.map((order) => ({
//     orderId: order.id,
//     score: computeLateDeliveryScore(order),
//   }));

//   return Response.json({ scores });
// }

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync(
      "python jobs/run_inference.py",
      { cwd: process.cwd() }, // runs from the project root
    );
    return NextResponse.json({
      success: true,
      output: stdout,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
