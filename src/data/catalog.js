// Product catalog used in demo mode and as the seed for the live database.
// Prices are illustrative placeholders in INR — update them (or the `products`
// table in Supabase) before launch.

export const categories = [
  { id: 'cement', name: 'Cement', icon: 'Package', tint: '#8e8e93', blurb: 'OPC & PPC bags, white cement, ready mixes' },
  { id: 'tiling', name: 'Tiling', icon: 'Grid3x3', tint: '#5e5ce6', blurb: 'Tile adhesives, grouts, spacers & tools' },
  { id: 'painting', name: 'Painting', icon: 'PaintRoller', tint: '#ff375f', blurb: 'Emulsions, primers, putty, rollers & brushes' },
  { id: 'waterproofing', name: 'Waterproofing', icon: 'Droplets', tint: '#0a84ff', blurb: 'Coatings, admixtures & sealants' },
  { id: 'plywood', name: 'Plywood, MDF & HDHMR', icon: 'Layers', tint: '#bf8a54', blurb: 'BWP / MR ply, MDF, HDHMR & laminates' },
  { id: 'adhesives', name: 'Adhesives', icon: 'Pipette', tint: '#ff9f0a', blurb: 'Wood adhesives, epoxies & sealants' },
  { id: 'wires', name: 'Wires, MCB & DBs', icon: 'Cable', tint: '#ff453a', blurb: 'FR / FRLS wires, MCBs, RCCBs & boards' },
  { id: 'switches', name: 'Switches & Sockets', icon: 'ToggleRight', tint: '#64d2ff', blurb: 'Modular switches, sockets & plates' },
  { id: 'lighting', name: 'Lighting', icon: 'Lightbulb', tint: '#ffd60a', blurb: 'LED bulbs, battens, panels & strips' },
  { id: 'fans', name: 'Ceiling Fans', icon: 'Fan', tint: '#30d158', blurb: 'BLDC & regular ceiling fans' },
  { id: 'conduits', name: 'Conduits & Boxes', icon: 'Route', tint: '#ac8e68', blurb: 'PVC conduits, bends & GI boxes' },
  { id: 'pipes', name: 'Pipes & Tanks', icon: 'Waves', tint: '#40c8e0', blurb: 'CPVC / UPVC pipes, fittings & tanks' },
  { id: 'sanitary', name: 'Sanitary & Bath', icon: 'ShowerHead', tint: '#66d4cf', blurb: 'Taps, showers, health faucets & fittings' },
  { id: 'kitchen', name: 'Kitchen Sinks & Faucets', icon: 'CookingPot', tint: '#ff6482', blurb: 'Steel & quartz sinks, sink mixers' },
  { id: 'hinges', name: 'Hinges & Handles', icon: 'DoorOpen', tint: '#a2845e', blurb: 'Soft-close hinges, channels & handles' },
  { id: 'kitchen-systems', name: 'Kitchen & Wardrobe Systems', icon: 'Archive', tint: '#bf5af2', blurb: 'Baskets, tandem boxes, wardrobe fittings' },
  { id: 'locks', name: 'Door Locks', icon: 'Lock', tint: '#636366', blurb: 'Mortise, digital & cylindrical locks' },
  { id: 'tools', name: 'Power Tools', icon: 'Drill', tint: '#ff9f0a', blurb: 'Drills, grinders, saws & accessories' },
  { id: 'hardware', name: 'General Hardware', icon: 'Wrench', tint: '#8e8e93', blurb: 'Screws, anchors, nails & fasteners' },
  { id: 'safety', name: 'Safety Gear', icon: 'HardHat', tint: '#ffcc00', blurb: 'Helmets, gloves, goggles & harnesses' },
  { id: 'cctv', name: 'CCTV & Security', icon: 'Cctv', tint: '#5856d6', blurb: 'Cameras, DVR/NVR kits & doorbells' },
  { id: 'power-backup', name: 'Power Backup', icon: 'BatteryCharging', tint: '#34c759', blurb: 'Inverters, batteries & stabilisers' },
];

