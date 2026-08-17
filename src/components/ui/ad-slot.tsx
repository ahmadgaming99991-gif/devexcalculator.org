import { isAdsEnabled } from "@/config/site";

/**
 * Advertising slot.
 *
 * Renders nothing at all — no container, no reserved space, no script — unless
 * a real publisher ID is configured. An empty bordered box labelled
 * "advertisement" is worse than no advertisement, and reserving height for a
 * slot that will never fill is layout shift with no upside.
 *
 * When enabled, the slot reserves its dimensions up front so filling it cannot
 * shift the page. Slots are never placed between an input and its result.
 */
export function AdSlot({
  placement,
  width,
  height,
}: {
  placement: string;
  width: number;
  height: number;
}) {
  if (!isAdsEnabled) return null;

  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      // Dimensions are reserved before the ad loads so nothing below moves.
      style={{ minHeight: height, maxWidth: width }}
      className="mx-auto w-full"
    />
  );
}
