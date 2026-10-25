// Paddle's checkout, drawn inside our own popup (Paddle "inline" mode). Paddle.js loads on first use.

export type PaddleClient = { token: string; sandbox: boolean; prices: { month: string; year: string }; email: string; userId: string };

type PaddleEvent = { name?: string };

type PaddleJs = {
  Environment: { set(env: "sandbox"): void };
  Initialize(opts: { token: string; eventCallback?: (e: PaddleEvent) => void }): void;
  Checkout: {
    open(opts: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: {
        displayMode?: "inline" | "overlay";
        frameTarget?: string;
        frameInitialHeight?: number;
        frameStyle?: string;
        theme?: "light" | "dark";
        variant?: "one-page" | "multi-page";
        showAddTaxId?: boolean;
        successUrl?: string;
        allowLogout?: boolean;
      };
    }): void;
    close(): void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

/** Class of the element Paddle draws the checkout into. */
export const PADDLE_FRAME_CLASS = "paddle-checkout-frame";

// Paddle.js takes one event callback for the whole page; the open popup listens through this.
let listener: ((e: PaddleEvent) => void) | null = null;
let ready: Promise<PaddleJs> | null = null;

function loadPaddle(cfg: PaddleClient): Promise<PaddleJs> {
  ready ??= new Promise<PaddleJs>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      const p = window.Paddle;
      if (!p) return reject(new Error("Paddle didn't load."));
      if (cfg.sandbox) p.Environment.set("sandbox");
      p.Initialize({ token: cfg.token, eventCallback: (e) => listener?.(e) });
      resolve(p);
    };
    s.onerror = () => {
      ready = null;
      reject(new Error("Couldn't reach Paddle. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return ready;
}

/** Waits for the popup's frame element to be on the page (the popup renders in a portal). */
async function frameReady(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (document.querySelector(`.${PADDLE_FRAME_CLASS}`)) return;
    await new Promise((r) => requestAnimationFrame(r));
  }
  throw new Error("The checkout couldn't open. Please try again.");
}

/**
 * Draws the one-page checkout for Pro into the popup: card or PayPal, name, card details and
 * country (the email is filled in from the account). After paying, Paddle sends the visitor to
 * the billing page, which then waits for the webhook to switch the account to Pro.
 */
export async function openInlineCheckout(cfg: PaddleClient, interval: "month" | "year", onEvent: (e: PaddleEvent) => void) {
  const paddle = await loadPaddle(cfg);
  await frameReady();
  listener = onEvent;
  paddle.Checkout.open({
    items: [{ priceId: interval === "year" ? cfg.prices.year : cfg.prices.month, quantity: 1 }],
    customer: cfg.email ? { email: cfg.email } : undefined,
    customData: { userId: cfg.userId },
    settings: {
      displayMode: "inline",
      frameTarget: PADDLE_FRAME_CLASS,
      frameInitialHeight: 450,
      frameStyle: "width: 100%; min-width: 286px; background-color: transparent; border: none;",
      theme: "light",
      variant: "one-page",
      showAddTaxId: false,
      allowLogout: false,
      successUrl: `${location.origin}/dashboard/billing?checkout=success`,
    },
  });
}

export function closeInlineCheckout() {
  listener = null;
  window.Paddle?.Checkout.close();
}
