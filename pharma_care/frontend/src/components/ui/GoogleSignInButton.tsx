import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GoogleCredentialResponse } from "../../types/google-gsi";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// GoTrue verifies the ID token's nonce claim by SHA-256 hashing the nonce we
// pass to signInWithIdToken and comparing it to the claim (config.toml has
// skip_nonce_check = false). So Google gets the *hashed* nonce and Supabase
// gets the raw one. crypto.subtle only exists in a secure context; if it is
// missing we send no nonce at all, since GoTrue rejects a token whose nonce
// presence disagrees with the parameter's.
async function createNonce(): Promise<{ raw: string; hashed: string } | null> {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

// Resolves once the async <script src="accounts.google.com/gsi/client"> tag in
// index.html has defined window.google.accounts.id.
function waitForGsi(signal: { cancelled: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (signal.cancelled) return resolve(false);
      if (window.google?.accounts?.id) return resolve(true);
      if (Date.now() - started > 10_000) return resolve(false);
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

// lucide-react dropped brand icons, so the official four-colour Google "G" is
// inlined. It reads correctly on both the light and dark card backgrounds.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type Props = {
  /** Receives Google's ID token plus the raw nonce to hand to Supabase. */
  onCredential: (credential: string, nonce?: string) => void;
  /** Shown in place of the button when GSI can't load. */
  onUnavailable?: (reason: string) => void;
};

/**
 * "Continue with Google", styled to match the GitHub button beside it.
 *
 * Google Identity Services renders its own button into a shadow root, so its
 * font and background cannot be restyled from outside. Instead we draw our own
 * button and lay Google's over it at opacity 0 — the user sees ours, the click
 * lands on Google's. The resulting ID token is exchanged for a Supabase session
 * by the caller (see Login.tsx's handleSignInWithGoogle).
 */
export default function GoogleSignInButton({ onCredential, onUnavailable }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation(["auth"]);
  const [ready, setReady] = useState(false);

  // GSI captures the callback once at initialize() time, so route it through a
  // ref — otherwise it would keep calling the first render's closure.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const nonceRef = useRef<string | undefined>(undefined);

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    onCredentialRef.current(response.credential, nonceRef.current);
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };

    async function setup() {
      if (!CLIENT_ID) {
        onUnavailableRef.current?.("Missing VITE_GOOGLE_CLIENT_ID");
        return;
      }
      const loaded = await waitForGsi(signal);
      if (!loaded || signal.cancelled) {
        if (!signal.cancelled)
          onUnavailableRef.current?.("Google Identity Services failed to load");
        return;
      }
      const nonce = await createNonce();
      if (signal.cancelled) return;
      nonceRef.current = nonce?.raw;

      window.google!.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        nonce: nonce?.hashed,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        itp_support: true,
      });
      setReady(true);
    }

    void setup();
    return () => {
      signal.cancelled = true;
    };
    // Deliberately runs once: initialize() is a one-shot global registration,
    // and both callbacks are read through refs so they never go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google's button is the real click target, laid invisibly over our own
  // styled one below, so it only ever needs to match its width. It renders
  // into a shadow root at a fixed pixel width, hence the redraw on resize.
  useEffect(() => {
    if (!ready) return;
    const container = containerRef.current;
    if (!container) return;

    let lastWidth = 0;
    const draw = (width: number) => {
      lastWidth = width;
      container.innerHTML = "";
      window.google?.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        // Invisible, but it still carries the button's accessible name — so
        // keep the label localised for screen readers.
        text: "continue_with",
        locale: i18n.language,
        // Google caps the button at 400px; the login card is narrower anyway.
        width: Math.min(400, width),
      });
    };

    const measure = () => Math.round(container.getBoundingClientRect().width) || 384;
    draw(measure());

    // Only a *width* change needs a redraw. Reacting to height would loop:
    // drawing changes the container's height, which would retrigger the observer.
    const observer = new ResizeObserver(() => {
      const width = measure();
      if (width && width !== lastWidth) draw(width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, i18n.language]);

  return (
    <div className="group relative w-full">
      {/* What the user sees: same classes as the GitHub button next to it, so
          both share the app font and go transparent over the card in dark mode.
          aria-hidden because Google's real button underneath supplies the
          accessible name. */}
      <div
        aria-hidden="true"
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 text-sm font-semibold text-[#3f3f46] dark:text-slate-200 group-hover:bg-[#f4f4f5] dark:group-hover:bg-slate-700 transition ${
          ready ? "opacity-100" : "opacity-70"
        }`}
      >
        <GoogleLogo className="h-4 w-4" />
        {t("auth:login.continueWithGoogle")}
      </div>

      {/* Google's actual button, laid over the visual one and made invisible.
          Clicking therefore stays a genuine user gesture on Google's own
          element — synthetic .click() forwarding is fragile. Its height is
          fixed by `size`, so centre it: the visual button is 2px taller and
          the leftover 1px edge would otherwise be a dead strip on one side. */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0 [color-scheme:light]"
      />
    </div>
  );
}
