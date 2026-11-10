import React from 'react';

export const FamiliaLogoEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 64,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Familia+ Logo"
  >
    <defs>
      <linearGradient id="famOuterBg" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#14b8a6" />
        <stop offset="50%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#115e59" />
      </linearGradient>
      <linearGradient id="famLeftArc" x1="12" y1="30" x2="60" y2="105" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="55%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
      <linearGradient id="famRightArc" x1="108" y1="35" x2="55" y2="108" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="55%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="famHeart" x1="45" y1="6" x2="75" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#042f2e" floodOpacity="0.28" />
      </filter>
    </defs>

    {/* Base circle */}
    <circle cx="60" cy="64" r="46" fill="url(#famOuterBg)" filter="url(#softGlow)" />

    {/* Left embracing swoosh */}
    <path
      d="M15 62C15 38 33 22 54 22C36 29 27 45 29 66C31 84 46 96 66 98C40 105 15 87 15 62Z"
      fill="url(#famLeftArc)"
    />

    {/* Right embracing swoosh */}
    <path
      d="M105 64C105 89 83 108 56 108C78 103 91 87 90 66C89 47 75 34 58 31C84 26 105 42 105 64Z"
      fill="url(#famRightArc)"
    />

    {/* Left Adult Head */}
    <circle cx="44" cy="48" r="8.5" fill="#ecfdf5" />
    {/* Right Adult Head */}
    <circle cx="75" cy="51" r="8" fill="#ccfbf1" />
    {/* Center Child Head */}
    <circle cx="60" cy="64" r="6.5" fill="#ffffff" />

    {/* Left Adult Shoulders/Body */}
    <path
      d="M28 84C29 69 36 61 46 61C53 61 57 65 59 72L52 94C38 92 30 88 28 84Z"
      fill="#ffffff"
      fillOpacity="0.92"
    />

    {/* Right Adult Shoulders/Body */}
    <path
      d="M91 84C89 70 82 63 73 63C66 63 62 67 60 73L67 94C80 92 88 88 91 84Z"
      fill="#d1fae5"
      fillOpacity="0.9"
    />

    {/* Center Child Body */}
    <path
      d="M46 95C47 81 53 75 60 75C67 75 73 81 74 95C65 98 55 98 46 95Z"
      fill="#0f766e"
    />
    <path
      d="M50 96C51 84 55 79 60 79C65 79 69 84 70 96C63 98 57 98 50 96Z"
      fill="#ffffff"
    />

    {/* Top Coral/Rose Heart */}
    <path
      d="M60 36C60 36 44 26 44 16.5C44 11.2 48.2 7 53.3 7C56.4 7 58.9 8.6 60 11C61.1 8.6 63.6 7 66.7 7C71.8 7 76 11.2 76 16.5C76 26 60 36 60 36Z"
      fill="url(#famHeart)"
      filter="url(#softGlow)"
    />
  </svg>
);

export const DominicanFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 36 24" fill="none" className={`${className} rounded-[3px] shadow-xs shrink-0`}>
    <rect width="36" height="24" rx="2" fill="#ffffff" />
    <rect x="0" y="0" width="15" height="9.5" fill="#002D62" />
    <rect x="21" y="0" width="15" height="9.5" fill="#CE1126" />
    <rect x="0" y="14.5" width="15" height="9.5" fill="#CE1126" />
    <rect x="21" y="14.5" width="15" height="9.5" fill="#002D62" />
    <circle cx="18" cy="12" r="2.3" fill="#006847" />
    <circle cx="18" cy="12" r="1.3" fill="#fcd116" />
  </svg>
);

