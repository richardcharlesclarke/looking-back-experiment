"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const FONT_READY_TIMEOUT_MS = 500;
const PAGE_SETTLE_DELAY_MS = 300;
const DEFAULT_DRAW_DURATIONS: Record<string, number> = {
  "profile-1": 36,
  "profile-2": 26,
  "profile-2-hero": 24,
  river: 26
};

type RevealGroup = {
  visiblePath: string;
  direction: "forward" | "reverse" | "offset";
  trimEnd?: boolean;
  dashLength?: number;
  delayOffset: number;
  durationOffset: number;
};

type DecorationData = {
  viewBox: string;
  groups: RevealGroup[];
  stroke: string;
  delaySeconds: number;
  drawDuration: number;
};

type VectorDecorationProps = {
  src: string;
  className: string;
  delay?: string;
  drawDuration?: string;
  stroke?: string;
  variant?: "profile-1" | "profile-2-hero";
  activateImmediately?: boolean;
};

const svgCache = new Map<string, Promise<string>>();

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function waitForReady() {
  if (document.fonts?.ready) {
    await Promise.race([document.fonts.ready.catch(() => undefined), wait(FONT_READY_TIMEOUT_MS)]);
  }
  await nextFrame();
  await wait(PAGE_SETTLE_DELAY_MS);
  await nextFrame();
  await nextFrame();
}

function loadSvg(src: string) {
  if (!svgCache.has(src)) {
    svgCache.set(
      src,
      fetch(src).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${src}`);
        return response.text();
      })
    );
  }
  return svgCache.get(src)!;
}

function parseSeconds(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const trimmed = value.trim();
  const number = Number.parseFloat(trimmed);
  if (!Number.isFinite(number)) return fallback;
  return trimmed.endsWith("ms") ? number / 1000 : number;
}

function splitSubpaths(path: string) {
  return path
    .split(/(?=M)/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getRevealGroups(path: string): RevealGroup[] {
  const subpaths = splitSubpaths(path);
  if (subpaths.length === 1) {
    return [{ visiblePath: path, direction: "reverse", delayOffset: 0, durationOffset: 0 }];
  }

  return subpaths.map((subpath, index) => ({
    visiblePath: subpath,
    direction: index % 2 === 0 ? "forward" : "reverse",
    trimEnd: index > 0,
    delayOffset: index * 0.65 + (index % 2 === 0 ? 0 : 1.15),
    durationOffset: index * 0.35 + (index % 2 === 0 ? 0 : 1.25)
  }));
}

function getProfileOneRevealGroups(path: string): RevealGroup[] {
  const splitPoint = "488.855 0.690201";
  const splitIndex = path.indexOf(`${splitPoint}C`);
  if (splitIndex === -1) return getRevealGroups(path);

  const firstEdge = path.slice(0, splitIndex + splitPoint.length);
  const secondEdge = `M${splitPoint}${path.slice(splitIndex + splitPoint.length).replace(/Z\s*$/i, "")}`;
  const firstEdgeContinuation = firstEdge.replace(/^M[-.\d]+\s+[-.\d]+/, "");
  const rotatedOpenPath = `${secondEdge}${firstEdgeContinuation}`;

  return [{ visiblePath: rotatedOpenPath, direction: "forward", delayOffset: 0, durationOffset: 0 }];
}

function getProfileTwoHeroRevealGroups(paths: string[]): RevealGroup[] {
  const delayOffsets = [0, 0, 14, 15, 16, 17];
  const durations = [24, 24, 10, 10, 11, 10];

  return paths.map((path, index) => ({
    visiblePath: path,
    direction: "offset",
    dashLength: 4000,
    delayOffset: delayOffsets[index] || 0,
    durationOffset: (durations[index] || 24) - DEFAULT_DRAW_DURATIONS["profile-2-hero"]
  }));
}

export function VectorDecoration({
  src,
  className,
  delay = "0s",
  drawDuration,
  stroke,
  variant,
  activateImmediately = false
}: VectorDecorationProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [data, setData] = useState<DecorationData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const resolvedVariant = useMemo(() => {
    if (variant) return variant;
    return src.includes("profile-vector-new-1") ? "profile-1" : "profile-2-hero";
  }, [src, variant]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setIsReady(false);

    loadSvg(src)
      .then((svgText) => {
        if (cancelled) return;
        const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const sourceSvg = parsed.querySelector("svg");
        const sourcePaths = sourceSvg ? Array.from(sourceSvg.querySelectorAll("path")) : [];
        const pathData = sourcePaths.map((path) => path.getAttribute("d")).filter(Boolean) as string[];
        if (!sourceSvg || !pathData.length) return;

        const delaySeconds = parseSeconds(delay, 0);
        const baseDuration = DEFAULT_DRAW_DURATIONS[resolvedVariant] || 26;
        const parsedDrawDuration = parseSeconds(drawDuration, baseDuration);
        const sourceStroke = sourcePaths[0]?.getAttribute("stroke");
        const revealGroups =
          resolvedVariant === "profile-1" && pathData.length === 1
            ? getProfileOneRevealGroups(pathData[0])
            : resolvedVariant === "profile-2-hero"
              ? getProfileTwoHeroRevealGroups(pathData)
              : getRevealGroups(pathData[0]);

        setData({
          viewBox:
            sourceSvg.getAttribute("viewBox") ||
            `0 0 ${sourceSvg.getAttribute("width") || 100} ${sourceSvg.getAttribute("height") || 100}`,
          groups: revealGroups,
          stroke: stroke || sourceStroke || "#F4F3F4",
          delaySeconds,
          drawDuration: parsedDrawDuration
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [delay, drawDuration, resolvedVariant, src, stroke]);

  useEffect(() => {
    if (!data || !rootRef.current) return;
    let cancelled = false;

    async function prepareAndActivate() {
      await nextFrame();
      await nextFrame();
      if (cancelled || !rootRef.current) return;

      rootRef.current.querySelectorAll<SVGPathElement>(".vector-decoration__path").forEach((path) => {
        if (path.style.getPropertyValue("--vector-path-length")) return;
        const length = path.getTotalLength();
        if (Number.isFinite(length) && length > 0) {
          path.style.setProperty("--vector-path-length", `${length}`);
        }
      });

      if (!activateImmediately) {
        await waitForReady();
      }
      if (!cancelled) setIsReady(true);
    }

    prepareAndActivate();

    return () => {
      cancelled = true;
    };
  }, [activateImmediately, data]);

  if (!data) return <span className={`${className} vector-decoration`} aria-hidden="true" />;

  return (
    <span
      ref={rootRef}
      className={`${className} vector-decoration${isReady ? " is-ready" : ""}`}
      aria-hidden="true"
      style={{ "--vector-stroke": data.stroke } as CSSProperties}
    >
      <svg className="vector-decoration__svg" viewBox={data.viewBox} fill="none" focusable="false" aria-hidden="true">
        {data.groups.map((group, index) => {
          const pathClass = [
            "vector-decoration__path",
            `vector-decoration__path--${group.direction}`,
            group.trimEnd ? "vector-decoration__path--trim-end" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <path
              key={`${group.direction}-${index}`}
              className={pathClass}
              d={group.visiblePath}
              style={
                {
                  "--vector-path-length": group.dashLength ? `${group.dashLength}` : undefined,
                  "--vector-segment-delay": `${data.delaySeconds + group.delayOffset}s`,
                  "--vector-segment-duration": `${data.drawDuration + group.durationOffset}s`
                } as CSSProperties
              }
            />
          );
        })}
      </svg>
    </span>
  );
}
