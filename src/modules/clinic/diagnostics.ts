import { readFile } from "node:fs/promises";
import path from "node:path";

export type ClinicEnvironmentDiagnostics = {
  appProjectRef: string | null;
  linkedProjectRef: string | null;
  projectMismatch: boolean;
};

export function extractSupabaseProjectRef(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

export async function getClinicEnvironmentDiagnostics(): Promise<ClinicEnvironmentDiagnostics> {
  const appProjectRef = extractSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);

  let linkedProjectRef: string | null = null;
  try {
    const ref = await readFile(path.join(process.cwd(), "supabase/.temp/project-ref"), "utf8");
    linkedProjectRef = ref.trim() || null;
  } catch {
    linkedProjectRef = null;
  }

  return {
    appProjectRef,
    linkedProjectRef,
    projectMismatch: Boolean(appProjectRef && linkedProjectRef && appProjectRef !== linkedProjectRef)
  };
}

export function buildClinicEnvironmentDiagnosticMessage(
  diagnostics: ClinicEnvironmentDiagnostics
): string | null {
  if (!diagnostics.projectMismatch || !diagnostics.appProjectRef || !diagnostics.linkedProjectRef) {
    return null;
  }

  return `App нь ${diagnostics.appProjectRef} Supabase project ашиглаж байна, харин CLI ${diagnostics.linkedProjectRef} project руу link хийгдсэн байна. Эхлээд зөв project руу relink хийж clinic migration-уудаа push хийсний дараа demo seed ажиллана.`;
}
