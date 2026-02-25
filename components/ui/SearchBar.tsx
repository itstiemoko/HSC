import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: { value: string; label: string }[];
  filterAllLabel?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  filterValue,
  onFilterChange,
  filterOptions,
  filterAllLabel = 'Tous',
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-card py-2.5 pl-10 pr-4 text-sm shadow-sm ring-1 ring-edge-soft placeholder:text-ink-dim focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {filterOptions && onFilterChange && (
        <select
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-lg bg-card px-4 py-2.5 text-sm shadow-sm ring-1 ring-edge-soft"
        >
          <option value="all">{filterAllLabel}</option>
          {filterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
