import React from 'react';

export type MacColorPreset =
  | 'teal'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'slate'
  | 'calendar';

export type MacIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<MacIconSize, { box: string; svg: string; radius: string }> = {
  xs: { box: 'w-6 h-6', svg: 'w-3.5 h-3.5', radius: 'rounded-[6.5px]' },
  sm: { box: 'w-7 h-7', svg: 'w-4 h-4', radius: 'rounded-[8px]' },
  md: { box: 'w-8.5 h-8.5', svg: 'w-5 h-5', radius: 'rounded-[9.5px]' },
  lg: { box: 'w-11 h-11', svg: 'w-6 h-6', radius: 'rounded-[12px]' },
  xl: { box: 'w-13 h-13', svg: 'w-7 h-7', radius: 'rounded-[14px]' },
};

const GRADIENT_MAP: Record<MacColorPreset, string> = {
  teal: 'from-[#2dd4bf] via-[#0d9488] to-[#0f766e]',
  emerald: 'from-[#4ade80] via-[#10b981] to-[#059669]',
  blue: 'from-[#60a5fa] via-[#2563eb] to-[#1d4ed8]',
  indigo: 'from-[#818cf8] via-[#4f46e5] to-[#3730a3]',
  purple: 'from-[#c084fc] via-[#9333ea] to-[#6b21a8]',
  rose: 'from-[#fb7185] via-[#e11d48] to-[#be123c]',
  amber: 'from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
  cyan: 'from-[#38bdf8] via-[#0284c7] to-[#0369a1]',
  slate: 'from-[#94a3b8] via-[#475569] to-[#334155]',
  calendar: 'from-[#ffffff] via-[#f8fafc] to-[#e2e8f0]',
};

interface MacSquircleProps {
  preset?: MacColorPreset;
  size?: MacIconSize;
  className?: string;
  children: React.ReactNode;
}

