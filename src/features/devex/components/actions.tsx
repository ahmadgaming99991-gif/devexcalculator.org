"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useClientValue } from "@/lib/utilities/use-client-value";

/**
 * Copy, share and reset.
 *
 * Success and failure are announced through a live region and stated in words,
 * never signalled only by an icon swapping colour. A copy that silently fails
 * is worse than one that says it failed, so the fallback path is explicit.
 */

type CopyState = "idle" | "copied" | "failed";

/**
 * Copies text to the clipboard.
 *
 * The async Clipboard API needs a secure context and a permission that can be
 * refused, so a `document.execCommand` fallback covers the cases where it is
 * unavailable — an insecure origin, an older browser, a locked-down profile.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
}

export function CopyButton({
  label,
  text,
  variant = "secondary",
  onAnnounce,
}: {
  label: string;
  text: string;
  variant?: "primary" | "secondary" | "ghost";
  onAnnounce: (message: string) => void;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handle = useCallback(async () => {
    const succeeded = await copyText(text);
    setState(succeeded ? "copied" : "failed");
    onAnnounce(succeeded ? `${label} copied to the clipboard.` : `${label} could not be copied.`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2_500);
  }, [text, label, onAnnounce]);

  return (
    <Button variant={variant} onClick={handle} disabled={text === ""}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}

export function ShareButton({
  url,
  title,
  onAnnounce,
}: {
  url: string;
  title: string;
  onAnnounce: (message: string) => void;
}) {
  // `navigator.share` does not exist on the server, so the button renders as
  // "Copy link" during hydration and swaps to "Share" where the API exists.
  const canShare = useClientValue(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    false,
  );

  const handle = useCallback(async () => {
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // A cancelled share is a normal outcome, not a failure worth reporting.
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    const succeeded = await copyText(url);
    onAnnounce(succeeded ? "Share link copied to the clipboard." : "The link could not be copied.");
  }, [canShare, title, url, onAnnounce]);

  return (
    <Button variant="secondary" onClick={handle}>
      {canShare ? "Share" : "Copy link"}
    </Button>
  );
}

export function ResetButton({
  onReset,
  hasData,
  onAnnounce,
}: {
  onReset: () => void;
  hasData: boolean;
  onAnnounce: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  // Confirmation only when there is something to lose. Asking "are you sure"
  // about an empty form is noise.
  if (!hasData) {
    return (
      <Button variant="ghost" onClick={onReset} disabled>
        Reset
      </Button>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            onReset();
            setConfirming(false);
            onAnnounce("Calculator reset.");
          }}
        >
          Confirm reset
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <Button variant="ghost" onClick={() => setConfirming(true)}>
      Reset
    </Button>
  );
}
