"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { hasMarketingConsent } from "@/lib/tracking/consent";
import { trackPageView } from "@/lib/tracking";

export function MetaPixel({ enabled, pixelId }: { enabled: boolean; pixelId: string | null }) {
  const pathname = usePathname();
  const isFirstPathname = useRef(true);

  const shouldLoad = enabled && !!pixelId && !pathname.startsWith("/admin") && hasMarketingConsent();

  // Route changes after the initial load — the base code below already fires the first PageView.
  useEffect(() => {
    if (!shouldLoad) return;
    if (isFirstPathname.current) {
      isFirstPathname.current = false;
      return;
    }
    trackPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, shouldLoad]);

  if (!shouldLoad) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
