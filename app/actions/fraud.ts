"use server";

import { spawn } from "child_process";
import path from "path";
import { revalidatePath } from "next/cache";

type ActionState = {
  success?: boolean;
  error?: string;
  detail?: string;
} | null;

export async function runFraud(_prevState: ActionState): Promise<ActionState> {
  const pythonBin = process.env.FRAUD_PYTHON_BIN ?? "python3";
  const scriptPath = path.join(process.cwd(), "jobs", "run_inference.py");
  const dbPath = path.join(process.cwd(), "prisma", "shop.db");
  const modelPath = path.join(process.cwd(), "jobs", "fraud_detection_pipeline.pkl");

  const result = await new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve) => {
      const py = spawn(pythonBin, [scriptPath, "--db", dbPath, "--model", modelPath]);
      let stdout = "";
      let stderr = "";
      py.stdout.on("data", (chunk) => (stdout += chunk));
      py.stderr.on("data", (chunk) => (stderr += chunk));
      py.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    }
  );

  console.log("[fraud] exit code:", result.code);
  console.log("[fraud] stdout:", result.stdout);
  console.log("[fraud] stderr:", result.stderr);

  if (result.code !== 0) {
    return {
      error: "Fraud detection failed",
      detail: result.stderr || result.stdout,
    };
  }

  revalidatePath("/warehouse");
  return { success: true };
}
