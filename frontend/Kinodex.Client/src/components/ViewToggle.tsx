import type { IconType } from "react-icons";

export interface ViewToggleOption<T extends string> {
  id: T;
  label: string; // Tooltip and screen reader name
  icon: IconType;
}

interface ViewToggleProps<T extends string> {
  value: T;
  options: readonly ViewToggleOption<T>[];
  onChange: (value: T) => void;
}

// Icon pill switch for choosing how a list is shown (table, detail cards, posters), styled
// like the sub-navigation and the Stats switch
function ViewToggle<T extends string>({ value, options, onChange }: ViewToggleProps<T>) {
  return (
    <div className="inline-flex bg-gray-800 rounded-lg p-0.5 shrink-0">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          title={label}
          aria-label={label}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
            value === id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

export default ViewToggle;
