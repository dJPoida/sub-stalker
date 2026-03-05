"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

type PendingFieldsetProps = {
  children: React.ReactNode;
  className?: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
}: PendingSubmitButtonProps): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function PendingFieldset({ children, className }: PendingFieldsetProps): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <fieldset className={className} disabled={pending}>
      {children}
    </fieldset>
  );
}
