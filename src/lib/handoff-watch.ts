// After a tap that should open the phone's browser, decide whether it worked.
// A plain "still visible after N seconds" check misjudges real phones: the app can take
// over a second to switch, and while it switches it may pause this page's timers. So:
//  - the page being hidden (or unloaded, or restored from the back-forward cache) = it left;
//  - a timer that fires far later than scheduled = the page was paused for the switch = it left;
//  - the window lost focus but hasn't come back = the switch (or the app's own prompt) is
//    still happening: wait a little longer, up to 8 seconds;
//  - otherwise the visitor is still here = it didn't work.
// Client-only.

const VERDICT_MS = 2000;
const PAUSE_SLACK_MS = 1200;
const MAX_WAIT_MS = 8000;

/** Calls onStayed if the visitor is still on this page after the hand-off. Returns a cancel function. */
export function watchHandoff(onStayed: () => void): () => void {
  const started = Date.now();
  let lostFocusAt = 0;
  let regainedFocus = false;
  let settled = false;
  let timer = 0;

  const left = () => settle(true);
  const onVisibility = () => document.visibilityState === "hidden" && left();
  const onPageShow = (e: PageTransitionEvent) => e.persisted && left();
  const onBlur = () => {
    if (!lostFocusAt) lostFocusAt = Date.now();
  };
  const onFocus = () => {
    if (lostFocusAt) regainedFocus = true;
  };

  function cleanup() {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", left);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
  }
  function settle(didLeave: boolean) {
    if (settled) return;
    settled = true;
    cleanup();
    if (!didLeave) onStayed();
  }
  function check(scheduledFor: number) {
    if (settled) return;
    if (document.visibilityState === "hidden") return settle(true);
    const elapsed = Date.now() - started;
    if (elapsed > scheduledFor + PAUSE_SLACK_MS) return settle(true);
    if (lostFocusAt && !regainedFocus && elapsed < MAX_WAIT_MS) {
      timer = window.setTimeout(() => check(elapsed + 500), 500);
      return;
    }
    settle(false);
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", left);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  timer = window.setTimeout(() => check(VERDICT_MS), VERDICT_MS);
  return () => {
    settled = true;
    cleanup();
  };
}
