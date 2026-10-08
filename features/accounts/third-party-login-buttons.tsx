"use client";

import { type ComponentType, useState } from "react";

import {
  signInWithThirdParty,
  thirdPartyLoginErrorMessage,
  type ThirdPartyProviderId,
} from "@/features/accounts/third-party-login";

type ThirdPartyLoginButtonsProps = {
  onSignedIn?: () => void;
};

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
      <path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        fill="#FFC107"
      />
      <path
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        fill="#1976D2"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 23 23">
      <path d="M1 1h10v10H1z" fill="#F25022" />
      <path d="M12 1h10v10H12z" fill="#7FBA00" />
      <path d="M1 12h10v10H1z" fill="#00A4EF" />
      <path d="M12 12h10v10H12z" fill="#FFB900" />
    </svg>
  );
}

const providers: {
  id: ThirdPartyProviderId;
  label: string;
  Logo: ComponentType;
}[] = [
  { id: "google", label: "Google", Logo: GoogleLogo },
  { id: "microsoft", label: "Microsoft", Logo: MicrosoftLogo },
];

// "Continue with Google / Microsoft" buttons. A first-time user gets a student
// profile; see features/accounts/third-party-login.ts.
export function ThirdPartyLoginButtons({
  onSignedIn,
}: ThirdPartyLoginButtonsProps) {
  const [activeProvider, setActiveProvider] =
    useState<ThirdPartyProviderId | null>(null);
  const [error, setError] = useState("");

  async function handleClick(id: ThirdPartyProviderId) {
    setError("");
    setActiveProvider(id);

    try {
      await signInWithThirdParty(id);
      onSignedIn?.();
    } catch (caughtError) {
      setError(thirdPartyLoginErrorMessage(caughtError));
    } finally {
      setActiveProvider(null);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs font-medium uppercase text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" />
        or continue with
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="mt-4 space-y-3">
        {providers.map(({ id, label, Logo }) => (
          <button
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={activeProvider !== null}
            key={id}
            onClick={() => handleClick(id)}
            type="button"
          >
            <Logo />
            {activeProvider === id ? "Signing in" : `Continue with ${label}`}
          </button>
        ))}
      </div>

      {error ? (
        <p
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
