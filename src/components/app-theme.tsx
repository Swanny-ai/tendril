"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// The signed-in app can be dark (the default, green on black) or light (white and green).
// The choice is kept in this browser and applied as <html data-theme="light"> while the app is
// open; the public site and bio pages keep their own look.

export type AppTheme = "dark" | "light";
const KEY = "viewlink-theme";
const EVENT = "viewlink-theme";

/** Runs before the page paints (inline in the app layout), so a light page never flashes dark. */
export const APP_THEME_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

function stored(): AppTheme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme: AppTheme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
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

const current = (): AppTheme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/**
 * The current app theme (dark while rendering on the server). Read again once on screen: parts of
 * the page that load later would otherwise keep the server's "dark".
 */
export function useAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>("dark");
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

/** Dark / Light switch for Settings. */
export function ThemeSwitch() {
  const theme = useAppTheme();
  const options = [
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
