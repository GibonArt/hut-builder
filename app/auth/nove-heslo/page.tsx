"use client";

import { useEffect, useState } from "react";
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

export default function NoveHesloPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setSessionReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (password !== password2) {
      setError("Hesla se neshodují.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login?reset=ok");
      router.refresh();
    } catch {
      setError("Nepodařilo se uložit heslo. Zkus to znovu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell>
      <div className={authFormPanelClass}>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Nové heslo
        </h1>
        <p className="mt-2 text-sm text-[var(--hut-muted)]">
          Zadej nové heslo k účtu. Po uložení se přihlas znovu.
        </p>

        {!sessionReady ? (
          <p className="mt-6 text-sm text-[var(--hut-muted)]">Načítám…</p>
        ) : !hasSession ? (
          <div className="mt-6 space-y-4">
            <p
              className="rounded-lg border border-amber-400/35 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
              role="alert"
            >
              Odkaz vypršel nebo je neplatný. Zkus znovu žádost na stránce
              obnovy hesla.
            </p>
            <p>
              <Link href="/obnova-hesla" className={authLinkClass}>
                Zapomenuté heslo →
              </Link>
            </p>
          </div>
        ) : (
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
              <label htmlFor="new-pass" className={authLabelClass}>
                Nové heslo
              </label>
              <input
                id="new-pass"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="new-pass2" className={authLabelClass}>
                Nové heslo znovu
              </label>
              <input
                id="new-pass2"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={authInputClass}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className={authPrimaryButtonClass}
            >
              {pending ? "Ukládám…" : "Uložit heslo"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className={authLinkClass}>
            Zpět na přihlášení
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
