export type Device = "Desktop" | "Mobile" | "Tablet";

export interface ClickContext {
  device: Device;
  browser: string;
  referrer: string;
}

const MAX_LABEL_LENGTH = 32;
const MAX_REFERRER_LENGTH = 255;

export function parseDevice(userAgent: string): Device {
  const ua = userAgent.toLowerCase();

  if (ua.includes("ipad") || ua.includes("tablet") || ua.includes("kindle")) {
    return "Tablet";
  }
  if (ua.includes("android") && !ua.includes("mobile")) {
    return "Tablet";
  }
  if (
    ua.includes("mobi") ||
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    ua.includes("android") ||
    ua.includes("windows phone")
  ) {
    return "Mobile";
  }

  return "Desktop";
}

export function parseBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
    return "Edge";
  }
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("firefox/") || ua.includes("fxios/")) return "Firefox";
  if (ua.includes("samsungbrowser/")) return "Samsung Internet";
  if (ua.includes("chrome/") || ua.includes("crios/")) return "Chrome";
  if (ua.includes("safari/")) return "Safari";
  if (ua === "") return "Unknown";

  if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) {
    return "Bot";
  }
  if (ua.includes("curl") || ua.includes("wget")) return "CLI";

  return "Other";
}

export function parseReferrer(referer: string | undefined): string {
  if (referer === undefined || referer.trim() === "") return "Direct";

  try {
    const { hostname } = new URL(referer);
    if (hostname === "") return "Direct";
    return hostname.toLowerCase().slice(0, MAX_REFERRER_LENGTH);
  } catch {
    return "Direct";
  }
}

export function parseClickContext(headers: {
  userAgent?: string | undefined;
  referer?: string | undefined;
}): ClickContext {
  const userAgent = headers.userAgent ?? "";

  return {
    device: parseDevice(userAgent),
    browser: parseBrowser(userAgent).slice(0, MAX_LABEL_LENGTH),
    referrer: parseReferrer(headers.referer),
  };
}