export const DoctorAvatarSvg: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} rounded-full shrink-0`}
  >
    <defs>
      <linearGradient id="docBg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ccfbf1" />
        <stop offset="100%" stopColor="#99f6e4" />
      </linearGradient>
    </defs>
    <circle cx="40" cy="40" r="40" fill="url(#docBg)" />
    {/* White Lab Coat & Teal Scrubs */}
    <path d="M12 78C14 59 25 53 40 53C55 53 66 59 68 78H12Z" fill="#ffffff" />
    <path d="M31 53L40 74L49 53H31Z" fill="#0d9488" />
    <path d="M37 56L40 73L43 56L40 53L37 56Z" fill="#115e59" />
    {/* Stethoscope around neck */}
    <path
      d="M27 55C27 65 32 70 40 70C48 70 53 65 53 55"
      stroke="#334155"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="48" cy="67" r="3" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
    {/* Neck & Head */}
    <rect x="34" y="43" width="12" height="12" rx="5" fill="#e0a984" />
    <ellipse cx="40" cy="33" rx="13" ry="15" fill="#ebb896" />
    <circle cx="27" cy="34" r="2.8" fill="#e0a984" />
    <circle cx="53" cy="34" r="2.8" fill="#e0a984" />
    {/* Hair */}
    <path
      d="M27 31C26 21 31 15 41 15C50 15 54 21 53 31C52 25 48 22 40 22C32 22 28 25 27 31Z"
      fill="#2c221e"
    />
    {/* Eyes & Smile */}
    <path d="M32 29Q35 27.5 37 29" stroke="#2c221e" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M43 29Q45 27.5 48 29" stroke="#2c221e" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="34.8" cy="32" r="1.5" fill="#1e293b" />
    <circle cx="45.2" cy="32" r="1.5" fill="#1e293b" />
    <path
      d="M35.5 39.5C37 41.8 43 41.8 44.5 39.5"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M35 39.2C37 42 43 42 45 39.2"
      stroke="#9c5a43"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const ChildAvatarSvg: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} rounded-full shrink-0`}
  >
    <circle cx="32" cy="32" r="32" fill="#d1fae5" />
    <path d="M12 62C14 48 22 44 32 44C42 44 50 48 52 62H12Z" fill="#0d9488" />
    <path d="M24 44L32 52L40 44H24Z" fill="#ffffff" />
    <rect x="27" y="36" width="10" height="10" rx="4" fill="#eab692" />
    <ellipse cx="32" cy="27" rx="11" ry="12.5" fill="#f3c4a3" />
    <path
      d="M21 25C21 16 26 12 33 12C40 12 44 16 43 25C41 20 36 18 32 18C27 18 23 20 21 25Z"
      fill="#3b2820"
    />
    <circle cx="28" cy="27" r="1.4" fill="#1e293b" />
    <circle cx="36" cy="27" r="1.4" fill="#1e293b" />
    <path d="M28.5 33C30 35 34 35 35.5 33" stroke="#9c5a43" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const FamilyPromoPortraitSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 180 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M15 150C17 115 30 104 52 104C72 104 83 115 86 150H15Z" fill="#0f766e" />
    <path d="M40 104L52 126L64 104H40Z" fill="#ccfbf1" />
    <rect x="45" y="90" width="14" height="16" rx="6" fill="#dca481" />
    <ellipse cx="52" cy="74" rx="15" ry="18" fill="#e8b493" />
    <path d="M37 70C37 56 44 51 53 51C63 51 68 57 67 70C64 62 59 59 52 59C45 59 40 62 37 70Z" fill="#29201b" />
    <circle cx="46.5" cy="74" r="1.6" fill="#1e293b" />
    <circle cx="57.5" cy="74" r="1.6" fill="#1e293b" />
    <path d="M47 83C50 86 54 86 57 83" stroke="#8c4f3a" strokeWidth="1.8" strokeLinecap="round" />

    <path d="M88 150C90 116 104 106 125 106C145 106 158 116 162 150H88Z" fill="#f1f5f9" />
    <path d="M104 75C102 95 104 112 108 118H142C146 112 148 95 146 75H104Z" fill="#3a2618" />
    <rect x="119" y="92" width="12" height="15" rx="5" fill="#e5b293" />
    <ellipse cx="125" cy="77" rx="14" ry="16.5" fill="#f0c1a3" />
    <path d="M111 74C111 60 118 55 126 55C135 55 140 61 139 74C136 66 131 63 125 63C118 63 114 66 111 74Z" fill="#3a2618" />
    <circle cx="120" cy="77" r="1.5" fill="#1e293b" />
    <circle cx="130" cy="77" r="1.5" fill="#1e293b" />
    <path d="M121 85C123.5 87.5 126.5 87.5 129 85" stroke="#9e5842" strokeWidth="1.6" strokeLinecap="round" />

    <path d="M62 150C65 126 76 118 92 118C108 118 119 126 122 150H62Z" fill="#fb7185" />
    <rect x="87" y="108" width="10" height="12" rx="4" fill="#eab898" />
    <ellipse cx="92" cy="97" rx="12" ry="13.5" fill="#f4c7aa" />
    <path d="M80 95C80 83 86 79 93 79C100 79 105 84 104 95C101 89 97 86 92 86C86 86 82 89 80 95Z" fill="#312016" />
    <circle cx="87.5" cy="97" r="1.4" fill="#1e293b" />
    <circle cx="96.5" cy="97" r="1.4" fill="#1e293b" />
    <path d="M88 103.5C90 105.5 94 105.5 96 103.5" stroke="#9e5842" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const StethoscopeHeroSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 90 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M24 18V36C24 48.1503 33.8497 58 46 58C58.1503 58 68 48.1503 68 36V18"
      stroke="#0f766e"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
    <circle cx="24" cy="16" r="4" fill="#14b8a6" />
    <circle cx="68" cy="16" r="4" fill="#14b8a6" />
    <path
      d="M46 58V67C46 75.2843 52.7157 82 61 82C69.2843 82 76 75.2843 76 67V50"
      stroke="#0f766e"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
    <circle cx="76" cy="44" r="9.5" fill="#ccfbf1" stroke="#0f766e" strokeWidth="5" />
    <circle cx="76" cy="44" r="3.5" fill="#0d9488" />
  </svg>
);

