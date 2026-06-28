interface Opt {
  value: string;
  label: string;
}

export default function ChipGroup({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: {
  label: string;
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  scroll?: boolean;
}) {
  return (
    <div className="grid gap-2.5">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-gold2">{label}</span>
      <div className={`flex gap-2 ${scroll ? 'flex-nowrap overflow-x-auto no-scrollbar pb-1' : 'flex-wrap'}`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                on
                  ? 'border-ink bg-ink text-paper shadow-soft'
                  : 'border-[#e4d8c2] bg-white text-ink2 hover:border-gold hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
