export type ExplainerView = {
  formats: { plain: string; sms: string };
  nextSteps: { action: string; sourceUrl: string }[];
};

export function ExplainerPanel({ explainer }: { explainer: ExplainerView | null }) {
  if (!explainer) {
    return null;
  }
  return (
    <section className="rounded-lg border border-zinc-300 bg-white/90 p-3 text-sm shadow dark:border-zinc-700 dark:bg-zinc-900/90">
      <h2 className="font-medium">Explainer</h2>
      <p className="mt-2 whitespace-pre-wrap">{explainer.formats.plain}</p>
      <p className="mt-2 font-mono text-xs">{explainer.formats.sms}</p>
      <ul className="mt-2 space-y-1">
        {explainer.nextSteps.map((step) => (
          <li key={step.sourceUrl}>
            <a className="underline" href={step.sourceUrl}>
              {step.action}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
