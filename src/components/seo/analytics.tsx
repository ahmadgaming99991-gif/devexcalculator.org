import Script from "next/script";
import { analyticsConfig, isAnalyticsEnabled } from "@/config/site";

/**
 * Analytics.
 *
 * Disabled by default and genuinely absent when disabled — no script tag, no
 * beacon, no placeholder. Both integrations are opt-in through configuration,
 * and neither is given a calculator value: page paths are enough to see which
 * tools get used, and a creator's balance is nobody else's business.
 *
 * Neither sets a cookie, so neither is behind a consent prompt.
 *
 * Cloudflare Web Analytics is cookieless by design. GA4 is not, and is run
 * that way deliberately: Consent Mode starts every storage type denied, and
 * nothing here ever grants one. Google's tag then sends cookieless pings — it
 * reports which pages are read without writing an identifier to the device,
 * which is the whole of what this site wanted from it.
 *
 * That is what removed the banner. A prompt is owed for storage, and there is
 * no storage; a site that asks permission to do nothing is training its
 * readers to dismiss the next question it asks. The trade is real and was
 * accepted: no returning-visitor identity, no cross-session stitching, and
 * session counts Google models rather than measures.
 */
export function Analytics() {
  if (!isAnalyticsEnabled) return null;

  return (
    <>
      {analyticsConfig.cloudflareToken ? (
        <Script
          id="cf-analytics"
          strategy="afterInteractive"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: analyticsConfig.cloudflareToken })}
        />
      ) : null}

      {analyticsConfig.ga4Id ? <Ga4 measurementId={analyticsConfig.ga4Id} /> : null}
    </>
  );
}

function Ga4({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
// Denied, and never updated. Nothing in this site grants a storage type, so
// the tag measures page views without writing an identifier to the device.
gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('config',${JSON.stringify(measurementId)},{anonymize_ip:true});
        `.trim()}
      </Script>
    </>
  );
}
