import { useTranslation } from 'react-i18next';

import { DATE_FILTERS, type DateFilter } from '../lib/dateFilter';
import { SegmentedControl } from './SegmentedControl';

/** All / Today / Last 7 days — the same native switcher as Current / History, just below it. */
export function HistoryDateFilter({ value, onChange }: { value: DateFilter; onChange: (value: DateFilter) => void }) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      segments={DATE_FILTERS.map((filter) => ({ value: filter, label: t(`historyFilter.${filter}`) }))}
      value={value}
      onChange={onChange}
    />
  );
}
