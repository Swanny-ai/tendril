// Renders an 18+ warning page in any template (dashboard preview, bio-page warning route).
// The markup comes from warning-html.ts, the same renderer the public deep link pages use,
// so every place shows exactly the same screen.
import { Roboto } from "next/font/google";
import { WARNING_CSS, warningHtml, type WarningScreenProps } from "./warning-html";

export type { WarningScreenProps } from "./warning-html";

const roboto = Roboto({ weight: ["400", "500", "700"], subsets: ["latin"], display: "swap", variable: "--font-roboto" });

export function WarningScreen(p: WarningScreenProps) {
  return (
    <>
      <style href="warning-screen" precedence="default">
        {WARNING_CSS}
      </style>
      <div className={`${roboto.variable} flex min-h-full w-full`} dangerouslySetInnerHTML={{ __html: warningHtml(p) }} />
    </>
  );
}