// [id, name, brand, unit, price, mrp, opts]
// opts: { v: [[label, price, mrp]], specs: {}, nr: true (non-returnable), heavy: true, tag }
const raw = {
  cement: [
    ['ultratech-opc-53', 'OPC 53 Grade Cement', 'UltraTech', '50 kg bag', 420, 470, { heavy: true, tag: 'Bestseller', specs: { Grade: 'OPC 53', Weight: '50 kg', Use: 'RCC, slabs, columns' } }],
    ['ultratech-ppc', 'PPC Cement', 'UltraTech', '50 kg bag', 395, 445, { heavy: true, specs: { Grade: 'PPC', Weight: '50 kg', Use: 'Plastering, masonry' } }],
    ['acc-gold-wpc', 'Gold Water Shield Cement', 'ACC', '50 kg bag', 455, 500, { heavy: true, specs: { Type: 'Water-repellent PPC', Weight: '50 kg' } }],
    ['dalmia-dsp', 'DSP Cement', 'Dalmia', '50 kg bag', 440, 490, { heavy: true, specs: { Type: 'Composite', Weight: '50 kg' } }],
    ['birla-white', 'White Cement', 'Birla White', '', 0, 0, { v: [['1 kg', 65, 75], ['5 kg', 290, 330], ['40 kg', 1950, 2200]], specs: { Use: 'Joints, finishing, decorative' } }],
    ['ready-plaster', 'Ready Mix Plaster', 'UltraTech', '40 kg bag', 360, 410, { heavy: true, specs: { Coverage: '~2.2 m² at 12 mm' } }],
  ],
  tiling: [
    ['tile-adhesive-t1', 'Tile Adhesive Type 1', 'Roff', '20 kg bag', 499, 590, { heavy: true, tag: 'Bestseller', specs: { Use: 'Floor & wall, ceramic tiles', Coverage: '~4 m²' } }],
    ['tile-adhesive-t3', 'Tile Adhesive Type 3 (Large Format)', 'MYK Laticrete', '20 kg bag', 849, 980, { heavy: true, specs: { Use: 'Vitrified & large tiles, wall-on-wall' } }],
    ['epoxy-grout', 'Epoxy Grout (Stain-proof)', 'MYK Laticrete', '1 kg kit', 749, 860, { v: [['1 kg', 749, 860], ['5 kg', 3450, 3990]], nr: true, specs: { Finish: 'Glossy', Colours: 'Selectable on delivery' } }],
    ['cement-grout', 'Cement Tile Grout', 'Roff', '1 kg', 89, 110, { specs: { Joint: 'Up to 3 mm' } }],
    ['tile-spacer', 'Tile Spacers 2 mm', 'Generic', 'Pack of 200', 99, 140, { specs: { Size: '2 mm' } }],
    ['tile-levelling', 'Tile Levelling Clips + Wedges', 'Generic', 'Pack of 100', 449, 600, {}],
  ],
  painting: [
    ['ap-tractor-emulsion', 'Interior Emulsion — Smooth', 'Asian Paints', '', 0, 0, { tag: 'Bestseller', v: [['1 L', 280, 320], ['4 L', 1050, 1210], ['10 L', 2490, 2860], ['20 L', 4790, 5480]], nr: true, specs: { Finish: 'Matt', Coverage: '~13 m²/L (2 coats)' } }],
    ['ap-apex-exterior', 'Exterior Emulsion — Weatherproof', 'Asian Paints', '', 0, 0, { v: [['4 L', 1690, 1940], ['10 L', 3990, 4590], ['20 L', 7790, 8950]], nr: true, specs: { Finish: 'Low sheen', Warranty: '5 years' } }],
    ['berger-primer', 'Interior Wall Primer', 'Berger', '', 0, 0, { v: [['4 L', 690, 790], ['10 L', 1590, 1830], ['20 L', 2990, 3440]], specs: { Base: 'Water' } }],
    ['birla-putty', 'Wall Care Putty', 'Birla Opus', '', 0, 0, { heavy: true, v: [['5 kg', 340, 395], ['20 kg', 920, 1060], ['40 kg', 1690, 1940]], specs: { Coverage: '~1 m²/kg (2 coats)' } }],
    ['roller-9', 'Paint Roller 9"', 'Generic', 'Each', 199, 260, {}],
    ['brush-set', 'Paint Brush Set (1", 2", 4")', 'Generic', 'Set of 3', 249, 320, {}],
    ['masking-tape', 'Masking Tape 1"', 'Generic', 'Roll', 59, 80, {}],
    ['enamel', 'Gloss Enamel', 'Asian Paints', '', 0, 0, { v: [['500 ml', 240, 275], ['1 L', 450, 515], ['4 L', 1690, 1940]], nr: true, specs: { Use: 'Wood & metal' } }],
  ],
  waterproofing: [
    ['dr-fixit-lw', 'Liquid Waterproofing Admixture', 'Dr. Fixit', '', 0, 0, { tag: 'Bestseller', v: [['1 L', 175, 200], ['5 L', 790, 905], ['20 L', 2890, 3320]], specs: { Dosage: '200 ml per 50 kg cement' } }],
    ['dr-fixit-roofseal', 'Roof Waterproofing Coating', 'Dr. Fixit', '', 0, 0, { v: [['4 L', 1690, 1940], ['10 L', 3990, 4590], ['20 L', 7690, 8840]], nr: true, specs: { Coverage: '~1.4 m²/L (2 coats)' } }],
    ['bathseal', 'Bathroom Tile-joint Sealer', 'Dr. Fixit', '1 L', 690, 795, {}],
    ['sbr-latex', 'SBR Latex Bonding Agent', 'Fosroc', '', 0, 0, { v: [['1 kg', 330, 380], ['5 kg', 1490, 1715]], specs: { Use: 'Bonding coat, repair mortar' } }],
    ['crack-filler', 'Crack Filler Paste', 'Dr. Fixit', '1 kg', 260, 300, {}],
  ],
  plywood: [
    ['bwp-ply-18', 'BWP Marine Plywood 18 mm', 'Century', '8 × 4 ft sheet', 3950, 4600, { heavy: true, tag: 'Bestseller', specs: { Grade: 'IS 710 BWP', Thickness: '18 mm' } }],
    ['mr-ply-18', 'MR Plywood 18 mm', 'Greenply', '8 × 4 ft sheet', 2650, 3100, { heavy: true, specs: { Grade: 'IS 303 MR', Thickness: '18 mm' } }],
    ['bwp-ply-12', 'BWP Plywood 12 mm', 'Century', '8 × 4 ft sheet', 2890, 3350, { heavy: true, specs: { Thickness: '12 mm' } }],
    ['mdf-18', 'Interior MDF 18 mm', 'Action Tesa', '8 × 4 ft sheet', 1890, 2200, { heavy: true, specs: { Thickness: '18 mm' } }],
    ['hdhmr-18', 'HDHMR Board 18 mm', 'Action Tesa', '8 × 4 ft sheet', 2690, 3100, { heavy: true, specs: { Thickness: '18 mm', Use: 'Kitchen shutters, wardrobes' } }],
    ['laminate-1mm', 'Decorative Laminate 1 mm', 'Merino', '8 × 4 ft sheet', 1190, 1400, { nr: true, specs: { Finish: 'Suede / Gloss (choose on call)' } }],
    ['ply-cut', 'Cut-to-size Plywood (per sq ft)', 'Century', 'per sq ft', 128, 150, { nr: true, specs: { Note: 'Share dimensions after ordering' } }],
  ],
  adhesives: [
    ['fevicol-sh', 'Synthetic Resin Wood Adhesive', 'Fevicol', '', 0, 0, { tag: 'Bestseller', v: [['1 kg', 320, 365], ['5 kg', 1490, 1700], ['10 kg', 2890, 3300]] }],
    ['fevicol-marine', 'Waterproof Wood Adhesive', 'Fevicol', '', 0, 0, { v: [['1 kg', 450, 520], ['5 kg', 2150, 2470]] }],
    ['araldite', 'Epoxy Adhesive Standard', 'Araldite', '180 g', 260, 300, {}],
    ['silicone', 'Silicone Sealant (Clear)', 'Anabond', '280 ml', 290, 340, {}],
    ['m-seal', 'Epoxy Putty', 'M-Seal', '100 g', 75, 90, {}],
  ],
  wires: [
    ['polycab-frls-1-5', 'FRLS Wire 1.5 sq mm', 'Polycab', '90 m coil', 1690, 2190, { tag: 'Bestseller', v: [['Red', 1690, 2190], ['Black', 1690, 2190], ['Green', 1690, 2190], ['Yellow', 1690, 2190], ['Blue', 1690, 2190]], specs: { Length: '90 m', Rating: '1100 V' } }],
    ['polycab-frls-2-5', 'FRLS Wire 2.5 sq mm', 'Polycab', '90 m coil', 2690, 3450, { v: [['Red', 2690, 3450], ['Black', 2690, 3450], ['Green', 2690, 3450]] }],
    ['havells-frls-4', 'FRLS Wire 4 sq mm', 'Havells', '90 m coil', 4290, 5450, {}],
    ['mcb-sp-16', 'MCB Single Pole 16 A', 'Havells', 'Each', 195, 260, { v: [['6 A', 195, 260], ['16 A', 195, 260], ['32 A', 210, 280]], specs: { Curve: 'C' } }],
    ['rccb-dp-40', 'RCCB Double Pole 40 A 30 mA', 'Legrand', 'Each', 2290, 2950, {}],
    ['db-8way', 'Distribution Board 8-way SPN', 'Schneider', 'Each', 1290, 1650, {}],
  ],
  switches: [
    ['switch-6a', 'Modular Switch 6 A (1-way)', 'Legrand', 'Each', 59, 75, { tag: 'Bestseller' }],
    ['socket-6a', 'Modular Socket 6 A', 'Legrand', 'Each', 129, 160, {}],
    ['socket-16a', 'Modular Socket 16 A', 'Legrand', 'Each', 199, 245, {}],
    ['plate-8m', 'Cover Plate 8 Module', 'Legrand', 'Each', 299, 370, { v: [['White', 299, 370], ['Graphite', 349, 430]] }],
    ['usb-socket', 'USB-C + A Charger Module', 'Anchor', 'Each', 990, 1250, {}],
    ['fan-regulator', 'Fan Regulator Step-type', 'Anchor', 'Each', 349, 430, {}],
  ],
  lighting: [
    ['led-bulb-9w', 'LED Bulb 9 W Cool Day', 'Philips', 'Each', 89, 120, { tag: 'Bestseller', v: [['9 W', 89, 120], ['12 W', 129, 170], ['20 W', 249, 330]] }],
    ['led-batten-20w', 'LED Batten 20 W 4 ft', 'Wipro', 'Each', 299, 420, {}],
    ['panel-15w', 'Recessed LED Panel 15 W Round', 'Havells', 'Each', 399, 560, { v: [['Cool white', 399, 560], ['Warm white', 399, 560]] }],
    ['cob-7w', 'COB Spotlight 7 W', 'Philips', 'Each', 449, 620, {}],
    ['strip-5m', 'LED Strip 5 m (with driver)', 'Wipro', 'Set', 990, 1390, {}],
  ],
  fans: [
    ['bldc-fan-1200', 'BLDC Ceiling Fan 1200 mm (Remote)', 'Atomberg', 'Each', 3690, 5190, { heavy: true, tag: 'Bestseller', v: [['White', 3690, 5190], ['Matt Black', 3790, 5290]], specs: { Power: '28 W', Warranty: '2 + 3 years' } }],
    ['fan-1200', 'Ceiling Fan 1200 mm', 'Crompton', 'Each', 1790, 2390, { heavy: true }],
    ['fan-900', 'Ceiling Fan 900 mm', 'Havells', 'Each', 1690, 2250, { heavy: true }],
    ['exhaust-fan', 'Exhaust Fan 150 mm', 'Havells', 'Each', 990, 1290, {}],
  ],
  conduits: [
    ['pvc-conduit-20', 'PVC Conduit Pipe 20 mm', 'Precision', '3 m length', 49, 65, { tag: 'Bestseller', v: [['20 mm', 49, 65], ['25 mm', 69, 90]] }],
    ['conduit-bend', 'PVC Conduit Bend 20 mm', 'Precision', 'Pack of 10', 70, 95, {}],
    ['gi-box-8m', 'GI Modular Box 8 Module', 'Generic', 'Each', 85, 110, { v: [['1/2 module', 45, 60], ['3 module', 55, 75], ['6 module', 75, 95], ['8 module', 85, 110], ['12 module', 115, 150]] }],
    ['junction-box', 'Round Junction Box 20 mm', 'Precision', 'Pack of 10', 120, 160, {}],
  ],
  pipes: [
    ['cpvc-pipe-1', 'CPVC Pipe 1" SDR 11', 'Astral', '3 m length', 690, 820, { tag: 'Bestseller', v: [['1/2"', 290, 345], ['3/4"', 450, 535], ['1"', 690, 820]] }],
    ['cpvc-elbow', 'CPVC Elbow 90°', 'Astral', 'Pack of 10', 95, 120, { v: [['1/2"', 95, 120], ['3/4"', 150, 190], ['1"', 240, 300]] }],
    ['upvc-pipe-4', 'UPVC/SWR Pipe 4"', 'Supreme', '3 m length', 690, 830, {}],
    ['solvent-cement', 'CPVC Solvent Cement', 'Astral', '118 ml', 199, 245, {}],
    ['tank-1000', 'Overhead Water Tank 1000 L (3-layer)', 'Sintex', 'Each', 7490, 8990, { heavy: true, specs: { Capacity: '1000 L', Layers: '3' } }],
  ],
  sanitary: [
    ['pillar-tap', 'Pillar Cock (Chrome)', 'Jaquar', 'Each', 1290, 1650, { tag: 'Bestseller' }],
    ['health-faucet', 'Health Faucet with Hose', 'Hindware', 'Set', 790, 1050, {}],
    ['overhead-shower', 'Overhead Shower 8" Square', 'Jaquar', 'Each', 1890, 2450, {}],
    ['angle-valve', 'Angle Valve (Chrome)', 'Cera', 'Each', 390, 495, {}],
    ['connection-pipe', 'Braided Connection Pipe 18"', 'Generic', 'Each', 149, 199, {}],
    ['floor-trap', 'Anti-cockroach Floor Trap 5"', 'Generic', 'Each', 249, 320, {}],
  ],
  kitchen: [
    ['ss-sink-24', 'Stainless Steel Sink 24 × 18"', 'Nirali', 'Each', 3490, 4650, { heavy: true, tag: 'Bestseller' }],
    ['quartz-sink', 'Quartz Single Bowl Sink 32 × 18"', 'Carysil', 'Each', 9990, 13500, { heavy: true }],
    ['sink-mixer', 'Sink Mixer Wall-mounted', 'Jaquar', 'Each', 2690, 3450, {}],
    ['sink-coupling', 'Sink Coupling with Waste Pipe', 'Generic', 'Set', 299, 390, {}],
  ],
  hinges: [
    ['hinge-softclose', 'Soft-close Hinge (Full overlay)', 'Hettich', 'Pair', 349, 460, { tag: 'Bestseller', v: [['Full overlay', 349, 460], ['Half overlay', 349, 460], ['Inset', 349, 460]] }],
    ['channel-18', 'Telescopic Channel 18"', 'Ebco', 'Pair', 399, 520, { v: [['12"', 299, 390], ['18"', 399, 520], ['24"', 499, 650]] }],
    ['handle-profile', 'Aluminium Profile Handle 8"', 'Generic', 'Each', 149, 220, { v: [['Black', 149, 220], ['Gold', 179, 260], ['Steel', 149, 220]] }],
    ['tower-bolt', 'Tower Bolt 6" (SS)', 'Generic', 'Each', 129, 170, {}],
  ],
  'kitchen-systems': [
    ['tandem-box', 'Tandem Drawer Box 500 mm', 'Hettich', 'Set', 3990, 5200, { tag: 'Bestseller' }],
    ['cutlery-basket', 'Cutlery Basket 15 × 20"', 'Ebco', 'Each', 1890, 2450, {}],
    ['plate-basket', 'Plain Plate Basket 15 × 20"', 'Ebco', 'Each', 1690, 2190, {}],
    ['wardrobe-lift', 'Wardrobe Pull-down Lift', 'Hafele', 'Each', 6490, 8200, {}],
    ['gas-strut', 'Gas Lift Strut 100 N', 'Ebco', 'Pair', 499, 650, {}],
  ],
  locks: [
    ['mortise-lock', 'Mortise Lock Set with Handles', 'Godrej', 'Set', 2490, 3200, { tag: 'Bestseller' }],
    ['digital-lock', 'Digital Door Lock (Fingerprint + PIN)', 'Godrej', 'Each', 13990, 18500, { specs: { Access: 'Fingerprint, PIN, RFID, key' } }],
    ['cylindrical-lock', 'Cylindrical Lock (Bathroom)', 'Dorset', 'Each', 690, 890, {}],
    ['padlock', 'Padlock 50 mm', 'Godrej', 'Each', 349, 450, {}],
  ],
  tools: [
    ['impact-drill', 'Impact Drill 13 mm 600 W', 'Bosch', 'Each', 2990, 3850, { tag: 'Bestseller' }],
    ['angle-grinder', 'Angle Grinder 4" 750 W', 'Bosch', 'Each', 2690, 3450, {}],
    ['cordless-driver', 'Cordless Drill Driver 12 V', 'Bosch', 'Each', 5490, 6990, {}],
    ['drill-bits', 'Masonry Drill Bit Set (5 pc)', 'Bosch', 'Set', 349, 450, {}],
    ['cutting-wheel', 'Tile Cutting Wheel 4"', 'Generic', 'Each', 149, 199, {}],
  ],
  hardware: [
    ['screws-assorted', 'Wood Screws Assorted', 'Generic', 'Box of 200', 199, 260, { tag: 'Bestseller' }],
    ['wall-plugs', 'Nylon Wall Plugs 6 mm', 'Fischer', 'Pack of 100', 149, 199, {}],
    ['anchor-bolt', 'Anchor Fastener 10 mm', 'Hilti', 'Pack of 10', 390, 495, {}],
    ['wire-nails', 'Wire Nails 2"', 'Generic', '1 kg', 95, 120, {}],
    ['binding-wire', 'Binding Wire', 'Generic', '1 kg', 99, 125, {}],
  ],
  safety: [
    ['helmet', 'Safety Helmet with Ratchet', 'Karam', 'Each', 249, 320, { tag: 'Bestseller' }],
    ['gloves', 'Cut-resistant Gloves', 'Generic', 'Pair', 149, 199, {}],
    ['goggles', 'Safety Goggles (Anti-fog)', 'Karam', 'Each', 129, 170, {}],
    ['harness', 'Full Body Safety Harness', 'Karam', 'Each', 1690, 2150, {}],
    ['shoes', 'Safety Shoes (Steel toe)', 'Allen Cooper', 'Pair', 1290, 1650, { v: [['UK 7', 1290, 1650], ['UK 8', 1290, 1650], ['UK 9', 1290, 1650], ['UK 10', 1290, 1650]] }],
  ],
  cctv: [
    ['cctv-kit-4', '4-Camera HD CCTV Kit (DVR + 1 TB)', 'CP Plus', 'Kit', 11990, 15500, { tag: 'Bestseller' }],
    ['wifi-cam', 'Wi-Fi Smart Camera 3 MP', 'CP Plus', 'Each', 1990, 2690, {}],
    ['video-doorbell', 'Video Doorbell (Wi-Fi)', 'Qubo', 'Each', 3990, 5490, {}],
  ],
  'power-backup': [
    ['inverter-1100', 'Sine-wave Inverter 1100 VA', 'Luminous', 'Each', 6290, 7990, { heavy: true, tag: 'Bestseller' }],
    ['battery-150', 'Tall Tubular Battery 150 Ah', 'Exide', 'Each', 13490, 16990, { heavy: true }],
    ['stabiliser', 'AC Voltage Stabiliser 4 kVA', 'V-Guard', 'Each', 2290, 2990, {}],
  ],
};

function build() {
  const list = [];
  for (const [categoryId, items] of Object.entries(raw)) {
    for (const [id, name, brand, unit, price, mrp, o = {}] of items) {
      const variants = o.v
        ? o.v.map(([label, p, m], i) => ({ id: `${id}-${i}`, label, price: p, mrp: m }))
        : [{ id: `${id}-0`, label: unit, price, mrp }];
      list.push({
        id,
        categoryId,
        name,
        brand,
        unit: o.v ? '' : unit,
        variants,
        specs: o.specs || {},
        returnable: !o.nr,
        heavy: !!o.heavy,
        tag: o.tag || null,
        image: null,
        inStock: true,
      });
    }
  }
  return list;
}

export const products = build();

export const brands = [...new Set(products.map((p) => p.brand))].sort();

export function categoryById(id) {
  return categories.find((c) => c.id === id);
}
