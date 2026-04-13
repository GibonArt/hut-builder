"use client";

import {
  Turnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

export type AuthTurnstileHandle = {
  reset: () => void;
};

type Props = {
  onToken: (token: string | null) => void;
};

/** Veřejný site key z `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; pokud chybí, widget se nevykreslí. */
export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;
}

export const AuthTurnstile = forwardRef<AuthTurnstileHandle, Props>(
  function AuthTurnstile({ onToken }, ref) {
    const inner = useRef<TurnstileInstance>(null);
    const siteKey = getTurnstileSiteKey();

    useImperativeHandle(ref, () => ({
      reset() {
        inner.current?.reset();
        onToken(null);
      },
    }));

    if (!siteKey) return null;

    return (
      <div className="flex justify-center py-1">
        <Turnstile
          ref={inner}
          siteKey={siteKey}
          onSuccess={(t) => onToken(t)}
          onExpire={() => onToken(null)}
          onError={() => onToken(null)}
          options={{ theme: "dark" }}
        />
      </div>
    );
  },
);
