import { NextResponse } from "next/server";

type IpInfoResponse = {
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  timezone?: string;
};

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function publicIp(value: string) {
  const ip = value.replace(/^::ffff:/, "");
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.toLowerCase() === "localhost") return "";

  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    if (parts[0] === 10 || parts[0] === 127) return "";
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return "";
    if (parts[0] === 192 && parts[1] === 168) return "";
    return ip;
  }

  if (ip.includes(":")) return ip;
  return "";
}

function requestIp(request: Request) {
  const headers = request.headers;
  const ip =
    firstForwardedIp(headers.get("cf-connecting-ip")) ||
    firstForwardedIp(headers.get("x-real-ip")) ||
    firstForwardedIp(headers.get("x-forwarded-for")) ||
    "";
  return publicIp(ip);
}

function countryName(countryCode: string | undefined) {
  if (!countryCode) return undefined;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode.toUpperCase());
  } catch {
    return countryCode;
  }
}

function parseLoc(loc: string | undefined) {
  if (!loc) return {};
  const [latitudeText, longitudeText] = loc.split(",");
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};
  return { latitude, longitude };
}

export async function GET(request: Request) {
  const ip = requestIp(request);
  const token = process.env.IPINFO_TOKEN;
  const target = ip ? `/${encodeURIComponent(ip)}/json` : "/json";
  const url = new URL(`https://ipinfo.io${target}`);
  if (token) url.searchParams.set("token", token);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Location lookup unavailable." }, { status: 502 });
    }

    const data = (await response.json()) as IpInfoResponse;
    const countryCode = data.country?.toUpperCase();

    return NextResponse.json({
      consent: true,
      ...parseLoc(data.loc),
      city: data.city,
      region: data.region,
      country: countryName(countryCode),
      countryCode,
      timezone: data.timezone,
      source: token ? "ipinfo" : "ipinfo-unauthenticated"
    });
  } catch {
    return NextResponse.json({ error: "Location lookup failed." }, { status: 502 });
  }
}