export const MacSquircle: React.FC<MacSquircleProps> = ({
  preset = 'teal',
  size = 'sm',
  className = '',
  children,
}) => {
  const s = SIZE_MAP[size];
  const grad = GRADIENT_MAP[preset];

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none bg-gradient-to-b ${grad} ${s.box} ${s.radius} shadow-[0_2px_5px_rgba(0,0,0,0.18),inset_0_1px_0.5px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.2)] border border-white/15 overflow-hidden ${className}`}
    >
      {/* Top glossy macOS Big Sur / Sequoia specular sheen */}
      <span
        className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <span className={`relative z-10 flex items-center justify-center ${s.svg} drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.25)]`}>
        {children}
      </span>
    </span>
  );
};

// 1. macOS Home / Launchpad Dashboard Icon
export const MacHomeIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="cyan" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M3.5 10.8L11.2 3.8C11.65 3.4 12.35 3.4 12.8 3.8L20.5 10.8"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5V19C5.5 19.83 6.17 20.5 7 20.5H17C17.83 20.5 18.5 19.83 18.5 19V9.5"
        fill="white"
        fillOpacity="0.92"
      />
      <rect x="9.5" y="13.5" width="5" height="7" rx="1.2" fill="#0284c7" />
    </svg>
  </MacSquircle>
);

// 2. macOS Stethoscope / Clinical SOAP Icon
export const MacStethoscopeIcon: React.FC<{
  size?: MacIconSize;
  preset?: MacColorPreset;
  className?: string;
}> = ({ size = 'sm', preset = 'indigo', className }) => (
  <MacSquircle preset={preset} size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M5.5 4.5V9.5C5.5 12.8 8.2 15.5 11.5 15.5C14.8 15.5 17.5 12.8 17.5 9.5V4.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11.5 15.5V17.5C11.5 19.4 13.1 21 15 21C16.9 21 18.5 19.4 18.5 17.5V14"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="12.5" r="2.5" fill="white" />
      <circle cx="5.5" cy="4.5" r="1.5" fill="white" />
      <circle cx="17.5" cy="4.5" r="1.5" fill="white" />
    </svg>
  </MacSquircle>
);

// 3. macOS Contacts / Patients Directory Icon
export const MacPatientsIcon: React.FC<{
  size?: MacIconSize;
  preset?: MacColorPreset;
  className?: string;
}> = ({ size = 'sm', preset = 'teal', className }) => (
  <MacSquircle preset={preset} size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="15.5" cy="8.5" r="3" fill="white" fillOpacity="0.7" />
      <path
        d="M12.5 18.5C12.5 15.8 14.5 14 17 14C19.5 14 21.5 15.8 21.5 18.5"
        fill="white"
        fillOpacity="0.7"
      />
      <circle cx="9.5" cy="8" r="3.6" fill="white" />
      <path
        d="M3 19.2C3 15.6 5.8 13.5 9.5 13.5C13.2 13.5 16 15.6 16 19.2C16 19.7 15.6 20 15 20H4C3.4 20 3 19.7 3 19.2Z"
        fill="white"
      />
    </svg>
  </MacSquircle>
);

// 4. macOS Add New Patient Icon
export const MacNewPatientIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="emerald" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="10" cy="8" r="3.6" fill="white" />
      <path
        d="M3.5 19.2C3.5 15.6 6.3 13.5 10 13.5C13.7 13.5 16.5 15.6 16.5 19.2C16.5 19.7 16.1 20 15.5 20H4.5C3.9 20 3.5 19.7 3.5 19.2Z"
        fill="white"
      />
      <circle cx="18" cy="15" r="4" fill="#064e3b" fillOpacity="0.35" />
      <path
        d="M18 12.5V17.5M15.5 15H20.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  </MacSquircle>
);

// 5. macOS Apple Calendar Style Icon (Red header bar + crisp white calendar face)
export const MacCalendarIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => {
  const s = SIZE_MAP[size];
  return (
    <span
      className={`relative inline-flex flex-col items-center justify-between shrink-0 select-none bg-white ${s.box} ${s.radius} shadow-[0_2px_6px_rgba(0,0,0,0.18),inset_0_-1px_1px_rgba(0,0,0,0.12)] border border-slate-200/90 overflow-hidden ${className || ''}`}
    >
      <span className="w-full h-[32%] bg-gradient-to-b from-[#ff5f57] to-[#e11d48] flex items-center justify-center">
        <span className="text-[6.5px] font-extrabold uppercase tracking-wider text-white leading-none">
          OCT
        </span>
      </span>
      <span className="flex-1 flex items-center justify-center text-[11px] font-extrabold text-slate-900 tabular-nums leading-none pb-0.5">
        02
      </span>
    </span>
  );
};

// 6. macOS Pediatric / Child Growth Icon
export const MacPediatricIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="amber" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="12" cy="7.5" r="3.5" fill="white" />
      <path
        d="M6.5 13.5C8.5 12 15.5 12 17.5 13.5L15.5 15.5V20.5H8.5V15.5L6.5 13.5Z"
        fill="white"
      />
      <circle cx="18.5" cy="6.5" r="2" fill="#fef08a" />
    </svg>
  </MacSquircle>
);

// 7. macOS Notes / Rx Clinical Document Icon
export const MacRxDocIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="blue" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="white" />
      <path d="M8.5 8H15.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12H15.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 16H12.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </MacSquircle>
);

// 8. macOS Medications / 3D Pill Capsule Icon
export const MacPillIcon: React.FC<{
  size?: MacIconSize;
  preset?: MacColorPreset;
  className?: string;
}> = ({ size = 'sm', preset = 'rose', className }) => (
  <MacSquircle preset={preset} size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <g transform="rotate(-45 12 12)">
        <rect x="7.5" y="4" width="9" height="16" rx="4.5" fill="white" />
        <path
          d="M7.5 8.5C7.5 6.01472 9.51472 4 12 4C14.4853 4 16.5 6.01472 16.5 8.5V12H7.5V8.5Z"
          fill="#fda4af"
        />
      </g>
    </svg>
  </MacSquircle>
);

// 9. macOS Apple Health Heart Icon
export const MacHeartIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="rose" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 20.2C12 20.2 4 14.8 4 9.2C4 6.2 6.4 4 9.2 4C10.9 4 12 5 12 5C12 5 13.1 4 14.8 4C17.6 4 20 6.2 20 9.2C20 14.8 12 20.2 12 20.2Z"
        fill="white"
      />
    </svg>
  </MacSquircle>
);

// 10. macOS ECG / Heart Rate Pulse Icon
export const MacPulseIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="teal" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M3 12H7L9.8 6L13.8 18L16.5 12H21"
        stroke="white"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </MacSquircle>
);

// 11. macOS Thermometer Icon
export const MacThermometerIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="amber" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M10 5.5C10 4.4 10.9 3.5 12 3.5C13.1 3.5 14 4.4 14 5.5V13.2C15.2 14 16 15.3 16 16.8C16 19.1 14.2 21 12 21C9.8 21 8 19.1 8 16.8C8 15.3 8.8 14 10 13.2V5.5Z"
        fill="white"
      />
      <circle cx="12" cy="16.8" r="2" fill="#e11d48" />
    </svg>
  </MacSquircle>
);

// 12. macOS Scale / Anthropometry Icon
export const MacScaleIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="cyan" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="16" height="16" rx="4" fill="white" />
      <path
        d="M8.5 10.5C10.5 8.5 13.5 8.5 15.5 10.5"
        stroke="#0284c7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 11L13.8 8.5" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </MacSquircle>
);

// 13. macOS Glucose / Blood Lab Icon
export const MacGlucoseIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="emerald" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 3.5C12 3.5 6.5 10.2 6.5 14.5C6.5 17.8 9 20.5 12 20.5C15 20.5 17.5 17.8 17.5 14.5C17.5 10.2 12 3.5 12 3.5Z"
        fill="white"
      />
      <path
        d="M10 14.5H14M12 12.5V16.5"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </MacSquircle>
);

// 14. macOS Reminders / CIE-10 Checklist Icon
export const MacClipboardIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="teal" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="5" y="4" width="14" height="16" rx="2.5" fill="white" />
      <path
        d="M8.5 10.5L10.5 12.5L15.5 7.5"
        stroke="#0d9488"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 16H15.5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </MacSquircle>
);

// 15. macOS Notifications Bell Icon
export const MacBellIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="rose" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 4C8.9 4 6.5 6.5 6.5 9.8V14L4.8 16.2C4.4 16.7 4.8 17.5 5.5 17.5H18.5C19.2 17.5 19.6 16.7 19.2 16.2L17.5 14V9.8C17.5 6.5 15.1 4 12 4Z"
        fill="white"
      />
      <circle cx="12" cy="19.5" r="2" fill="#fecdd3" />
    </svg>
  </MacSquircle>
);

// 16. macOS Analytics / Statistics Chart Icon
export const MacChartIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'xs',
  className,
}) => (
  <MacSquircle preset="indigo" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="5" y="13" width="3.2" height="6.5" rx="1" fill="white" fillOpacity="0.75" />
      <rect x="10.4" y="9" width="3.2" height="10.5" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="15.8" y="5" width="3.2" height="14.5" rx="1" fill="white" />
    </svg>
  </MacSquircle>
);

// 17. macOS Syringe / Vaccine PAI Icon
export const MacSyringeIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="purple" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M14.5 5.5L18.5 9.5L9.5 18.5L5.5 14.5L14.5 5.5Z"
        fill="white"
      />
      <path
        d="M16.5 3.5L20.5 7.5M18.5 5.5L16.5 7.5M5.5 18.5L3.5 20.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </MacSquircle>
);

// 18. macOS Home Visit / Consulta a Domicilio Icon (House + Medical Cross + Route Pin)
export const MacHomeVisitIcon: React.FC<{ size?: MacIconSize; className?: string }> = ({
  size = 'sm',
  className,
}) => (
  <MacSquircle preset="emerald" size={size} className={className}>
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M4 11.2L12 4.5L20 11.2V19.2C20 19.8 19.5 20.2 18.9 20.2H5.1C4.5 20.2 4 19.8 4 19.2V11.2Z"
        fill="white"
      />
      <path
        d="M12 9.5V15.5M9 12.5H15"
        stroke="#059669"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  </MacSquircle>
);

