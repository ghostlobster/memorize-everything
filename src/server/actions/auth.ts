"use server";

import { signIn } from "@/lib/auth/config";

export async function signInGithub() {
  await signIn("github", { redirectTo: "/" });
}

export async function signInGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signInEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await signIn("resend", { email, redirectTo: "/" });
}
