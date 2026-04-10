"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthPageShell,
  authFormPanelClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/AuthPageShell";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Nepodařilo se přihlásit. Zkus to znovu nebo zkontroluj připojení.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell contentAlign="start">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <header className="w-full text-center">
          <h1 className="sr-only">
            HUT Builder — Nástroj pro lajny by PuckAssassin86
          </h1>
          <Image
            src="/logos/login-hut-builder-removebg.png"
            alt=""
            width={677}
            height={369}
            className="mx-auto h-auto w-full max-w-md object-contain"
            sizes="(max-width: 448px) 100vw, 448px"
            priority
            unoptimized
            aria-hidden
            style={{
              filter:
                "blur(0.55px) drop-shadow(0 0 0.5px rgba(0,0,0,0.95)) drop-shadow(0 0 2px rgba(0,0,0,0.88)) drop-shadow(0 0 5px rgba(0,0,0,0.62)) drop-shadow(0 0 12px rgba(0,0,0,0.42)) drop-shadow(0 0 22px rgba(0,0,0,0.28))",
            }}
          />
        </header>

        <div className={authFormPanelClass}>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Přihlášení
          </h2>
          <p className="mt-2 text-sm text-[var(--hut-muted)]">
            Přihlas se e-mailem a heslem. Nový účet si založíš na stránce Registrace.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error ? (
              <p
                className="rounded-lg border border-red-400/35 bg-red-950/55 px-3 py-2 text-sm text-red-100 backdrop-blur-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div>
              <label htmlFor="login-email" className={authLabelClass}>
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                className={authInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="login-pass" className={authLabelClass}>
                Heslo
              </label>
              <input
                id="login-pass"
                type="password"
                autoComplete="current-password"
                required
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className={authPrimaryButtonClass}
            >
              {pending ? "Přihlašuji…" : "Přihlásit se"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--hut-muted)]">
            Nemáš účet?{" "}
            <Link href="/register" className={authLinkClass}>
              Registrace
            </Link>
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
}
