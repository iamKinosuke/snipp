export const MAX_URL_LENGTH = 2048;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_HOSTNAMES = new Set(["localhost"]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
];

export type UrlRejectionCode = "INVALID_URL";

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; code: UrlRejectionCode; message: string };

export interface ValidateUrlOptions {
  blockedHosts?: readonly string[];
}

const HAS_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

const PRIVATE_ADDRESS_MESSAGE =
  "That URL points to a private or internal address, which cannot be shortened.";

function reject(message: string): UrlValidationResult {
  return { ok: false, code: "INVALID_URL", message };
}

function parseIPv4(input: string): [number, number, number, number] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets as [number, number, number, number];
}

function isPrivateIPv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
  if (a === 192 && b === 0) return true; // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a >= 224) return true; // 224.0.0.0/3

  return false;
}

function parseIPv6(input: string): number[] | null {
  if (input.includes(":::")) return null;

  const doubleColon = input.indexOf("::");
  if (doubleColon !== input.lastIndexOf("::")) return null;

  let headParts: string[] = [];
  let tailParts: string[] = [];

  if (doubleColon === -1) {
    headParts = input.split(":");
  } else {
    const head = input.slice(0, doubleColon);
    const tail = input.slice(doubleColon + 2);
    headParts = head === "" ? [] : head.split(":");
    tailParts = tail === "" ? [] : tail.split(":");
  }

  const expand = (parts: string[]): number[] | null => {
    const out: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (part.includes(".")) {
        if (i !== parts.length - 1) return null;
        const v4 = parseIPv4(part);
        if (!v4) return null;
        out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]);
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
      out.push(Number.parseInt(part, 16));
    }
    return out;
  };

  const head = expand(headParts);
  const tail = expand(tailParts);
  if (!head || !tail) return null;

  if (doubleColon === -1) {
    return head.length === 8 ? head : null;
  }

  const fill = 8 - head.length - tail.length;
  if (fill < 1) return null;

  return [...head, ...new Array<number>(fill).fill(0), ...tail];
}

function isPrivateIPv6(groups: number[]): boolean {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups as [
    number, number, number, number, number, number, number, number,
  ];

  const leadingZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0;

  // :: and ::1
  if (leadingZero && g5 === 0 && g6 === 0 && (g7 === 0 || g7 === 1)) return true;

  // ::ffff:a.b.c.d
  if (leadingZero && g5 === 0xffff) {
    return isPrivateIPv4(groupsToIPv4(g6, g7));
  }

  // ::a.b.c.d
  if (leadingZero && g5 === 0 && (g6 !== 0 || g7 !== 0)) {
    return isPrivateIPv4(groupsToIPv4(g6, g7));
  }

  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10

  return false;
}

function groupsToIPv4(g6: number, g7: number): [number, number, number, number] {
  return [(g6 >> 8) & 0xff, g6 & 0xff, (g7 >> 8) & 0xff, g7 & 0xff];
}

export function validateUrl(
  input: string,
  options: ValidateUrlOptions = {},
): UrlValidationResult {
  if (typeof input !== "string") {
    return reject("A URL is required.");
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return reject("A URL is required.");
  }

  const candidate = HAS_SCHEME_PATTERN.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  if (candidate.length > MAX_URL_LENGTH) {
    return reject(`URLs cannot be longer than ${MAX_URL_LENGTH} characters.`);
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return reject("That URL is not valid.");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return reject("Only http and https URLs are supported.");
  }

  if (url.username !== "" || url.password !== "") {
    return reject("URLs cannot contain a username or password.");
  }

  if (url.hostname === "") {
    return reject("That URL is not valid.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const groups = parseIPv6(hostname.slice(1, -1));
    if (!groups) {
      return reject("That IPv6 address is not valid.");
    }
    if (isPrivateIPv6(groups)) {
      return reject(PRIVATE_ADDRESS_MESSAGE);
    }
  } else {
    const octets = parseIPv4(hostname);
    if (octets && isPrivateIPv4(octets)) {
      return reject(PRIVATE_ADDRESS_MESSAGE);
    }
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return reject(PRIVATE_ADDRESS_MESSAGE);
  }

  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return reject(PRIVATE_ADDRESS_MESSAGE);
  }

  for (const blocked of options.blockedHosts ?? []) {
    const normalized = blocked.toLowerCase().replace(/\.$/, "");
    if (hostname === normalized || hostname.endsWith(`.${normalized}`)) {
      return reject("You cannot shorten a Snipp link.");
    }
  }

  return { ok: true, url: url.toString() };
}
