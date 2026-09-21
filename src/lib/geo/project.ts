import { geoMercator, type GeoProjection } from "d3-geo";
import type { CountyGeometry } from "@/lib/population/load";
import type { CountyId } from "@/lib/population/schema";

export type ProjectedPoint = [number, number];

export type KenyaFeature = {
  type: "Feature";
  properties: { countyId: CountyId };
  geometry: CountyGeometry;
};

export type KenyaCollection = {
  type: "FeatureCollection";
  features: KenyaFeature[];
};

const DEFAULT_SIZE: ProjectedPoint = [100, 120];

export function kenyaProjection(
  collection: KenyaCollection,
  width = DEFAULT_SIZE[0],
  height = DEFAULT_SIZE[1],
): GeoProjection {
  return geoMercator().fitSize([width, height], collection);
}

export function projectLngLat(
  projection: GeoProjection,
  lngLat: readonly [number, number],
): ProjectedPoint {
  const xy = projection(lngLat as [number, number]);
  if (!xy) {
    return [0, 0];
  }
  return [xy[0], xy[1]];
}

export function projectedRings(
  projection: GeoProjection,
  geometry: CountyGeometry,
): ProjectedPoint[][][] {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) =>
    polygon.map((ring) => ring.map((lngLat) => projectLngLat(projection, lngLat))),
  );
}

export function featureCollection(
  geometries: Readonly<Record<CountyId, CountyGeometry>>,
): KenyaCollection {
  return {
    type: "FeatureCollection",
    features: (Object.entries(geometries) as [CountyId, CountyGeometry][]).map(
      ([countyId, geometry]) => ({
        type: "Feature",
        properties: { countyId },
        geometry,
      }),
    ),
  };
}
