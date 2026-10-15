import "server-only";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

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

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`World map of views by country. ${data.length} countries.`}
        className="h-auto w-full [--map-empty:color-mix(in_oklab,var(--muted)_85%,var(--foreground))]"
      >
        {worldShapes().map((s) => {
          const row = byId.get(s.id);
          const t = intensity(row?.views ?? 0, max);
          return (
            <path
              key={s.id + s.name}
              d={s.d}
              fill={heatColor(t)}
              stroke="var(--card)"
              strokeWidth={0.5}
              data-country={s.id}
              className="transition-opacity hover:opacity-80"
            >
              <title>{`${row?.name ?? s.name}: ${fmt.format(row?.views ?? 0)} views`}</title>
            </path>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Views intensity (log scale)</span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums">0</span>
          <span
            aria-hidden
            className="h-2 w-40 rounded-full [--map-empty:color-mix(in_oklab,var(--muted)_85%,var(--foreground))]"
            style={{ background: `linear-gradient(90deg, var(--map-empty), ${heatColor(0.01)}, ${heatColor(0.5)}, ${heatColor(1)})` }}
          />
          <span className="tabular-nums">{fmt.format(max)}</span>
        </span>
      </figcaption>
    </figure>
  );
}
