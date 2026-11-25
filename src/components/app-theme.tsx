"use client";

import { useEffect, useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// The signed-in app can be glow (the default: black with green glows and glass cards), dark
// (plain green on black) or light (white and green with soft green glows). The choice is kept in this browser and
// applied as <html data-theme="glow|light"> while the app is open; the public site and bio pages
// keep their own look.

export type AppTheme = "glow" | "dark" | "light";
// v2: everyone moved to Glow when it became the default (the old "viewlink-theme" choice is dropped).
const KEY = "viewlink-theme-v2";
const EVENT = "viewlink-theme";

/** Runs before the page paints (inline in the app layout), so a light page never flashes dark. */
export const APP_THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="light"?"light":t==="dark"?"dark":"glow"}catch(e){document.documentElement.dataset.theme="glow"}`;

const asTheme = (v: unknown): AppTheme => (v === "light" ? "light" : v === "dark" ? "dark" : "glow");

function stored(): AppTheme {
  try {
    return asTheme(localStorage.getItem(KEY));
  } catch {
    return "glow";
  }
}

function apply(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function setAppTheme(theme: AppTheme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: still switch for this visit */
  }
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

/** Back to the default (Glow): called on the sign-in and sign-up forms, so every new sign-in starts on Glow. */
export function resetAppTheme() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode: nothing saved */
  }
}

const current = (): AppTheme => asTheme(document.documentElement.dataset.theme);

/**
 * The current app theme (glow while rendering on the server). Read again once on screen: parts of
 * the page that load later would otherwise keep the server's "glow".
 */
export function useAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>("glow");
  useEffect(() => {
    const read = () => setTheme(current());
    const timer = setTimeout(read, 0);
    window.addEventListener(EVENT, read);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT, read);
    };
  }, []);
  return theme;
}

/** Keeps the saved theme on while the app is open, and takes it off when leaving to the public site. */
export function AppThemeScope() {
  useEffect(() => {
    apply(stored());
    window.dispatchEvent(new Event(EVENT));
    return () => {
      delete document.documentElement.dataset.theme;
      window.dispatchEvent(new Event(EVENT));
    };
  }, []);
  return null;
}

/** Glow / Dark / Light switch for Settings. */
export function ThemeSwitch() {
  const theme = useAppTheme();
  const options = [
    { value: "glow" as const, label: "Glow", icon: Sparkles },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "light" as const, label: "Light", icon: Sun },
  ];
  return (
    <div className="inline-flex rounded-full border bg-muted p-1" role="radiogroup" aria-label="Theme">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => setAppTheme(o.value)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            theme === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-4" aria-hidden /> {o.label}
        </button>
      ))}
    </div>
  );
}
