"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useSession } from "@/lib/auth/session";
import { loginFormSchema } from "@/lib/validation/auth-forms";

type FormValues = { email: string; password: string };

function safeReturnPath(raw: string | null): string {
  if (!raw) return "/onboarding";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/onboarding";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { authStatus, loginWithPassword } = useSession();
  const [error, setError] = useState<string | null>(null);
  const returnUrl = safeReturnPath(params.get("returnUrl"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver<FormValues>(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const email = params.get("email");
    if (email) setValue("email", email);
  }, [params, setValue]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace(returnUrl);
    }
  }, [authStatus, router, returnUrl]);

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await loginWithPassword(values.email, values.password);
      router.replace(returnUrl);
    } catch (e) {
      if (isStudiqoApiError(e)) {
        setError(e.message);
        return;
      }
      setError("Something went wrong");
    }
  }

  if (authStatus === "loading") {
    return <p style={{ padding: 24 }}>Checking session…</p>;
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 400 }}>
      <h1>Log in</h1>
      {params.get("registered") ? (
        <p style={{ fontSize: 14, color: "#166534" }}>Account created. Sign in below.</p>
      ) : null}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            style={{ padding: 8 }}
          />
          {errors.email ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.email.message}</span>
          ) : null}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
            style={{ padding: 8 }}
          />
          {errors.password ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.password.message}</span>
          ) : null}
        </label>
        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 16px" }}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/register">Create an account</a>
      </p>
    </main>
  );
}
