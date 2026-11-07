import "server-only";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { MapHover } from "./map-hover";

// Rendered on the server as plain SVG, so the map ships no client JavaScript.

const WIDTH = 960;
const HEIGHT = 470;

type Shape = { id: string; name: string; d: string };
let shapes: Shape[] | null = null;

function worldShapes(): Shape[] {
  if (shapes) return shapes;
  const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  fc.features = fc.features.filter((f) => f.id !== "010"); // Antarctica
  const path = geoPath(geoNaturalEarth1().fitSize([WIDTH, HEIGHT], fc));
  shapes = fc.features.map((f) => ({ id: String(f.id ?? ""), name: f.properties?.name ?? "", d: path(f) ?? "" })).filter((s) => s.d);
  return shapes;
}

/** 0..1 on a log scale, so one big country doesn't wash out the rest. */
export function intensity(views: number, max: number) {
  return views > 0 && max > 0 ? Math.log1p(views) / Math.log1p(max) : 0;
}

export function heatColor(t: number) {
  return t <= 0 ? "var(--map-empty)" : `color-mix(in oklab, var(--chart-1) ${Math.round(18 + 82 * t)}%, var(--map-empty))`;
}

export function WorldMap({ data }: { data: { numeric: string | null; name: string; views: number }[] }) {
  const byId = new Map(data.filter((d) => d.numeric).map((d) => [d.numeric!, d]));
  const max = Math.max(0, ...data.map((d) => d.views));
  const fmt = new Intl.NumberFormat("en-US");

  const steps = [0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87, 1];

  return (
    <figure className="relative rounded-xl bg-muted/40 p-2 [--map-empty:color-mix(in_oklab,var(--muted)_85%,var(--foreground))]">
      <MapHover>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`World map of views by country. ${data.length} countries.`} className="h-auto w-full">
          {worldShapes().map((s) => {
            const row = byId.get(s.id);
            const views = row?.views ?? 0;
            return (
              <path
                key={s.id + s.name}
                d={s.d}
                fill={heatColor(intensity(views, max))}
                stroke="var(--card)"
                strokeWidth={0.5}
                data-country={s.id}
                data-name={row?.name ?? s.name}
                data-views={views}
                className="cursor-pointer transition-[filter] hover:brightness-90 hover:[stroke:var(--foreground)] hover:[stroke-width:1]"
              />
            );
          })}
        </svg>
      </MapHover>
      <figcaption className="pointer-events-none absolute bottom-3 left-3 rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <p className="mb-1.5 font-medium">Views intensity (log scale)</p>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span aria-hidden className="size-3.5 rounded-[4px] bg-[var(--map-empty)]" />
          <span className="mr-1 tabular-nums">0</span>
          {steps.map((t) => (
            <span key={t} aria-hidden className="size-3.5 rounded-[4px]" style={{ background: heatColor(t) }} />
          ))}
          <span className="ml-1 tabular-nums">{max ? fmt.format(max) : "High"}</span>
        </span>
      </figcaption>
    </figure>
  );
}
