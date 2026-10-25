// Opens Paddle's checkout (overlay) in the browser. Paddle.js loads on first use.

export type PaddleClient = { token: string; sandbox: boolean; prices: { month: string; year: string }; email: string; userId: string };

type PaddleJs = {
  Environment: { set(env: "sandbox"): void };
  Initialize(opts: { token: string; eventCallback?: (e: { name?: string }) => void }): void;
  Checkout: {
    open(opts: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: {
        displayMode?: "overlay";
        theme?: "light" | "dark";
        variant?: "one-page" | "multi-page";
        showAddTaxId?: boolean;
        successUrl?: string;
        allowLogout?: boolean;
      };
    }): void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

let ready: Promise<PaddleJs> | null = null;

function loadPaddle(cfg: PaddleClient, onClose: () => void): Promise<PaddleJs> {
  ready ??= new Promise<PaddleJs>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      const p = window.Paddle;
      if (!p) return reject(new Error("Paddle didn't load."));
      if (cfg.sandbox) p.Environment.set("sandbox");
      p.Initialize({ token: cfg.token, eventCallback: (e) => e.name === "checkout.closed" && onClose() });
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

/** The overlay checkout for Pro; after paying, Paddle sends the visitor to the billing page. */
export async function openPaddleCheckout(cfg: PaddleClient, interval: "month" | "year", onClose: () => void) {
  const paddle = await loadPaddle(cfg, onClose);
  paddle.Checkout.open({
    items: [{ priceId: interval === "year" ? cfg.prices.year : cfg.prices.month, quantity: 1 }],
    customer: cfg.email ? { email: cfg.email } : undefined,
    customData: { userId: cfg.userId },
    // One page (payment method, email, card, country together), light, without the business VAT number field.
    settings: {
      displayMode: "overlay",
      theme: "light",
      variant: "one-page",
      showAddTaxId: false,
      allowLogout: false,
      successUrl: `${location.origin}/dashboard/billing?checkout=success`,
    },
  });
}
