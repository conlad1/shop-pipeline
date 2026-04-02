import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Database from "better-sqlite3";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const db = new Database(path.join(__dirname, "shop.db"), { readonly: true });

async function main() {
  // Clear existing data in reverse dependency order
  await prisma.productReview.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  // Seed customers
  const customers = db.prepare("SELECT * FROM customers").all() as any[];
  for (const c of customers) {
    await prisma.customer.create({
      data: {
        id: c.customer_id,
        fullName: c.full_name,
        email: c.email,
        gender: c.gender,
        birthdate: c.birthdate,
        createdAt: new Date(c.created_at),
        city: c.city || null,
        state: c.state || null,
        zipCode: c.zip_code || null,
        customerSegment: c.customer_segment || null,
        loyaltyTier: c.loyalty_tier || null,
        isActive: c.is_active === 1,
      },
    });
  }
  console.log(`Seeded ${customers.length} customers`);

  // Seed products
  const products = db.prepare("SELECT * FROM products").all() as any[];
  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.product_id,
        sku: p.sku,
        productName: p.product_name,
        category: p.category,
        price: p.price,
        cost: p.cost,
        isActive: p.is_active === 1,
      },
    });
  }
  console.log(`Seeded ${products.length} products`);

  // Seed orders in batches
  const orders = db.prepare("SELECT * FROM orders").all() as any[];
  const ORDER_BATCH = 500;
  for (let i = 0; i < orders.length; i += ORDER_BATCH) {
    const batch = orders.slice(i, i + ORDER_BATCH);
    await prisma.order.createMany({
      data: batch.map((o: any) => ({
        id: o.order_id,
        customerId: o.customer_id,
        orderDatetime: new Date(o.order_datetime),
        billingZip: o.billing_zip || null,
        shippingZip: o.shipping_zip || null,
        shippingState: o.shipping_state || null,
        paymentMethod: o.payment_method,
        deviceType: o.device_type,
        ipCountry: o.ip_country,
        promoUsed: o.promo_used === 1,
        promoCode: o.promo_code || null,
        orderSubtotal: o.order_subtotal,
        shippingFee: o.shipping_fee,
        taxAmount: o.tax_amount,
        orderTotal: o.order_total,
        riskScore: o.risk_score,
        isFraud: o.is_fraud === 1,
      })),
    });
  }
  console.log(`Seeded ${orders.length} orders`);

  // Seed order items in batches
  const items = db.prepare("SELECT * FROM order_items").all() as any[];
  const ITEM_BATCH = 1000;
  for (let i = 0; i < items.length; i += ITEM_BATCH) {
    const batch = items.slice(i, i + ITEM_BATCH);
    await prisma.orderItem.createMany({
      data: batch.map((it: any) => ({
        id: it.order_item_id,
        orderId: it.order_id,
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        lineTotal: it.line_total,
      })),
    });
  }
  console.log(`Seeded ${items.length} order items`);

  // Seed shipments in batches
  const shipments = db.prepare("SELECT * FROM shipments").all() as any[];
  for (let i = 0; i < shipments.length; i += ORDER_BATCH) {
    const batch = shipments.slice(i, i + ORDER_BATCH);
    await prisma.shipment.createMany({
      data: batch.map((s: any) => ({
        id: s.shipment_id,
        orderId: s.order_id,
        shipDatetime: new Date(s.ship_datetime),
        carrier: s.carrier,
        shippingMethod: s.shipping_method,
        distanceBand: s.distance_band,
        promisedDays: s.promised_days,
        actualDays: s.actual_days,
        lateDelivery: s.late_delivery === 1,
      })),
    });
  }
  console.log(`Seeded ${shipments.length} shipments`);

  // Seed product reviews in batches
  const reviews = db.prepare("SELECT * FROM product_reviews").all() as any[];
  for (let i = 0; i < reviews.length; i += ORDER_BATCH) {
    const batch = reviews.slice(i, i + ORDER_BATCH);
    await prisma.productReview.createMany({
      data: batch.map((r: any) => ({
        id: r.review_id,
        customerId: r.customer_id,
        productId: r.product_id,
        rating: r.rating,
        reviewDatetime: new Date(r.review_datetime),
        reviewText: r.review_text || null,
      })),
    });
  }
  console.log(`Seeded ${reviews.length} product reviews`);

  // Reset autoincrement sequences to follow seeded IDs
  const tables = ["Customer", "Product", "Order", "OrderItem", "Shipment", "ProductReview"];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`
    );
  }
  console.log("Reset autoincrement sequences");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    db.close();
    prisma.$disconnect();
  });
