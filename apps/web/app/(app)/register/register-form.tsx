"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useSession } from "@/lib/auth/session";
import { registerFormSchema } from "@/lib/validation/auth-forms";

type FormValues = { email: string; password: string };

export function RegisterForm() {
  const router = useRouter();
  const { authStatus, registerAccount } = useSession();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver<FormValues>(registerFormSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/onboarding");
    }
  }, [authStatus, router]);

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await registerAccount(values.email, values.password);
      router.push(
        `/login?registered=1&email=${encodeURIComponent(values.email)}`,
      );
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
      <h1>Register</h1>
      <p style={{ fontSize: 14, opacity: 0.85 }}>
        Creates your account only. You will create or join an organization next.
      </p>
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
            autoComplete="new-password"
            {...register("password")}
            style={{ padding: 8 }}
          />
          {errors.password ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.password.message}</span>
          ) : null}
        </label>
        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 16px" }}>
          {isSubmitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/login">Already have an account?</a>
      </p>
    </main>
  );
}
