"use client";

import { useActionState } from "react";
import { runFraud } from "@/app/actions/fraud";

export function RunFraudButton() {
  const [state, formAction, pending] = useActionState(runFraud, null);

  return (
    <div className="flex items-center gap-4">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Running..." : "Run Fraud Detection"}
        </button>
      </form>
      {state?.success && (
        <span className="text-sm text-success">Fraud scores updated</span>
      )}
      {state?.error && (
        <span className="text-sm text-danger" title={state.detail}>
          {state.error}
        </span>
      )}
    </div>
  );
}
