export default function GuideSteps({ eyebrow, title, note, steps }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
          {eyebrow}
        </p>
        <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          {title}
        </h1>
      </div>

      {note && (
        <p className="w-full max-w-sm rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          {note}
        </p>
      )}

      <ol className="flex w-full max-w-sm flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
              {index + 1}
            </span>
            <span className="text-xl" aria-hidden>
              {step.icon}
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              {step.title}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
