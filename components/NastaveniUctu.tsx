"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  AuthTurnstile,
  getTurnstileSiteKey,
  type AuthTurnstileHandle,
} from "@/components/AuthTurnstile";
import { useAuth } from "@/components/AuthProvider";
import { HutShell } from "@/components/HutShell";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import { createClient } from "@/lib/supabase/client";
import {
  authInputClass,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/AuthPageShell";

export function NastaveniUctu() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<AuthTurnstileHandle>(null);
  const captchaEnabled = Boolean(getTurnstileSiteKey());

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!user?.email) {
      setError("Nejsi přihlášen.");
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError("Nejdřív potvrď kontrolu (jsem člověk).");
      return;
    }
    if (newPassword.length < 6) {
      setError("Nové heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (newPassword !== newPassword2) {
      setError("Nová hesla se neshodují.");
      return;
    }

    setPending(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
        options:
          captchaToken != null ? { captchaToken } : undefined,
      });
      if (signErr) {
        const msg = signErr.message.toLowerCase();
        setError(
          msg.includes("invalid") && msg.includes("credential")
            ? "Současné heslo není správné."
            : signErr.message,
        );
        captchaRef.current?.reset();
        return;
      }

      const { error: upErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (upErr) {
        setError(upErr.message);
        captchaRef.current?.reset();
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      captchaRef.current?.reset();
      setOk("Heslo bylo změněno.");
      router.refresh();
    } catch {
      setError("Změna hesla selhala. Zkus to znovu.");
      captchaRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <HutShell
      headerSectionLabel="Nastavení účtu"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-lg"
    >
      <div className="flex min-h-full w-full flex-col">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Nastavení účtu
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
          Změna hesla a odkaz na obnovu přístupu e-mailem.
        </p>

        <div className="mt-8 w-full max-w-lg rounded-2xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.45)] md:p-8">
          <h3 className="text-base font-semibold text-white">Změna hesla</h3>
          <p className="mt-1 text-sm text-[var(--hut-muted)]">
            Zadej současné heslo a dvakrát nové. Při zapnuté kontrole (Turnstile)
            ji potvrď před odesláním.
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            {error ? (
              <p
                className="rounded-lg border border-red-400/35 bg-red-950/55 px-3 py-2 text-sm text-red-100 backdrop-blur-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {ok ? (
              <p className="rounded-lg border border-[var(--hut-lime)]/35 bg-[var(--hut-lime)]/8 px-3 py-2 text-sm text-[var(--hut-lime)]">
                {ok}
              </p>
            ) : null}

            <div>
              <label htmlFor="nu-current" className={authLabelClass}>
                Současné heslo
              </label>
              <input
                id="nu-current"
                type="password"
                autoComplete="current-password"
                required
                className={authInputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="nu-new" className={authLabelClass}>
                Nové heslo
              </label>
              <input
                id="nu-new"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={authInputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="nu-new2" className={authLabelClass}>
                Nové heslo znovu
              </label>
              <input
                id="nu-new2"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={authInputClass}
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
              />
            </div>

            <AuthTurnstile ref={captchaRef} onToken={setCaptchaToken} />

            <button
              type="submit"
              disabled={pending}
              className={authPrimaryButtonClass}
            >
              {pending ? "Ukládám…" : "Změnit heslo"}
            </button>
          </form>
        </div>

        <div className="mt-8 w-full max-w-lg rounded-2xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.45)] md:p-8">
          <h3 className="text-base font-semibold text-white">
            Obnova hesla e-mailem
          </h3>
          <p className="mt-1 text-sm text-[var(--hut-muted)]">
            Pokud nepamatuješ heslo, pošli si odkaz na e-mail — stejná stránka jako
            „Zapomenout heslo“ u přihlášení.
          </p>
          <p className="mt-4">
            <Link href="/obnova-hesla" className={authLinkClass}>
              Otevřít obnovu hesla →
            </Link>
          </p>
        </div>
      </div>
    </HutShell>
  );
}
