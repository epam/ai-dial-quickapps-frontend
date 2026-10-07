import { FC } from 'react';

export interface OverviewListRow {
  label: string;
  value: string;
}

export interface OverviewListProps {
  rows: OverviewListRow[];
}

/** An Overview tab's label/value rows, as a two-column description list. */
export const OverviewList: FC<OverviewListProps> = ({ rows }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
    {rows.map(({ label, value }) => (
      <div key={label} className="contents">
        <dt className="dial-small-text text-secondary">{label}</dt>
        <dd className="dial-small-text min-w-0 break-words text-primary">{value}</dd>
      </div>
    ))}
  </dl>
);
