import Link from "next/link";
import { prisma } from "@/lib/db";
import { RunFraudButton } from "@/components/run-fraud-button";
import { StatusBadge } from "@/components/status-badge";
import { FraudStatusToggle } from "@/components/fraud-status-toggle";
import Database from "better-sqlite3";
import path from "path";

const PAGE_SIZE_OPTIONS = ["25", "50", "100", "200", "500", "all"] as const;

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
type FraudFilter = "all" | "flagged" | "not-flagged";

type FraudPrediction = {
  order_id: number;
  fraud_probability: number;
  is_fraud_predicted: number;
};

function getFraudPredictions(): Map<number, FraudPrediction> {
  try {
    const db = new Database(path.join(process.cwd(), "prisma", "shop.db"), {
      readonly: true,
    });
    const rows = db
      .prepare(
        "SELECT order_id, fraud_probability, is_fraud_predicted FROM order_predictions",
      )
      .all() as FraudPrediction[];
    db.close();
    return new Map(rows.map((r) => [r.order_id, r]));
  } catch {
    // Table doesn't exist yet — fraud detection hasn't been run
    return new Map();
  }
}

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function getPaginationWindow(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) pages.push(1);
  if (start > 2) pages.push("ellipsis");

  for (let page = start; page <= end; page += 1) pages.push(page);

  if (end < totalPages - 1) pages.push("ellipsis");
  if (end < totalPages) pages.push(totalPages);

  return pages;
}

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    q?: string | string[];
    fraud?: string | string[];
  }>;
}) {
  const resolvedParams = await searchParams;

  const rawPageSize = getSingleParam(resolvedParams.pageSize) ?? "50";
  const pageSize: PageSizeOption = PAGE_SIZE_OPTIONS.includes(
    rawPageSize as PageSizeOption,
  )
    ? (rawPageSize as PageSizeOption)
    : "50";

  const searchQuery = (getSingleParam(resolvedParams.q) ?? "").trim();

  const rawFraudFilter = getSingleParam(resolvedParams.fraud) ?? "all";
  const fraudFilter: FraudFilter =
    rawFraudFilter === "flagged" || rawFraudFilter === "not-flagged"
      ? rawFraudFilter
      : "all";

  const requestedPage = parsePositiveInt(
    getSingleParam(resolvedParams.page),
    1,
  );

  // Load ML predictions from shop.db to use for filtering
  const fraudMap = getFraudPredictions();

  const searchConditions: Array<Record<string, unknown>> = [];

  if (searchQuery.length > 0) {
    searchConditions.push({
      customer: { fullName: { contains: searchQuery, mode: "insensitive" } },
    });
    searchConditions.push({
      items: {
        some: {
          product: {
            productName: { contains: searchQuery, mode: "insensitive" },
          },
        },
      },
    });

    const numericSearch = Number(searchQuery);
    if (Number.isInteger(numericSearch) && numericSearch > 0) {
      searchConditions.push({ id: numericSearch });
    }
  }

  const where = {
    ...(fraudFilter === "flagged" ? { isFraud: true } : {}),
    ...(fraudFilter === "not-flagged" ? { isFraud: false } : {}),
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };

  const totalCount = await prisma.order.count({ where });

  const showAll = pageSize === "all";
  const numericPageSize = showAll ? Math.max(totalCount, 1) : Number(pageSize);
  const totalPages = showAll
    ? 1
    : Math.max(1, Math.ceil(totalCount / numericPageSize));
  const currentPage = showAll ? 1 : Math.min(requestedPage, totalPages);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { riskScore: "desc" },
    ...(showAll
      ? {}
      : { skip: (currentPage - 1) * numericPageSize, take: numericPageSize }),
    include: {
      customer: { select: { fullName: true } },
      items: { include: { product: true } },
      shipment: true,
    },
  });

  const visibleStart =
    totalCount === 0
      ? 0
      : showAll
        ? 1
        : (currentPage - 1) * numericPageSize + 1;
  const visibleEnd =
    totalCount === 0
      ? 0
      : showAll
        ? totalCount
        : visibleStart + orders.length - 1;

  const pageWindow = showAll
    ? [1]
    : getPaginationWindow(currentPage, totalPages);

  function buildWarehouseHref(overrides?: {
    page?: number;
    pageSize?: PageSizeOption;
    q?: string;
    fraud?: FraudFilter;
  }): string {
    const nextPageSize = overrides?.pageSize ?? pageSize;
    const nextQuery = overrides?.q ?? searchQuery;
    const nextFraudFilter = overrides?.fraud ?? fraudFilter;
    const nextShowAll = nextPageSize === "all";
    const nextPage = nextShowAll
      ? 1
      : Math.max(overrides?.page ?? currentPage, 1);

    const params = new URLSearchParams();
    if (nextPageSize !== "50") params.set("pageSize", nextPageSize);
    if (nextQuery.length > 0) params.set("q", nextQuery);
    if (nextFraudFilter !== "all") params.set("fraud", nextFraudFilter);
    if (!nextShowAll && nextPage > 1) params.set("page", String(nextPage));

    const queryString = params.toString();
    return queryString.length > 0 ? `/warehouse?${queryString}` : "/warehouse";
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Fraud Detection Priority Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Orders ranked by risk score.
          </p>
        </div>
        <RunFraudButton />
      </div>

      <form
        method="get"
        className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-xs font-semibold uppercase text-zinc-500"
            >
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Order ID, customer, or product"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-primary/30 focus:ring"
            />
          </div>

          <div>
            <label
              htmlFor="fraud"
              className="mb-1 block text-xs font-semibold uppercase text-zinc-500"
            >
              Fraud Filter
            </label>
            <select
              id="fraud"
              name="fraud"
              defaultValue={fraudFilter}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-primary/30 focus:ring"
            >
              <option value="all">All</option>
              <option value="flagged">Flagged only</option>
              <option value="not-flagged">Not flagged</option>
            </select>
          </div>

          <input type="hidden" name="pageSize" value={pageSize} />

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            Apply
          </button>

          <Link
            href={buildWarehouseHref({ page: 1, q: "", fraud: "all" })}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
        <p>
          Showing {visibleStart}–{visibleEnd} of {totalCount} orders
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            Rows per page
          </span>
          {PAGE_SIZE_OPTIONS.map((option) => {
            const isActive = option === pageSize;
            return (
              <Link
                key={option}
                href={buildWarehouseHref({ page: 1, pageSize: option })}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {option === "all" ? "All" : option}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
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
              <th className="px-4 py-3">Flag Prob.</th>
              <th className="px-4 py-3">Risk Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order, i) => {
              const estimatedDelivery = new Date(order.orderDatetime);
              estimatedDelivery.setDate(
                estimatedDelivery.getDate() +
                  (order.shipment?.promisedDays ?? 7),
              );
              const status = order.shipment
                ? order.shipment.lateDelivery
                  ? "late"
                  : "on time"
                : "processing";
              const product =
                order.items
                  .map((item) => item.product.productName)
                  .join(", ") || "—";
              const quantity = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              const fraud = fraudMap.get(order.id);

              return (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {showAll
                      ? i + 1
                      : (currentPage - 1) * numericPageSize + i + 1}
                  </td>
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
                    <FraudStatusToggle
                      orderId={order.id}
                      initialIsFraud={order.isFraud}
                    />
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
            No orders found. Click &quot;Run Fraud Detection&quot; to generate
            predictions.
          </p>
        )}
      </div>

      {!showAll && totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <Link
            href={buildWarehouseHref({ page: Math.max(1, currentPage - 1) })}
            aria-disabled={currentPage === 1}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPage === 1
                ? "pointer-events-none border-zinc-200 text-zinc-400"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Previous
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {pageWindow.map((page, index) => {
              if (page === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-zinc-400"
                  >
                    ...
                  </span>
                );
              }
              const isActive = page === currentPage;
              return (
                <Link
                  key={page}
                  href={buildWarehouseHref({ page })}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {page}
                </Link>
              );
            })}
          </div>

          <Link
            href={buildWarehouseHref({
              page: Math.min(totalPages, currentPage + 1),
            })}
            aria-disabled={currentPage === totalPages}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "pointer-events-none border-zinc-200 text-zinc-400"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
