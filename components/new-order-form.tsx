"use client";

import { useActionState } from "react";
import { createOrder } from "@/app/actions/orders";

export function NewOrderForm({
  customerId,
  defaultAddress,
}: {
  customerId: string;
  defaultAddress: string;
}) {
  const createOrderWithId = createOrder.bind(null, customerId);
  const [state, formAction, pending] = useActionState(createOrderWithId, null);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      {state?.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-success">
          Order placed successfully!
        </div>
      )}

      <div>
        <label htmlFor="product" className="block text-sm font-medium text-zinc-700">
          Product
        </label>
        <input
          id="product"
          name="product"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="e.g. Wireless Headphones"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            required
            defaultValue={1}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="unitPrice" className="block text-sm font-medium text-zinc-700">
            Unit Price ($)
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min={0.01}
            step={0.01}
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="shippingAddress" className="block text-sm font-medium text-zinc-700">
          Shipping Address
        </label>
        <textarea
          id="shippingAddress"
          name="shippingAddress"
          required
          rows={2}
          defaultValue={defaultAddress}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {pending ? "Placing Order..." : "Place Order"}
      </button>
    </form>
  );
}
