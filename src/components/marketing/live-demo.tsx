import "server-only";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { LiveDemoOverlay, type DemoCity } from "./live-demo-overlay";

// Home page: a world map with example visitors arriving live. The map is drawn here on the server
// (plain SVG, no client JavaScript); only the moving dots and the feed run in the browser.
// Example traffic comes from all over the world, with the US and Europe a little busier.

const WIDTH = 960;
const HEIGHT = 470;

// [name, ISO country code, country, longitude, latitude, weight]
const CITIES: [string, string, string, number, number, number][] = [
  // United States (a bit busier)
  ["New York", "US", "United States", -74, 40.7, 4],
  ["Los Angeles", "US", "United States", -118.2, 34, 4],
  ["Miami", "US", "United States", -80.2, 25.8, 3],
  ["Chicago", "US", "United States", -87.6, 41.9, 3],
  ["Houston", "US", "United States", -95.4, 29.8, 2],
  ["Atlanta", "US", "United States", -84.4, 33.7, 2],
  ["Seattle", "US", "United States", -122.3, 47.6, 2],
  // Europe (a bit busier)
  ["London", "GB", "United Kingdom", -0.1, 51.5, 4],
  ["Paris", "FR", "France", 2.35, 48.86, 3],
  ["Berlin", "DE", "Germany", 13.4, 52.5, 3],
  ["Madrid", "ES", "Spain", -3.7, 40.4, 3],
  ["Milan", "IT", "Italy", 9.19, 45.46, 2],
  ["Amsterdam", "NL", "Netherlands", 4.9, 52.37, 2],
  ["Lisbon", "PT", "Portugal", -9.1, 38.7, 2],
  ["Stockholm", "SE", "Sweden", 18.1, 59.3, 2],
  ["Warsaw", "PL", "Poland", 21, 52.2, 2],
  ["Dublin", "IE", "Ireland", -6.3, 53.3, 1.5],
  ["Zurich", "CH", "Switzerland", 8.5, 47.4, 1.5],
  ["Athens", "GR", "Greece", 23.7, 38, 1],
  ["Bucharest", "RO", "Romania", 26.1, 44.4, 1],
  // Rest of the Americas
  ["Toronto", "CA", "Canada", -79.4, 43.7, 2],
  ["Vancouver", "CA", "Canada", -123.1, 49.3, 1.5],
  ["Mexico City", "MX", "Mexico", -99.1, 19.4, 1.5],
  ["São Paulo", "BR", "Brazil", -46.6, -23.5, 1.5],
  ["Buenos Aires", "AR", "Argentina", -58.4, -34.6, 1],
  ["Bogotá", "CO", "Colombia", -74.1, 4.7, 1],
  ["Santiago", "CL", "Chile", -70.7, -33.4, 1],
  ["Lima", "PE", "Peru", -77, -12, 1],
  // Asia and the Middle East
  ["Tokyo", "JP", "Japan", 139.7, 35.7, 1.5],
  ["Seoul", "KR", "South Korea", 127, 37.6, 1],
  ["Manila", "PH", "Philippines", 121, 14.6, 1],
  ["Jakarta", "ID", "Indonesia", 106.8, -6.2, 1],
  ["Bangkok", "TH", "Thailand", 100.5, 13.8, 1],
  ["Singapore", "SG", "Singapore", 103.8, 1.35, 1],
  ["Mumbai", "IN", "India", 72.9, 19.1, 1],
  ["Dubai", "AE", "United Arab Emirates", 55.3, 25.2, 1],
  ["Riyadh", "SA", "Saudi Arabia", 46.7, 24.7, 1],
  ["Istanbul", "TR", "Turkey", 29, 41, 1],
  // Africa
  ["Casablanca", "MA", "Morocco", -7.6, 33.6, 1],
  ["Lagos", "NG", "Nigeria", 3.4, 6.5, 1],
  ["Cairo", "EG", "Egypt", 31.2, 30, 1],
  ["Nairobi", "KE", "Kenya", 36.8, -1.3, 1],
  ["Johannesburg", "ZA", "South Africa", 28, -26.2, 1],
  // Oceania
  ["Sydney", "AU", "Australia", 151.2, -33.9, 1],
  ["Auckland", "NZ", "New Zealand", 174.8, -36.8, 1],
];

// Country shading (ISO 3166 numeric id → share of traffic, 0..1), like the dashboard's heat map.
const HEAT: Record<string, number> = {
  "840": 1,
  "826": 0.82,
  "250": 0.66,
  "276": 0.66,
  "724": 0.6,
  "380": 0.5,
  "528": 0.46,
  "620": 0.4,
  "752": 0.4,
  "616": 0.4,
  "372": 0.34,
  "756": 0.34,
  "056": 0.3,
  "040": 0.28,
  "578": 0.28,
  "208": 0.28,
  "300": 0.26,
  "642": 0.26,
  "124": 0.42,
  "484": 0.34,
  "076": 0.36,
  "032": 0.26,
  "170": 0.24,
  "152": 0.22,
  "604": 0.2,
  "392": 0.3,
  "410": 0.24,
  "608": 0.24,
  "360": 0.22,
  "764": 0.22,
  "702": 0.2,
  "356": 0.24,
  "784": 0.24,
  "682": 0.22,
  "792": 0.24,
  "504": 0.24,
  "566": 0.22,
  "818": 0.22,
  "404": 0.18,
  "710": 0.22,
  "036": 0.26,
  "554": 0.18,
};

let cache: {
  countries: { id: string; d: string; heat: number }[];
  cities: DemoCity[];
} | null = null;

function build() {
  if (cache) return cache;
  const topo = world as unknown as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<
    Geometry,
    { name: string }
  >;
  fc.features = fc.features.filter((f) => f.id !== "010"); // Antarctica
  const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], fc);
  const path = geoPath(projection);
  const countries = fc.features
    .map((f) => ({
      id: String(f.id ?? ""),
      d: path(f) ?? "",
      heat: HEAT[String(f.id ?? "")] ?? 0,
    }))
    .filter((c) => c.d);
  const cities = CITIES.map(([name, code, country, lon, lat, weight]) => {
    const [x, y] = projection([lon, lat]) ?? [0, 0];
    return {
      name,
      code,
      country,
      x: (x / WIDTH) * 100,
      y: (y / HEIGHT) * 100,
      weight,
    };
  });
  cache = { countries, cities };
  return cache;
}

export function LiveDemo() {
  const { countries, cities } = build();
  return (
    <LiveDemoOverlay cities={cities}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden
        className="h-auto w-full"
      >
        {countries.map((c, i) => (
          <path
            key={`${c.id}-${i}`}
            d={c.d}
            fill={
              c.heat
                ? `color-mix(in oklab, #49f264 ${Math.round(18 + 70 * c.heat)}%, #262626)`
                : "#262626"
            }
            stroke="#151515"
            strokeWidth={0.6}
          />
        ))}
      </svg>
    </LiveDemoOverlay>
  );
}
