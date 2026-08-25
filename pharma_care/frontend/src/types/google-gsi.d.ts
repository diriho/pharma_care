// Minimal typings for the Google Identity Services client loaded from the
// <script src="https://accounts.google.com/gsi/client"> tag in index.html.
// Only the surface this app uses is declared.

export type GoogleCredentialResponse = {
  /** The signed JWT ID token — what Supabase's signInWithIdToken consumes. */
  credential: string;
  select_by?: string;
  clientId?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  /** SHA-256 hash of the nonce sent to signInWithIdToken (see GoTrue's check). */
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
  itp_support?: boolean;
  ux_mode?: "popup" | "redirect";
};


type GsiButtonConfiguration = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
          prompt: () => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
