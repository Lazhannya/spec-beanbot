/**
 * TimezoneSelector Component
 * Provides a grouped dropdown for selecting IANA timezones
 * Integrates with the application's timezone utilities
 */

import { getTimezonesByRegion, getTimezoneFriendlyName, DEFAULT_TIMEZONE } from "../discord-bot/lib/utils/timezone.ts";

interface TimezoneSelectorProps {
  /** Current selected timezone */
  value: string;
  /** Callback when timezone is changed */
  onChange: (timezone: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional label for the selector */
  label?: string;
  /** Whether to show the label */
  showLabel?: boolean;
}

export function TimezoneSelector({
  value = DEFAULT_TIMEZONE,
  onChange,
  className = "",
  disabled = false,
  label = "Timezone",
  showLabel = true,
}: TimezoneSelectorProps) {
  const timezonesByRegion = getTimezonesByRegion();

  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newTimezone = target.value;
    
    // Log timezone selection for debugging
    if (value !== newTimezone) {
      console.log('[TIMEZONE_SELECTOR] Timezone changed', {
        from: value,
        to: newTimezone,
        friendlyName: getTimezoneFriendlyName(newTimezone)
      });
    }
    
    onChange(newTimezone);
  };

  return (
    <div className={`timezone-selector ${className}`}>
      {showLabel && (
        <label 
          htmlFor="timezone-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      
      <select
        id="timezone-select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${disabled ? 'text-gray-500' : 'text-gray-900'}
        `}
      >
        {Object.entries(timezonesByRegion).map(([region, timezones]) => (
          <optgroup key={region} label={region}>
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {getTimezoneFriendlyName(timezone)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {value && (
        <div className="mt-2 text-xs text-gray-500">
          Selected: {getTimezoneFriendlyName(value)}
        </div>
      )}
    </div>
  );
}

export default TimezoneSelector;