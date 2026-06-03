import React from 'react';

interface Props {
  size?: number;
  className?: string;
  title?: string;
}

/** Sail mark — Vela. Picks up `currentColor`, so set text color on the parent. */
export function VelaLogo({ size = 24, className, title }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d="M18 3 L18 20 L5 20 C7 15 12 9 18 3 Z" />
    </svg>
  );
}
