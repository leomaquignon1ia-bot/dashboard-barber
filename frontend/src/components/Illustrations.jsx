// SVG components for the app: hair texture, cut type silhouettes (3/4 face, no face), barber chair.

export const HairTextureIcon = ({ type, size = 56 }) => {
  const stroke = "currentColor";
  const common = { width: size, height: size, viewBox: "0 0 64 64", fill: "none", stroke, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "lisses") return (
    <svg {...common}><path d="M16 20 L16 50 M22 20 L22 50 M28 20 L28 50 M34 20 L34 50 M40 20 L40 50 M46 20 L46 50"/><path d="M14 20 Q32 8 50 20"/></svg>
  );
  if (type === "ondules") return (
    <svg {...common}><path d="M16 22 Q19 28 16 34 Q13 40 16 46 M24 22 Q27 28 24 34 Q21 40 24 46 M32 22 Q35 28 32 34 Q29 40 32 46 M40 22 Q43 28 40 34 Q37 40 40 46 M48 22 Q51 28 48 34 Q45 40 48 46"/></svg>
  );
  if (type === "boucles") return (
    <svg {...common}>{[...Array(12)].map((_,i)=>(
      <circle key={i} cx={16+(i%4)*11} cy={22+Math.floor(i/4)*10} r="4"/>
    ))}</svg>
  );
  // crepus
  return (
    <svg {...common}>{[...Array(20)].map((_,i)=>(
      <circle key={i} cx={14+(i%5)*9} cy={20+Math.floor(i/5)*8} r="2.5"/>
    ))}</svg>
  );
};

// Silhouette 3/4 face (no face features), with fade variant indicated by side gradient lines.
export const CutSilhouette = ({ variant = "classique", texture = "lisses", size = 110 }) => {
  const stroke = "currentColor";
  const common = { width: size, height: size, viewBox: "0 0 120 120", fill: "none", stroke, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

  // Head + neck shape (3/4 face, no facial features)
  const Head = () => (
    <>
      <path d="M40 78 C 38 60 42 38 60 32 C 80 28 90 44 90 60 C 90 70 86 78 80 84" />
      <path d="M80 84 L78 96 L86 102 L60 110 L46 102 L48 92" />
      <path d="M40 78 Q 42 86 48 92" />
    </>
  );

  // Texture overlay on top of head
  const TextureOverlay = () => {
    if (texture === "boucles") return <>{[...Array(8)].map((_,i)=>(<circle key={i} cx={48+(i%4)*10} cy={32+Math.floor(i/4)*8} r="3"/>))}</>;
    if (texture === "crepus") return <>{[...Array(14)].map((_,i)=>(<circle key={i} cx={44+(i%5)*8} cy={30+Math.floor(i/5)*7} r="1.8"/>))}</>;
    if (texture === "ondules") return <path d="M44 34 Q48 38 44 42 M52 34 Q56 38 52 42 M60 34 Q64 38 60 42 M68 34 Q72 38 68 42 M76 34 Q80 38 76 42"/>;
    return <path d="M44 34 L44 44 M50 33 L50 45 M56 32 L56 46 M62 32 L62 46 M68 33 L68 45 M74 34 L74 44"/>;
  };

  // Fade lines on side (varies by variant)
  const FadeLines = () => {
    if (variant === "degrade_bas") return <><path d="M40 78 L40 88" opacity="0.35"/><path d="M42 84 L42 92" opacity="0.6"/></>;
    if (variant === "degrade_haut") return <><path d="M42 60 L42 76" opacity="0.35"/><path d="M44 56 L44 72" opacity="0.6"/></>;
    if (variant === "taper") return <><path d="M44 86 L44 96" opacity="0.5"/><path d="M48 92 L48 100" opacity="0.7"/></>;
    return null;
  };

  return (
    <svg {...common}>
      <Head />
      <TextureOverlay />
      <FadeLines />
    </svg>
  );
};

// Stylised barber chair SVG, colored by status
export const BarberChair = ({ color = "#9CA3AF", size = 90, label, count }) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* head rest */}
        <rect x="38" y="14" width="24" height="14" rx="3" fill={color} opacity="0.9"/>
        {/* backrest */}
        <rect x="30" y="28" width="40" height="30" rx="6" fill={color}/>
        {/* seat */}
        <rect x="22" y="58" width="56" height="14" rx="4" fill={color} opacity="0.85"/>
        {/* armrests */}
        <rect x="16" y="50" width="8" height="22" rx="3" fill={color} opacity="0.7"/>
        <rect x="76" y="50" width="8" height="22" rx="3" fill={color} opacity="0.7"/>
        {/* base */}
        <rect x="44" y="72" width="12" height="14" fill={color}/>
        <rect x="28" y="84" width="44" height="6" rx="2" fill={color}/>
      </svg>
      <div className="text-xs font-semibold tracking-tight">{label}</div>
      {typeof count === "number" && (
        <div className="text-[10px] label-uppercase" style={{ color }}>{count} en attente</div>
      )}
    </div>
  );
};
