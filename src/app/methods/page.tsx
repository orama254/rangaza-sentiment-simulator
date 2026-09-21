import { FRICTION_WEIGHTS, HOTSPOT_CLARITY, HOTSPOT_FRICTION } from "@/lib/scoring/weights";

export default function MethodsPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <p className="text-sm uppercase tracking-wide text-zinc-500">Rangaza</p>
      <h1 className="text-3xl font-semibold">Methods</h1>
      <p>
        Rangaza is a diagnostic instrument. County Pulse and Friction are Simulated
        unless a Civic Educator loads Verified data.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">How Friction is scored</h2>
        <p>
          Per Resident, Friction is {FRICTION_WEIGHTS.opposed} × P(opposed) +{" "}
          {FRICTION_WEIGHTS.anxious} × P(anxious) + {FRICTION_WEIGHTS.lowClarity} ×
          (1 − Clarity/4) + {FRICTION_WEIGHTS.negativeImpact} × max(0, (3 −
          Personal Impact)/3) + {FRICTION_WEIGHTS.mobilization} × P(Mobilization
          Signal). Clarity is on 0..4. Personal Impact is on 0..6, where 3 is no
          change. County Friction is the mean over Residents in that County. A
          Hotspot is a County with Friction above {HOTSPOT_FRICTION} or mean
          Clarity below {HOTSPOT_CLARITY}. The Mobilization Signal is only this
          {` ${FRICTION_WEIGHTS.mobilization * 100}% `}
          input. It is not shown, ranked, or exported.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Data sources</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            KNBS 2019 Kenya Population and Housing Census, Volumes I–IV.{" "}
            <a
              className="underline"
              href="https://www.knbs.or.ke/2019-kenya-population-and-housing-census-results/"
            >
              knbs.or.ke
            </a>
            . Last updated 2019.
          </li>
          <li>
            HDX machine-readable extracts of the same census.{" "}
            <a
              className="underline"
              href="https://data.humdata.org/dataset/kenya-2019-population-and-housing-census-volume-i"
            >
              data.humdata.org
            </a>
            . Last updated 2019.
          </li>
          <li>
            geoBoundaries Kenya ADM1 simplified GeoJSON (CC BY 4.0).{" "}
            <a
              className="underline"
              href="https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/KEN/ADM1/geoBoundaries-KEN-ADM1_simplified.geojson"
            >
              geoBoundaries-KEN-ADM1_simplified.geojson
            </a>
            . Last updated from that release. Rangaza rewound rings on 2026-09-21
            so d3-geo containment works.
          </li>
        </ul>
      </section>
    </main>
  );
}
