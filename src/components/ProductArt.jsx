// Original vector illustrations of construction products, drawn per product
// "kind" and tinted with the product colour. Replace with real photos by
// setting `image` on a product.

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const ink = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 160 ? '#1d1d1f' : '#ffffff';
};

const Shadow = ({ w = 120, y = 178 }) => <ellipse cx="100" cy={y} rx={w / 2} ry="8" fill="rgba(0,0,0,.12)" />;

function Label({ text, y, c, size = 13, w = 70 }) {
  if (!text) return null;
  return (
    <g>
      <rect x={100 - w / 2} y={y - size} width={w} height={size + 8} rx="4" fill="rgba(255,255,255,.88)" />
      <text x="100" y={y + 1} textAnchor="middle" fontSize={size} fontWeight="700" fill={c} fontFamily="-apple-system,system-ui,sans-serif">{text}</text>
    </g>
  );
}

const D = {
  bag: (c, l) => (
    <>
      <Shadow w={130} />
      <path d="M42 46 Q40 36 52 34 L148 34 Q160 36 158 46 L164 160 Q165 174 150 175 L50 175 Q35 174 36 160 Z" fill={c} />
      <path d="M52 34 L148 34 L150 44 L50 44 Z" fill={shade(c, -0.12)} />
      <path d="M44 60 L156 60" stroke={shade(c, -0.1)} strokeWidth="2" />
      <rect x="58" y="76" width="84" height="60" rx="8" fill={shade(c, -0.08)} />
      <clipPath id="brick"><rect x="62" y="80" width="76" height="52" rx="4" /></clipPath>
      <g clipPath="url(#brick)" fill={ink(c)} opacity=".28">
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((k) => (
          <rect key={`${r}${k}`} x={62 + k * 25 - (r % 2 ? 12 : 0)} y={81 + r * 13} width="22" height="10" rx="2" />
        )))}
      </g>
      <Label text={l} y={158} c="#1d1d1f" />
    </>
  ),
  bucket: (c, l) => (
    <>
      <Shadow w={120} />
      <path d="M46 52 L154 52 L146 170 Q100 182 54 170 Z" fill={c} />
      <ellipse cx="100" cy="52" rx="54" ry="12" fill={shade(c, 0.15)} />
      <ellipse cx="100" cy="52" rx="46" ry="8" fill={shade(c, -0.15)} />
      <path d="M48 70 Q100 82 152 70" stroke={shade(c, -0.12)} strokeWidth="3" fill="none" />
      <path d="M50 52 Q100 0 150 52" stroke="#8e8e93" strokeWidth="3" fill="none" />
      <rect x="62" y="92" width="76" height="46" rx="6" fill="rgba(255,255,255,.9)" />
      <circle cx="80" cy="115" r="10" fill={c} /><circle cx="100" cy="115" r="10" fill={shade(c, 0.2)} /><circle cx="120" cy="115" r="10" fill={shade(c, -0.2)} />
      <Label text={l} y={160} c="#1d1d1f" w={56} />
    </>
  ),
  tin: (c, l) => (
    <>
      <Shadow w={90} />
      <rect x="58" y="62" width="84" height="110" rx="6" fill="#c7ccd1" />
      <ellipse cx="100" cy="62" rx="42" ry="9" fill="#e5e5ea" />
      <rect x="58" y="88" width="84" height="56" fill={c} />
      <Label text={l} y={122} c="#1d1d1f" w={60} />
    </>
  ),
  can: (c, l) => (
    <>
      <Shadow w={100} />
      <path d="M60 56 L140 56 L144 168 Q100 178 56 168 Z" fill="#f2f2f7" />
      <rect x="84" y="36" width="32" height="20" rx="4" fill={c} />
      <path d="M118 44 Q146 44 146 70" stroke="#8e8e93" strokeWidth="5" fill="none" />
      <rect x="58" y="86" width="86" height="54" fill={c} />
      <Label text={l} y={160} c="#1d1d1f" w={56} />
    </>
  ),
  tub: (c, l) => (
    <>
      <Shadow w={110} />
      <path d="M52 82 L148 82 L140 168 Q100 176 60 168 Z" fill="#f2f2f7" />
      <rect x="46" y="70" width="108" height="16" rx="6" fill={c} />
      <rect x="62" y="104" width="76" height="34" rx="6" fill={c} opacity=".85" />
      <Label text={l} y={160} c="#1d1d1f" w={56} />
    </>
  ),
  jar: (c, l) => (
    <>
      <Shadow w={100} />
      <rect x="56" y="66" width="88" height="108" rx="14" fill="#f2f2f7" />
      <rect x="64" y="48" width="72" height="22" rx="6" fill={c} />
      <rect x="56" y="96" width="88" height="48" fill={c} />
      <path d="M72 120 h56" stroke={ink(c)} strokeWidth="5" strokeLinecap="round" opacity=".6" />
      <Label text={l} y={166} c="#1d1d1f" w={56} />
    </>
  ),
  sheet: (c, l) => (
    <>
      <Shadow w={160} y={172} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(0 ${-i * 9})`}>
          <path d="M24 150 L120 116 L178 136 L82 170 Z" fill={shade(c, 0.06 - i * 0.03)} />
          <path d="M24 150 L82 170 L82 176 L24 156 Z" fill={shade(c, -0.18)} />
          <path d="M82 170 L178 136 L178 142 L82 176 Z" fill={shade(c, -0.26)} />
        </g>
      ))}
      <path d="M50 112 Q90 100 130 108 M60 122 Q100 110 150 118" stroke={shade(c, -0.12)} strokeWidth="2" fill="none" />
      <Label text={l} y={60} c="#1d1d1f" w={74} />
    </>
  ),
  coil: (c, l) => (
    <>
      <Shadow w={140} />
      <ellipse cx="100" cy="112" rx="66" ry="58" fill={shade(c, -0.15)} />
      {[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx="100" cy="112" rx={66 - i * 6} ry={58 - i * 5} fill="none" stroke={shade(c, i % 2 ? 0.08 : -0.04)} strokeWidth="6" />)}
      <ellipse cx="100" cy="112" rx="26" ry="22" fill="#f5f5f7" />
      <path d="M150 150 Q172 160 176 140" stroke={c} strokeWidth="6" fill="none" strokeLinecap="round" />
      <Label text={l} y={60} c="#1d1d1f" w={74} />
    </>
  ),
  pipe: (c, l) => (
    <>
      <Shadow w={170} y={150} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${i * 22})`}>
          <rect x="20" y="86" width="150" height="18" rx="9" fill={c} />
          <rect x="20" y="88" width="150" height="5" rx="2" fill={shade(c, 0.12)} />
          <ellipse cx="170" cy="95" rx="7" ry="9" fill={shade(c, -0.2)} /><ellipse cx="170" cy="95" rx="4" ry="5" fill="#1d1d1f" opacity=".5" />
        </g>
      ))}
      <Label text={l} y={68} c="#1d1d1f" w={60} />
    </>
  ),
  elbow: (c) => (
    <>
      <Shadow w={110} />
      <path d="M60 170 L60 110 Q60 70 100 70 L160 70" stroke={c} strokeWidth="34" fill="none" />
      <path d="M60 170 L60 110 Q60 70 100 70 L160 70" stroke={shade(c, 0.15)} strokeWidth="6" fill="none" transform="translate(-8 -8)" />
      <ellipse cx="160" cy="70" rx="8" ry="17" fill={shade(c, -0.2)} />
    </>
  ),
  valve: (c) => (
    <>
      <Shadow w={140} />
      <rect x="30" y="110" width="140" height="34" rx="10" fill={c} />
      <rect x="84" y="92" width="32" height="60" rx="8" fill={shade(c, -0.1)} />
      <rect x="70" y="64" width="90" height="16" rx="8" fill="#e5262b" />
      <rect x="94" y="72" width="12" height="24" fill="#8e8e93" />
    </>
  ),
  tank: (c) => (
    <>
      <Shadow w={140} />
      <path d="M44 70 Q44 52 62 52 L138 52 Q156 52 156 70 L156 160 Q156 174 140 174 L60 174 Q44 174 44 160 Z" fill={c} />
      {[78, 104, 130, 156].map((y) => <path key={y} d={`M44 ${y} L156 ${y}`} stroke={shade(c, 0.12)} strokeWidth="3" />)}
      <rect x="80" y="40" width="40" height="14" rx="4" fill={shade(c, 0.1)} />
    </>
  ),
  tap: (c) => (
    <>
      <Shadow w={100} />
      <rect x="86" y="120" width="28" height="54" rx="6" fill={shade(c, -0.08)} />
      <path d="M100 124 L100 78 Q100 60 120 60 L150 60 L150 84" stroke={c} strokeWidth="18" fill="none" strokeLinecap="round" />
      <rect x="70" y="50" width="34" height="12" rx="6" fill={shade(c, -0.15)} />
      <rect x="66" y="166" width="68" height="10" rx="4" fill={shade(c, -0.2)} />
    </>
  ),
  faucet: (c) => (
    <>
      <path d="M70 60 Q60 140 130 150" stroke="#8e8e93" strokeWidth="6" fill="none" />
      <rect x="54" y="40" width="34" height="62" rx="14" fill={c} stroke="#c7ccd1" strokeWidth="3" transform="rotate(-20 71 71)" />
      <circle cx="132" cy="150" r="12" fill="#c7ccd1" />
    </>
  ),
  shower: (c) => (
    <>
      <path d="M100 20 L100 70" stroke="#a1a7ad" strokeWidth="10" />
      <rect x="40" y="70" width="120" height="22" rx="6" fill={c} />
      {[...Array(15)].map((_, i) => <path key={i} d={`M${50 + (i % 5) * 25} ${100 + Math.floor(i / 5) * 22} l-4 12`} stroke="#64d2ff" strokeWidth="3" strokeLinecap="round" />)}
    </>
  ),
  sink: (c) => (
    <>
      <Shadow w={170} />
      <path d="M18 92 L182 92 L170 150 L30 150 Z" fill={shade(c, 0.05)} />
      <path d="M36 98 L164 98 L156 142 L44 142 Z" fill={shade(c, -0.15)} />
      <circle cx="100" cy="128" r="8" fill={shade(c, -0.35)} />
      <path d="M150 92 L150 60 Q150 48 138 48 L120 48" stroke="#a1a7ad" strokeWidth="8" fill="none" strokeLinecap="round" />
    </>
  ),
  fitting: (c) => (
    <>
      <Shadow w={120} />
      <rect x="40" y="96" width="120" height="30" rx="8" fill={c} />
      <rect x="86" y="70" width="28" height="80" rx="6" fill={shade(c, -0.1)} />
      <circle cx="100" cy="64" r="16" fill={shade(c, -0.2)} />
    </>
  ),
  hose: (c) => (
    <>
      <path d="M40 160 Q40 40 100 80 Q160 120 160 40" stroke={c} strokeWidth="14" fill="none" strokeDasharray="4 3" />
      <rect x="28" y="150" width="24" height="24" rx="4" fill="#a1a7ad" /><rect x="148" y="26" width="24" height="24" rx="4" fill="#a1a7ad" />
    </>
  ),
  trap: (c) => (
    <>
      <Shadow w={120} />
      <rect x="40" y="60" width="120" height="120" rx="10" fill={c} />
      {[...Array(5)].map((_, r) => [...Array(5)].map((__, k) => <circle key={`${r}${k}`} cx={60 + k * 20} cy={80 + r * 20} r="5" fill={shade(c, -0.35)} />))}
    </>
  ),
  switch: (c) => (
    <>
      <Shadow w={110} />
      <rect x="50" y="40" width="100" height="130" rx="14" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      <rect x="70" y="62" width="60" height="86" rx="10" fill="#f2f2f7" stroke="#d1d1d6" strokeWidth="2" />
      <circle cx="100" cy="84" r="4" fill="#ff9f0a" />
    </>
  ),
  socket: (c) => (
    <>
      <Shadow w={110} />
      <rect x="50" y="40" width="100" height="130" rx="14" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      <circle cx="100" cy="88" r="7" fill="#1d1d1f" /><circle cx="82" cy="122" r="7" fill="#1d1d1f" /><circle cx="118" cy="122" r="7" fill="#1d1d1f" />
    </>
  ),
  plate: (c) => (
    <>
      <Shadow w={170} />
      <rect x="16" y="64" width="168" height="84" rx="14" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={30 + i * 37} y="78" width="30" height="56" rx="6" fill="#f2f2f7" stroke="#d1d1d6" />)}
    </>
  ),
  mcb: (c) => (
    <>
      <Shadow w={70} />
      <rect x="70" y="30" width="60" height="146" rx="6" fill="#f2f2f7" stroke="#d1d1d6" strokeWidth="2" />
      <rect x="84" y="82" width="32" height="40" rx="4" fill={c} />
      <rect x="78" y="44" width="44" height="12" rx="2" fill="#d1d1d6" /><rect x="78" y="150" width="44" height="12" rx="2" fill="#d1d1d6" />
    </>
  ),
  db: (c) => (
    <>
      <Shadow w={160} />
      <rect x="22" y="40" width="156" height="136" rx="10" fill={c} stroke="#a1a7ad" strokeWidth="3" />
      <rect x="36" y="80" width="128" height="50" rx="4" fill="#3a3a3c" />
      {[...Array(8)].map((_, i) => <rect key={i} x={40 + i * 15.5} y="86" width="12" height="38" rx="2" fill="#f2f2f7" />)}
    </>
  ),
  hinge: (c) => (
    <>
      <Shadow w={140} />
      <circle cx="62" cy="110" r="34" fill={c} stroke={shade(c, -0.2)} strokeWidth="4" />
      <rect x="86" y="96" width="90" height="28" rx="8" fill={shade(c, -0.08)} />
      <circle cx="62" cy="110" r="10" fill={shade(c, -0.25)} /><circle cx="160" cy="110" r="5" fill={shade(c, -0.3)} />
    </>
  ),
  channel: (c) => (
    <>
      <Shadow w={180} />
      <rect x="10" y="96" width="180" height="16" rx="3" fill={c} />
      <rect x="40" y="116" width="150" height="14" rx="3" fill={shade(c, -0.12)} />
      {[30, 80, 130, 170].map((x) => <circle key={x} cx={x} cy="104" r="3" fill={shade(c, -0.35)} />)}
    </>
  ),
  handle: (c) => (
    <>
      <Shadow w={160} />
      <path d="M30 140 L30 100 L170 100 L170 140" stroke={c} strokeWidth="14" fill="none" strokeLinejoin="round" />
    </>
  ),
  drawer: (c) => (
    <>
      <Shadow w={170} />
      <path d="M20 100 L140 70 L184 90 L64 120 Z" fill={shade(c, 0.05)} />
      <path d="M20 100 L64 120 L64 168 L20 148 Z" fill={shade(c, -0.12)} />
      <path d="M64 120 L184 90 L184 138 L64 168 Z" fill={shade(c, -0.05)} />
      <path d="M100 136 L150 124" stroke="#8e8e93" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  basket: (c) => (
    <>
      <Shadow w={170} />
      <rect x="22" y="70" width="156" height="100" rx="8" fill="none" stroke={c} strokeWidth="6" />
      {[...Array(9)].map((_, i) => <path key={i} d={`M${38 + i * 16} 74 L${38 + i * 16} 166`} stroke={c} strokeWidth="4" />)}
    </>
  ),
  strut: (c) => (
    <>
      <path d="M30 150 L130 70" stroke={c} strokeWidth="18" strokeLinecap="round" />
      <path d="M120 78 L170 38" stroke="#c7ccd1" strokeWidth="8" strokeLinecap="round" />
    </>
  ),
  lock: (c) => (
    <>
      <Shadow w={120} />
      <rect x="60" y="30" width="80" height="146" rx="10" fill={c} />
      <path d="M100 80 L170 80" stroke={shade(c, -0.15)} strokeWidth="14" strokeLinecap="round" />
      <circle cx="100" cy="80" r="14" fill={shade(c, 0.1)} />
      <rect x="92" y="126" width="16" height="26" rx="8" fill="#1d1d1f" />
    </>
  ),
  digilock: (c) => (
    <>
      <Shadow w={100} />
      <rect x="64" y="22" width="72" height="156" rx="14" fill={c} />
      {[...Array(9)].map((_, i) => <circle key={i} cx={84 + (i % 3) * 16} cy={52 + Math.floor(i / 3) * 18} r="5" fill="#64d2ff" />)}
      <rect x="80" y="118" width="40" height="40" rx="8" fill="#3a3a3c" />
    </>
  ),
  knob: (c) => (
    <>
      <Shadow w={110} />
      <circle cx="100" cy="104" r="56" fill={shade(c, -0.1)} />
      <circle cx="100" cy="104" r="40" fill={c} />
      <rect x="96" y="96" width="8" height="18" rx="3" fill="#1d1d1f" />
    </>
  ),
  padlock: (c) => (
    <>
      <Shadow w={110} />
      <path d="M68 96 L68 66 Q68 34 100 34 Q132 34 132 66 L132 96" stroke="#a1a7ad" strokeWidth="14" fill="none" />
      <rect x="50" y="92" width="100" height="84" rx="14" fill={c} />
      <circle cx="100" cy="128" r="9" fill="#1d1d1f" />
    </>
  ),
  gibox: (c) => (
    <>
      <Shadow w={160} />
      <path d="M24 96 L130 74 L178 96 L72 118 Z" fill={shade(c, 0.12)} />
      <path d="M24 96 L72 118 L72 164 L24 142 Z" fill={shade(c, -0.12)} />
      <path d="M72 118 L178 96 L178 142 L72 164 Z" fill={c} />
      <circle cx="120" cy="128" r="8" fill={shade(c, -0.3)} />
    </>
  ),
  bulb: (c) => (
    <>
      <circle cx="100" cy="86" r="52" fill={c} stroke="#e5e5ea" strokeWidth="3" />
      <circle cx="100" cy="86" r="70" fill="#ffd60a" opacity=".15" />
      <rect x="78" y="132" width="44" height="34" rx="6" fill="#d1d1d6" />
      <path d="M78 144 h44 M78 154 h44" stroke="#a1a7ad" strokeWidth="3" />
    </>
  ),
  batten: (c) => (
    <>
      <Shadow w={180} y={130} />
      <rect x="10" y="96" width="180" height="20" rx="10" fill={c} stroke="#e5e5ea" strokeWidth="3" />
      <rect x="10" y="84" width="180" height="50" fill="#ffd60a" opacity=".12" />
    </>
  ),
  panel: (c) => (
    <>
      <Shadow w={140} />
      <circle cx="100" cy="100" r="64" fill={c} stroke="#d1d1d6" strokeWidth="6" />
      <circle cx="100" cy="100" r="50" fill="#fff8d6" />
    </>
  ),
  spot: (c) => (
    <>
      <circle cx="100" cy="96" r="54" fill={c} stroke="#d1d1d6" strokeWidth="6" />
      <circle cx="100" cy="96" r="26" fill="#ffd60a" opacity=".7" />
      <circle cx="100" cy="96" r="12" fill="#fff8d6" />
    </>
  ),
  fan: (c) => (
    <>
      <rect x="96" y="20" width="8" height="50" fill="#a1a7ad" />
      {[0, 120, 240].map((a) => <ellipse key={a} cx="100" cy="96" rx="80" ry="12" fill={c} stroke="#d1d1d6" strokeWidth="2" transform={`rotate(${a} 100 96) translate(40 0)`} />)}
      <circle cx="100" cy="96" r="20" fill={shade(c, -0.08)} stroke="#d1d1d6" strokeWidth="3" />
    </>
  ),
  exhaust: (c) => (
    <>
      <rect x="40" y="40" width="120" height="120" rx="16" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      {[0, 90, 180, 270].map((a) => <ellipse key={a} cx="100" cy="100" rx="40" ry="10" fill="#d1d1d6" transform={`rotate(${a + 20} 100 100) translate(22 0)`} />)}
      <circle cx="100" cy="100" r="10" fill="#8e8e93" />
    </>
  ),
  drill: (c) => (
    <>
      <Shadow w={140} />
      <path d="M40 70 L140 70 Q156 70 156 86 L156 100 Q156 110 146 110 L110 110 L100 170 L70 170 L80 110 L40 110 Z" fill={c} />
      <rect x="156" y="82" width="24" height="16" fill="#3a3a3c" /><rect x="178" y="87" width="18" height="6" fill="#a1a7ad" />
      <rect x="66" y="160" width="46" height="16" rx="4" fill="#1d1d1f" />
    </>
  ),
  grinder: (c) => (
    <>
      <Shadow w={170} />
      <rect x="20" y="88" width="120" height="40" rx="18" fill={c} />
      <circle cx="160" cy="118" r="30" fill="#a1a7ad" stroke="#636366" strokeWidth="4" />
      <rect x="140" y="80" width="30" height="20" fill="#3a3a3c" />
    </>
  ),
  box: (c, l) => (
    <>
      <Shadow w={150} />
      <path d="M30 80 L120 60 L172 78 L82 98 Z" fill={shade(c, 0.12)} />
      <path d="M30 80 L82 98 L82 170 L30 152 Z" fill={shade(c, -0.12)} />
      <path d="M82 98 L172 78 L172 150 L82 170 Z" fill={c} />
      <Label text={l} y={138} c="#1d1d1f" w={60} />
    </>
  ),
  screws: (c) => (
    <>
      <Shadow w={140} />
      {[[60, 70, -30], [100, 60, 10], [140, 80, 40], [80, 120, -60], [125, 125, 70]].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - 4} y={y - 10} width="8" height="54" rx="2" fill={c} />
          <rect x={x - 11} y={y - 16} width="22" height="8" rx="3" fill={shade(c, -0.15)} />
          {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${x - 5} ${y + 6 + k * 9} l10 -4`} stroke={shade(c, -0.25)} strokeWidth="2" />)}
        </g>
      ))}
    </>
  ),
  helmet: (c) => (
    <>
      <Shadow w={160} />
      <path d="M36 140 Q36 56 100 52 Q164 56 164 140 Z" fill={c} />
      <path d="M100 52 L100 140" stroke={shade(c, -0.12)} strokeWidth="10" />
      <rect x="20" y="136" width="160" height="16" rx="8" fill={shade(c, -0.1)} />
    </>
  ),
  gloves: (c) => (
    <>
      <path d="M64 176 L64 104 L56 64 Q56 56 64 56 Q72 56 74 66 L80 96 L82 46 Q84 38 92 38 Q100 40 100 48 L100 94 L106 42 Q108 34 116 36 Q124 38 122 48 L118 98 L128 60 Q132 52 140 56 Q146 60 144 68 L132 120 L132 176 Z" fill={c} />
      <rect x="62" y="150" width="72" height="26" fill={shade(c, -0.2)} />
    </>
  ),
  goggles: (c) => (
    <>
      <path d="M20 96 Q20 66 54 66 L146 66 Q180 66 180 96 Q180 130 146 130 L120 130 Q100 112 80 130 L54 130 Q20 130 20 96 Z" fill={c} opacity=".75" stroke="#1d1d1f" strokeWidth="6" />
    </>
  ),
  harness: (c) => (
    <>
      <path d="M70 30 L80 170 M130 30 L120 170 M74 90 L126 90 M78 140 L122 140" stroke={c} strokeWidth="12" strokeLinecap="round" />
      <circle cx="100" cy="64" r="12" fill="none" stroke="#a1a7ad" strokeWidth="6" />
    </>
  ),
  camera: (c) => (
    <>
      <Shadow w={150} />
      <rect x="40" y="70" width="120" height="50" rx="14" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      <circle cx="150" cy="95" r="18" fill="#1d1d1f" /><circle cx="150" cy="95" r="8" fill="#5856d6" />
      <rect x="70" y="120" width="14" height="40" fill="#a1a7ad" /><rect x="50" y="156" width="56" height="10" rx="4" fill="#a1a7ad" />
    </>
  ),
  domecam: (c) => (
    <>
      <Shadow w={120} />
      <path d="M44 120 Q44 56 100 56 Q156 56 156 120 Z" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      <circle cx="100" cy="98" r="22" fill="#1d1d1f" /><circle cx="100" cy="98" r="9" fill="#5856d6" />
      <rect x="36" y="118" width="128" height="14" rx="6" fill="#e5e5ea" />
    </>
  ),
  inverter: (c) => (
    <>
      <Shadow w={150} />
      <rect x="34" y="44" width="132" height="130" rx="12" fill={c} />
      <rect x="54" y="64" width="92" height="36" rx="6" fill="#1d1d1f" />
      <text x="100" y="89" textAnchor="middle" fontSize="16" fill="#30d158" fontFamily="ui-monospace,monospace">230V</text>
      {[0, 1, 2].map((i) => <circle key={i} cx={74 + i * 26} cy="132" r="8" fill={shade(c, -0.2)} />)}
    </>
  ),
  battery: (c) => (
    <>
      <Shadow w={160} />
      <rect x="28" y="60" width="144" height="114" rx="10" fill="#3a3a3c" />
      <rect x="28" y="60" width="144" height="28" rx="10" fill={c} />
      <rect x="50" y="46" width="22" height="16" rx="3" fill="#e5262b" /><rect x="128" y="46" width="22" height="16" rx="3" fill="#1d1d1f" />
    </>
  ),
  geyser: (c) => (
    <>
      <Shadow w={120} />
      <rect x="50" y="26" width="100" height="148" rx="40" fill={c} stroke="#d1d1d6" strokeWidth="3" />
      <circle cx="100" cy="134" r="12" fill="#ff9f0a" />
    </>
  ),
  tube: (c, l) => (
    <>
      <Shadow w={150} />
      <path d="M30 110 L140 80 L150 116 L40 146 Z" fill={c} />
      <path d="M140 80 L170 86 L172 106 L150 116 Z" fill="#c7ccd1" />
      <Label text={l} y={60} c="#1d1d1f" w={56} />
    </>
  ),
  cartridge: (c) => (
    <>
      <Shadow w={160} />
      <rect x="20" y="90" width="130" height="36" rx="6" fill={c} stroke="#c7ccd1" strokeWidth="3" />
      <path d="M150 98 L186 104 L186 112 L150 118 Z" fill="#c7ccd1" />
    </>
  ),
  roller: (c) => (
    <>
      <rect x="40" y="50" width="120" height="44" rx="22" fill={c} />
      <path d="M150 72 L174 72 L174 110 L100 110 L100 130" stroke="#8e8e93" strokeWidth="6" fill="none" />
      <rect x="92" y="128" width="16" height="50" rx="6" fill="#1d1d1f" />
    </>
  ),
  brush: (c) => (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${-40 + i * 40} ${i * 6}) rotate(${-10 + i * 10} 100 100)`}>
          <rect x="88" y="30" width="24" height="70" rx="10" fill={c} />
          <rect x="84" y="100" width="32" height="14" fill="#c7ccd1" />
          <rect x="84" y="114" width="32" height="46" rx="3" fill="#3a3a3c" />
        </g>
      ))}
    </>
  ),
  tape: (c) => (
    <>
      <Shadow w={120} />
      <circle cx="100" cy="104" r="60" fill={c} />
      <circle cx="100" cy="104" r="34" fill="#f5f5f7" stroke={shade(c, -0.2)} strokeWidth="4" />
    </>
  ),
};

export default function ProductIllustration({ kind, color = '#c7ccd1', label }) {
  const draw = D[kind] || D.box;
  return (
    <svg viewBox="0 0 200 200" width="78%" height="78%" role="img" aria-hidden="true" style={{ overflow: 'visible' }}>
      {draw(color, label)}
    </svg>
  );
}

export const KINDS = Object.keys(D);
