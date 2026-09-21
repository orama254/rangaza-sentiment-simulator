import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-start justify-center gap-4 px-8 py-16">
      <p className="text-sm uppercase tracking-wide text-zinc-500">Rangaza</p>
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight">
        Rehearse a public Announcement against simulated Kenyan Residents.
      </h1>
      <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
        Pick a Preset. Paste and URL ingest are stubbed for this sprint.
      </p>
      <Link
        href="/sim/finance-bill-2024"
        className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Finance Bill 2024
      </Link>
      <Link href="/methods" className="text-sm underline">
        Methods
      </Link>
    </main>
  );
}