export const PediatricGrowthChartSvg: React.FC<{
  measurements: { age: number; weight: number }[];
}> = ({ measurements }) => {
  const ageToX = (age: number) => 34 + (age / 10) * 256;
  const weightToY = (w: number) => 132 - ((w - 5) / 50) * 118;

  const patientPoints = measurements.map(
    (m) => `${ageToX(m.age).toFixed(1)},${weightToY(m.weight).toFixed(1)}`
  );
  const patientPath = patientPoints.length > 0 ? `M ${patientPoints.join(' L ')}` : '';

  return (
    <svg viewBox="0 0 305 162" className="w-full h-auto select-none overflow-visible">
      <defs>
        <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#99f6e4" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {[10, 20, 30, 40, 50].map((val) => {
        const y = weightToY(val);
        return (
          <g key={val}>
            <line x1="34" y1={y} x2="292" y2={y} stroke="#e2e8f0" strokeWidth="0.9" />
            <text
              x="26"
              y={y + 3.5}
              textAnchor="end"
              className="fill-slate-500 text-[9.5px] font-medium tabular-nums"
            >
              {val}
            </text>
          </g>
        );
      })}

      {[0, 2, 4, 6, 8, 10].map((age) => {
        const x = ageToX(age);
        return (
          <g key={age}>
            <line x1={x} y1="14" x2={x} y2="132" stroke="#f1f5f9" strokeWidth="0.9" />
            <text
              x={x}
              y="145"
              textAnchor="middle"
              className="fill-slate-500 text-[9.5px] font-medium tabular-nums"
            >
              {age}
            </text>
          </g>
        );
      })}

      <path
        d={`M ${ageToX(0)},${weightToY(18)} Q ${ageToX(4)},${weightToY(31)} ${ageToX(10)},${weightToY(52)} L ${ageToX(10)},${weightToY(24)} Q ${ageToX(4)},${weightToY(16)} ${ageToX(0)},${weightToY(9)} Z`}
        fill="url(#bandFill)"
      />

      <path
        d={`M ${ageToX(0)},${weightToY(17.5)} Q ${ageToX(4.2)},${weightToY(31)} ${ageToX(10)},${weightToY(51.5)}`}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <path
        d={`M ${ageToX(0)},${weightToY(15.2)} Q ${ageToX(4.2)},${weightToY(27.5)} ${ageToX(10)},${weightToY(44.5)}`}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeOpacity="0.8"
      />
      <path
        d={`M ${ageToX(0)},${weightToY(13.0)} Q ${ageToX(4.2)},${weightToY(23.5)} ${ageToX(10)},${weightToY(37.5)}`}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
      />
      <path
        d={`M ${ageToX(0)},${weightToY(11.0)} Q ${ageToX(4.2)},${weightToY(19.5)} ${ageToX(10)},${weightToY(31.0)}`}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />
      <path
        d={`M ${ageToX(0)},${weightToY(9.2)} Q ${ageToX(4.2)},${weightToY(16.5)} ${ageToX(10)},${weightToY(25.5)}`}
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.2"
        strokeOpacity="0.75"
      />

      {patientPath && (
        <path
          d={patientPath}
          fill="none"
          stroke="#0f766e"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {measurements.map((m, idx) => (
        <circle
          key={idx}
          cx={ageToX(m.age)}
          cy={weightToY(m.weight)}
          r="3"
          className="fill-[#0d9488] stroke-white stroke-[1.3]"
        />
      ))}

      <text
        x="163"
        y="158"
        textAnchor="middle"
        className="fill-slate-500 text-[9.5px] font-medium"
      >
        Edad (años)
      </text>
    </svg>
  );
};

export const MonthlySparklineSvg: React.FC<{ points: number[] }> = ({ points }) => {
  const width = 320;
  const height = 44;
  const minVal = 10;
  const maxVal = 85;

  const coords = points.map((val, i) => {
    const x = 10 + (i / (points.length - 1)) * (width - 20);
    const y = height - 6 - ((val - minVal) / (maxVal - minVal)) * (height - 14);
    return { x, y };
  });

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      d += ` C ${cpx1.toFixed(1)},${p0.y.toFixed(1)} ${cpx2.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11 overflow-visible">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {coords.map((pt, idx) => (
        <line
          key={idx}
          x1={pt.x}
          y1={pt.y}
          x2={pt.x}
          y2={height}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="url(#sparkArea)" />
      <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" />
      {coords.map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x}
          cy={pt.y}
          r="3"
          className="fill-[#0d9488] stroke-white stroke-[1.5]"
        />
      ))}
    </svg>
  );
};
