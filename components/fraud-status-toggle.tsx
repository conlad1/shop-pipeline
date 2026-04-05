"use client";

import { useState, useTransition } from "react";
import { updateOrderFraudStatus } from "@/app/actions/orders";

export function FraudStatusToggle({
  orderId,
  initialIsFraud,
}: {
  orderId: number;
  initialIsFraud: boolean;
}) {
  const [isFraud, setIsFraud] = useState(initialIsFraud);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function persistFraudStatus(nextIsFraud: boolean, previousValue: boolean) {
    startTransition(() => {
      void (async () => {
        const result = await updateOrderFraudStatus({
          orderId,
          isFraud: nextIsFraud,
        });

        if (!result.success) {
          setIsFraud(previousValue);
          setError(result.error ?? "Unable to save fraud status.");
          return;
        }

        setError(null);
      })();
    });
  }

  function handleChange(nextIsFraud: boolean) {
    const previousValue = isFraud;

    setIsFraud(nextIsFraud);
    setError(null);
    persistFraudStatus(nextIsFraud, previousValue);
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
          isFraud ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        <input
          type="checkbox"
          checked={isFraud}
          onChange={(event) => handleChange(event.currentTarget.checked)}
          disabled={isPending}
          className="h-3.5 w-3.5 rounded border-zinc-300"
        />
        <span>{isFraud ? "Yes" : "No"}</span>
      </label>
      {isPending && <span className="text-[11px] text-zinc-400">Saving...</span>}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}
