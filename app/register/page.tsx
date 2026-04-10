"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AuthPageShell,
  authFormPanelClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedLinkClass,
  authPrimaryButtonClass,
} from "@/components/AuthPageShell";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setInfo(
        "Účet byl vytvořen. Pokud je zapnuté potvrzení e-mailem, zkontroluj schránku a odkaz v e-mailu. Jinak se můžeš hned přihlásit.",
      );
    } catch {
      setError("Registrace selhala. Zkus to znovu nebo zkontroluj připojení.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell>
      <div className={authFormPanelClass}>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Registrace
        </h1>
        <p className="mt-2 text-sm text-[var(--hut-muted)]">
          Založ si účet přímo tady — pak se přihlas na stránce Přihlášení.
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
          {info ? (
            <p className="rounded-lg border border-[var(--hut-lime)]/35 bg-[var(--hut-lime)]/8 px-3 py-2 text-sm text-[var(--hut-lime)]">
              {info}
            </p>
          ) : null}

          <div>
            <label htmlFor="reg-email" className={authLabelClass}>
              E-mail
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="reg-pass" className={authLabelClass}>
              Heslo
            </label>
            <input
              id="reg-pass"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={authInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-[var(--hut-muted)]/80">
              Minimálně 6 znaků (výchozí minimum projektu).
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className={authPrimaryButtonClass}
          >
            {pending ? "Registruji…" : "Vytvořit účet"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--hut-muted)]">
          Už máš účet?{" "}
          <Link href="/login" className={authLinkClass}>
            Přihlášení
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link href="/" className={authMutedLinkClass}>
            ← Zpět do aplikace
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
