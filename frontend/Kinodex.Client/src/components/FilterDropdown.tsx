import { useState, useRef, useEffect } from "react";
import { FaFilter, FaArrowLeft, FaCheck } from "react-icons/fa";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterCategory {
  id: string;
  label: string;
  options: FilterOption[];
}

interface FilterDropdownProps {
  categories: FilterCategory[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
}

function FilterDropdown({
  categories,
  selectedFilters,
  onFilterChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<"root" | string>("root");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setCurrentLevel("root");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleCategoryClick = (categoryId: string) => {
    setCurrentLevel(categoryId);
  };

  const handleBack = () => {
    setCurrentLevel("root");
  };

  const handleOptionToggle = (categoryId: string, optionValue: string) => {
    const currentValues = selectedFilters[categoryId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v) => v !== optionValue)
      : [...currentValues, optionValue];

    onFilterChange(categoryId, newValues);
  };

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce(
      (sum, values) => sum + values.length,
      0,
    );
  };

  const activeCount = getActiveFilterCount();
  const currentCategory = categories.find((cat) => cat.id === currentLevel);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white hover:border-gray-500 transition-colors cursor-pointer"
      >
        <FaFilter className="w-4 h-4" />
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="text-sm absolute left-0 mt-2 w-46 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20">
          {currentLevel === "root" ? (
            // Root level - show categories
            <div className="">
              {categories.map((category) => {
                const activeCount = (selectedFilters[category.id] || []).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-white">{category.label}</span>
                    <div className="flex items-center gap-2">
                      {activeCount > 0 && (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full">
                          {activeCount}
                        </span>
                      )}
                      {/* <FaChevronRight className="w-3 h-3 text-gray-400" /> */}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Category level - show options
            <div>
              <div className="border-b border-gray-600">
                <button
                  onClick={handleBack}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FaArrowLeft className="w-3 h-3 text-gray-400" />
                  <span className="text-white font-medium">
                    {currentCategory?.label}
                  </span>
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto truncate">
                {currentCategory?.options.map((option) => {
                  const isSelected = (
                    selectedFilters[currentLevel] || []
                  ).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() =>
                        handleOptionToggle(currentLevel, option.value)
                      }
                      className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span
                        className={`${isSelected ? "text-indigo-400" : "text-white"}`}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <FaCheck className="w-4 h-4 text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
