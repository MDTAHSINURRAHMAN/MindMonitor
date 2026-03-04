'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export type DateRange = '24h' | '7d' | '30d';

const RANGES: { value: DateRange; label: string }[] = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

interface Props {
  value?: DateRange;
}

export function DateRangePicker({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current: DateRange =
    (value ?? (searchParams.get('range') as DateRange | null)) ?? '24h';

  function handleSelect(range: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1"
      role="group"
      aria-label="Select date range"
    >
      {RANGES.map(({ value: v, label }) => {
        const active = current === v;
        return (
          <button
            key={v}
            onClick={() => handleSelect(v)}
            disabled={isPending}
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-60 ${
              active
                ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
