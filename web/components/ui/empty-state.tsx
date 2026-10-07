import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex min-h-48 flex-col items-start justify-start border-y border-[var(--color-border-strong)] bg-[var(--color-surface)] py-10 text-left">
      <h2 className="text-[32px] leading-tight font-bold text-[var(--color-text)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
