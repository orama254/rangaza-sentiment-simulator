export function ProvenanceBanner() {
  return (
    <p
      role="status"
      suppressHydrationWarning
      className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:bg-amber-900 dark:text-amber-50"
    >
      Simulated, not measured
    </p>
  );
}
