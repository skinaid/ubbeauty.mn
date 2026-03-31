"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { buildMetaOAuthUrl } from "@/lib/meta/client";
import { applyMetaPageSelection } from "@/modules/meta/selection";
import { onMetaPageSelectionChanged } from "@/modules/jobs/meta-sync-placeholder";

const META_OAUTH_STATE_COOKIE = "meta_oauth_state";

function createStateToken() {
  return randomBytes(24).toString("hex");
}

export async function createMetaOAuthUrl(organizationId: string): Promise<string> {
  const state = createStateToken();
  const cookieStore = await cookies();
  cookieStore.set(
    META_OAUTH_STATE_COOKIE,
    JSON.stringify({
      state,
      organizationId,
      issuedAt: Date.now()
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600
    }
  );

  return buildMetaOAuthUrl(state);
}

export async function validateMetaOAuthState(inputState: string): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(META_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(META_OAUTH_STATE_COOKIE);

  if (!raw) {
    throw new Error("Missing OAuth state");
  }

  const parsed = JSON.parse(raw) as { state: string; organizationId: string; issuedAt: number };
  if (parsed.state !== inputState) {
    throw new Error("Invalid OAuth state");
  }

  const ageMs = Date.now() - parsed.issuedAt;
  if (ageMs > 10 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }

  return parsed.organizationId;
}

export async function setMetaPageSelection(params: {
  organizationId: string;
  metaPageId: string;
  selected: boolean;
}) {
  await applyMetaPageSelection({
    organizationId: params.organizationId,
    metaPageRowId: params.metaPageId,
    selected: params.selected
  });

  await onMetaPageSelectionChanged({
    organizationId: params.organizationId,
    metaPageRowId: params.metaPageId,
    selected: params.selected
  });

  revalidatePath("/pages");
  revalidatePath("/dashboard");
}

export type MetaPageSelectionState = {
  error?: string;
};

export async function setMetaPageSelectionAction(
  _prev: MetaPageSelectionState,
  formData: FormData
): Promise<MetaPageSelectionState> {
  const organizationId = formData.get("organizationId");
  const metaPageId = formData.get("metaPageId");
  const selected = formData.get("selected");

  if (typeof organizationId !== "string" || typeof metaPageId !== "string" || typeof selected !== "string") {
    return { error: "Invalid selection request." };
  }

  try {
    await setMetaPageSelection({
      organizationId,
      metaPageId,
      selected: selected === "true"
    });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update page selection." };
  }
}
