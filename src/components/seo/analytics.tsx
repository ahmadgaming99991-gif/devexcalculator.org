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
 * Cloudflare Web Analytics is cookieless, so it loads without a consent gate.
 * GA4 sets cookies, so it is loaded only after consent is recorded — see
 * `AnalyticsConsent`.
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
// Consent starts denied and is granted only by an explicit choice.
gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
try{if(localStorage.getItem('devex:consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'})}}catch(e){}
gtag('config',${JSON.stringify(measurementId)},{anonymize_ip:true});
        `.trim()}
      </Script>
    </>
  );
}
