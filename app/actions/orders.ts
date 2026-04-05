"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ActionState = {
  success?: boolean;
  error?: string;
} | null;

export async function updateOrderFraudStatus({
  orderId,
  isFraud,
}: {
  orderId: number;
  isFraud: boolean;
}): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(orderId) || orderId < 1) {
    return { success: false, error: "Invalid order id." };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { isFraud },
    });

    revalidatePath("/orders");

    return { success: true };
  } catch {
    return { success: false, error: "Unable to save fraud status." };
  }
}

export async function createOrder(
  customerId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const product = formData.get("product") as string;
  const quantity = Number(formData.get("quantity"));
  const unitPrice = Number(formData.get("unitPrice"));
  const shippingAddress = formData.get("shippingAddress") as string;

  if (!product?.trim()) {
    return { error: "Product name is required." };
  }
  if (!quantity || quantity < 1) {
    return { error: "Quantity must be at least 1." };
  }
  if (!unitPrice || unitPrice <= 0) {
    return { error: "Unit price must be greater than 0." };
  }
  if (!shippingAddress?.trim()) {
    return { error: "Shipping address is required." };
  }

  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
  const shippingFee = 9.99;
  const taxAmount = Math.round(lineTotal * 0.08 * 100) / 100;
  const orderTotal = Math.round((lineTotal + shippingFee + taxAmount) * 100) / 100;

  // Find or create the product
  let dbProduct = await prisma.product.findFirst({
    where: { productName: product.trim() },
  });
  if (!dbProduct) {
    dbProduct = await prisma.product.create({
      data: {
        sku: `SKU-CUSTOM-${Date.now()}`,
        productName: product.trim(),
        category: "Custom",
        price: unitPrice,
        cost: unitPrice * 0.6,
      },
    });
  }

  const parts = shippingAddress.split(",").map((s) => s.trim());
  const shippingState = parts[1] || null;
  const shippingZip = parts[2] || null;

  await prisma.order.create({
    data: {
      customerId: Number(customerId),
      orderDatetime: new Date(),
      billingZip: shippingZip,
      shippingZip,
      shippingState,
      paymentMethod: "card",
      deviceType: "desktop",
      ipCountry: "US",
      orderSubtotal: lineTotal,
      shippingFee,
      taxAmount,
      orderTotal,
      riskScore: 0,
      items: {
        create: {
          productId: dbProduct.id,
          quantity,
          unitPrice,
          lineTotal,
        },
      },
    },
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}/orders`);

  return { success: true };
}
