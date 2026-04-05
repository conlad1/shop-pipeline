"use client";

import { useActionState } from "react";
import { runScoring } from "@/app/actions/scoring";

// await fetch('/api/score', { method: 'POST' })

export function RunScoringButton() {
  const [state, formAction, pending] = useActionState(runScoring, null);

  return (
    <div className="flex items-center gap-4">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {pending ? "Scoring..." : "Run Scoring"}
        </button>
      </form>
      {state?.success && state.scoredCount != null && (
        <span className="text-sm text-success">
          Scored {state.scoredCount} orders
        </span>
      )}
      {state?.error && (
        <span className="text-sm text-danger">{state.error}</span>
      )}
    </div>
  );
}
