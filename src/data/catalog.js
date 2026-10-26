// Product catalog: seeds MongoDB (npm run seed) and powers demo mode.
//
// Categories and product range mirror what HomeRun stocks in Bengaluru.
// Prices marked src:'hr' match HomeRun's published Bengaluru price lists
// (Sept–Oct 2026, incl. bulk tiers); everything else is an estimate.
// Edit prices in the admin dashboard (Admin → Products) or here, then re-seed.

export const categories = [
  { id: 'cement', art: ['bag', '#f2c230'], name: 'Cement', icon: 'Package', tint: '#8e8e93', blurb: 'PPC & OPC cement, white cement' },
  { id: 'tiling', art: ['bag', '#2f6db5'], name: 'Tiling', icon: 'Grid3x3', tint: '#5e5ce6', blurb: 'Tile adhesives, grouts, spacers' },
  { id: 'painting', art: ['bucket', '#e94b3c'], name: 'Painting', icon: 'PaintRoller', tint: '#ff375f', blurb: 'Wall putty, primers, emulsions, tools' },
  { id: 'waterproofing', art: ['can', '#e5262b'], name: 'Waterproofing', icon: 'Droplets', tint: '#0a84ff', blurb: 'Admixtures, roof & bathroom coatings' },
  { id: 'plywood', art: ['sheet', '#c8935a'], name: 'Plywood, MDF & HDHMR', icon: 'Layers', tint: '#bf8a54', blurb: 'MR & BWP ply, MDF, HDHMR, laminates' },
  { id: 'adhesives', art: ['jar', '#f5d327'], name: 'Fevicol', icon: 'Pipette', tint: '#ff9f0a', blurb: 'Wood adhesives, epoxy, sealants' },
  { id: 'wires', art: ['coil', '#e5262b'], name: 'Wires, MCB & Distribution Boards', icon: 'Cable', tint: '#ff453a', blurb: 'FR-LSH / FRLS wires, MCBs, RCCBs, DBs' },
  { id: 'kitchen', art: ['sink', '#c7ccd1'], name: 'Kitchen Sinks & Faucets', icon: 'CookingPot', tint: '#ff6482', blurb: 'Steel & quartz sinks, sink mixers' },
  { id: 'sanitary', art: ['tap', '#c7ccd1'], name: 'Sanitary Fittings', icon: 'ShowerHead', tint: '#66d4cf', blurb: 'Taps, showers, health faucets, traps' },
  { id: 'switches', art: ['switch', '#ffffff'], name: 'Switches & Sockets', icon: 'ToggleRight', tint: '#64d2ff', blurb: 'Modular switches, sockets, plates' },
  { id: 'hinges', art: ['hinge', '#c7ccd1'], name: 'Hinges & Handles', icon: 'DoorOpen', tint: '#a2845e', blurb: 'Soft-close hinges, channels, handles' },
  { id: 'kitchen-systems', art: ['drawer', '#e8e8ea'], name: 'Kitchen Systems', icon: 'Archive', tint: '#bf5af2', blurb: 'Tandem boxes, baskets, lift-ups' },
  { id: 'wardrobe', art: ['strut', '#1c1c1e'], name: 'Wardrobe & Bed Fittings', icon: 'BedDouble', tint: '#ac8e68', blurb: 'Wardrobe lifts, bed fittings, struts' },
  { id: 'locks', art: ['padlock', '#b08d57'], name: 'Door Locks', icon: 'Lock', tint: '#636366', blurb: 'Mortise, digital & cylindrical locks' },
  { id: 'conduits', art: ['pipe', '#f2f2f2'], name: 'Conduits & GI Boxes', icon: 'Route', tint: '#8e6e4e', blurb: 'PVC conduits, bends, GI modular boxes' },
  { id: 'lighting', art: ['bulb', '#fff8d6'], name: 'Lighting', icon: 'Lightbulb', tint: '#e5b400', blurb: 'LED bulbs, battens, panels, strips' },
  { id: 'pipes', art: ['elbow', '#e9dcc3'], name: 'CPVC Pipes & Overhead Tanks', icon: 'Waves', tint: '#40c8e0', blurb: 'CPVC / UPVC pipes, fittings, tanks' },
  { id: 'fans', art: ['fan', '#ffffff'], name: 'Ceiling Fans', icon: 'Fan', tint: '#30d158', blurb: 'BLDC & regular ceiling, exhaust fans' },
  { id: 'tools', art: ['drill', '#1f5fa8'], name: 'Power Tools', icon: 'Drill', tint: '#ff9f0a', blurb: 'Drills, grinders, accessories' },
  { id: 'cctv', art: ['domecam', '#ffffff'], name: 'CCTV', icon: 'Cctv', tint: '#5856d6', blurb: 'Camera kits, Wi-Fi cameras, doorbells' },
  { id: 'power-backup', art: ['inverter', '#1f5fa8'], name: 'Home Appliances & Power Backup', icon: 'BatteryCharging', tint: '#34c759', blurb: 'Inverters, batteries, stabilisers, geysers' },
  { id: 'hardware', art: ['screws', '#a1a7ad'], name: 'General Hardware', icon: 'Wrench', tint: '#8e8e93', blurb: 'Screws, anchors, nails, binding wire' },
  { id: 'safety', art: ['helmet', '#ffcc00'], name: 'Safety Gear', icon: 'HardHat', tint: '#e5a800', blurb: 'Helmets, gloves, goggles, harnesses' },
  { id: 'glass-hardware', art: ['handle', '#c7ccd1'], name: 'Glass Door Hardware', icon: 'PanelsTopLeft', tint: '#5ac8fa', blurb: 'Patch fittings, floor springs, handles' },
];

// [id, name, brand, unit, price, mrp, opts]
// opts: v: [[label, price, mrp, tiers?]], t: [[minQty, unitPrice]] bulk tiers,
//       k: illustration kind, c: product colour, specs, nr (non-returnable),
//       heavy, tag, src: 'hr' (price from HomeRun's published list), deal, isNew
const raw = {
  cement: [
    ['ultratech-ppc', 'UltraTech PPC Cement', 'UltraTech', '50 kg bag', 425, 450, { src: 'hr', t: [[10, 415], [30, 405]], heavy: true, tag: 'Bestseller', k: 'bag', c: '#f2c230', specs: { Type: 'Portland Pozzolana (PPC)', Weight: '50 kg', 'Best for': 'Plastering, masonry, slabs' } }],
    ['ultratech-opc-53', 'UltraTech OPC 53 Grade Cement', 'UltraTech', '50 kg bag', 445, 480, { t: [[10, 435], [30, 425]], heavy: true, k: 'bag', c: '#f2c230', specs: { Grade: 'OPC 53', Weight: '50 kg', 'Best for': 'RCC, columns, beams' } }],
    ['acc-suraksha-power', 'ACC Suraksha Power PPC Cement', 'ACC', '50 kg bag', 395, 430, { src: 'hr', t: [[10, 390], [30, 385]], heavy: true, tag: 'Value pick', k: 'bag', c: '#d7322d', specs: { Type: 'PPC', Weight: '50 kg' } }],
    ['acc-concrete-plus', 'ACC Concrete+ OPC Cement', 'ACC', '50 kg bag', 455, 490, { t: [[10, 448], [30, 440]], heavy: true, k: 'bag', c: '#d7322d', specs: { Type: 'OPC', Weight: '50 kg', 'Best for': 'High-strength concrete' } }],
    ['birla-white-cement', 'Birla White Cement', 'Birla White', '', 0, 0, { k: 'bag', c: '#f4f4f4', v: [['1 kg', 65, 75], ['5 kg', 290, 330], ['40 kg', 1950, 2200]], specs: { Use: 'Tile joints, finishing, decorative' } }],
  ],
  tiling: [
    ['roff-tile-adhesive', 'Roff Tile Adhesive (Floor & Wall)', 'Roff', '20 kg bag', 499, 590, { t: [[10, 480], [25, 465]], heavy: true, tag: 'Bestseller', k: 'bag', c: '#2f6db5', specs: { Class: 'C1T', Coverage: '~4–5 m² per bag' } }],
    ['myk-tile-adhesive-305', 'MYK Laticrete 305 Tile Adhesive', 'MYK Laticrete', '20 kg bag', 549, 640, { t: [[10, 530]], heavy: true, k: 'bag', c: '#1f4f8f', specs: { Use: 'Vitrified tiles on floors & walls' } }],
    ['myk-tile-adhesive-335', 'MYK Laticrete 335 (Large Format)', 'MYK Laticrete', '20 kg bag', 849, 980, { heavy: true, k: 'bag', c: '#1f4f8f', specs: { Use: 'Large tiles, tile-on-tile, exteriors' } }],
    ['epoxy-grout', 'SpectraLOCK Epoxy Grout', 'MYK Laticrete', '1 kg kit', 749, 860, { nr: true, k: 'tub', c: '#7d7d86', v: [['1 kg', 749, 860], ['5 kg', 3450, 3990]], specs: { Finish: 'Stain-proof', Shade: 'Choose on call' } }],
    ['tile-spacer-2mm', 'Tile Spacers 2 mm', 'Generic', 'Pack of 200', 99, 140, { k: 'box', c: '#e94e4e' }],
    ['tile-levelling', 'Tile Levelling Clips + Wedges', 'Generic', 'Pack of 100', 449, 600, { k: 'box', c: '#2b8a3e' }],
  ],
  painting: [
    ['ap-trucare-putty-40', 'Asian Paints TruCare Wall Putty', 'Asian Paints', '40 kg bag', 780, 850, { src: 'hr', t: [[10, 770], [20, 760]], heavy: true, tag: 'Bestseller', k: 'bag', c: '#e8e3d8', specs: { Base: 'White cement', Coverage: '~1 m²/kg (2 coats)' } }],
    ['ap-trucare-acrylic-putty', 'Asian Paints TruCare Acrylic Wall Putty', 'Asian Paints', '', 0, 0, { src: 'hr', k: 'bucket', c: '#f1efe9', v: [['1 kg', 85, 95], ['5 kg', 399, 440], ['10 kg', 765, 840], ['20 kg', 1380, 1520]], specs: { Use: 'Interior walls, ready to use' } }],
    ['birla-wallcare-putty', 'Birla White WallCare Putty', 'Birla White', '30 kg bag', 700, 750, { src: 'hr', t: [[20, 680]], heavy: true, k: 'bag', c: '#f4f4f4', specs: { Coverage: '~1 m²/kg (2 coats)' } }],
    ['birla-wallseal-putty', 'Birla White WallSeal Waterproof Putty', 'Birla White', '30 kg bag', 950, 1180, { src: 'hr', heavy: true, k: 'bag', c: '#d9ecf7', specs: { Use: 'Damp-prone & exterior walls' } }],
    ['ap-tractor-emulsion', 'Asian Paints Tractor Emulsion', 'Asian Paints', '', 0, 0, { nr: true, k: 'bucket', c: '#e94b3c', v: [['1 L', 280, 320], ['4 L', 1050, 1210], ['10 L', 2490, 2860], ['20 L', 4790, 5480]], specs: { Finish: 'Matt', Note: 'White base; tinting on request' } }],
    ['ap-apex-exterior', 'Asian Paints Apex Exterior Emulsion', 'Asian Paints', '', 0, 0, { nr: true, k: 'bucket', c: '#1f6fb5', v: [['4 L', 1690, 1940], ['10 L', 3990, 4590], ['20 L', 7790, 8950]] }],
    ['ap-interior-primer', 'Asian Paints Interior Wall Primer', 'Asian Paints', '', 0, 0, { k: 'bucket', c: '#9bbf3b', v: [['4 L', 690, 790], ['10 L', 1590, 1830], ['20 L', 2990, 3440]] }],
    ['ap-enamel', 'Asian Paints Apcolite Gloss Enamel', 'Asian Paints', '', 0, 0, { nr: true, k: 'tin', c: '#e94b3c', v: [['500 ml', 240, 275], ['1 L', 450, 515], ['4 L', 1690, 1940]] }],
    ['roller-9', 'Paint Roller 9"', 'Generic', 'Each', 199, 260, { k: 'roller', c: '#ff9f0a' }],
    ['brush-set', 'Paint Brush Set (1", 2", 4")', 'Generic', 'Set of 3', 249, 320, { k: 'brush', c: '#b5651d' }],
    ['masking-tape', 'Masking Tape 1"', 'Generic', 'Roll', 59, 80, { k: 'tape', c: '#e8d9a8' }],
  ],
  waterproofing: [
    ['dr-fixit-lw-plus', 'Dr. Fixit LW+ Waterproofing Admixture', 'Dr. Fixit', '', 0, 0, { tag: 'Bestseller', k: 'can', c: '#e5262b', v: [['1 L', 175, 200], ['5 L', 790, 905], ['20 L', 2890, 3320]], specs: { Dosage: '200 ml per 50 kg cement' } }],
    ['dr-fixit-roofseal', 'Dr. Fixit Roofseal', 'Dr. Fixit', '', 0, 0, { nr: true, k: 'bucket', c: '#e5262b', v: [['4 L', 1690, 1940], ['10 L', 3990, 4590], ['20 L', 7690, 8840]], specs: { Coverage: '~1.4 m²/L (2 coats)' } }],
    ['dr-fixit-bathseal', 'Dr. Fixit Bathseal', 'Dr. Fixit', '1 L', 690, 795, { k: 'can', c: '#e5262b' }],
    ['fosroc-sbr', 'Fosroc Nitobond SBR', 'Fosroc', '', 0, 0, { k: 'can', c: '#2d5aa0', v: [['1 kg', 330, 380], ['5 kg', 1490, 1715]] }],
    ['dr-fixit-crack-x', 'Dr. Fixit Crack-X Paste', 'Dr. Fixit', '1 kg', 260, 300, { k: 'tub', c: '#e5262b' }],
  ],
  plywood: [
    ['century-sainik-mr-18', 'Century Sainik MR 303 Plywood 18 mm', 'Century', '', 0, 0, { src: 'hr', heavy: true, tag: 'Bestseller', k: 'sheet', c: '#c8935a', v: [["7' × 4'", 2670, 3050], ["8' × 4'", 3044, 3480]], specs: { Grade: 'IS 303 MR', Thickness: '18 mm' } }],
    ['century-sainik-mr-12', 'Century Sainik MR 303 Plywood 12 mm', 'Century', '', 0, 0, { heavy: true, k: 'sheet', c: '#c8935a', v: [["7' × 4'", 1990, 2280], ["8' × 4'", 2270, 2600]], specs: { Thickness: '12 mm' } }],
    ['greenply-ecotec-mr-18', 'Greenply Ecotec MR 303 Plywood 18 mm', 'Greenply', "8' × 4' sheet", 2800, 3200, { heavy: true, k: 'sheet', c: '#b9874f', specs: { Grade: 'IS 303 MR', Thickness: '18 mm' } }],
    ['archidply-mr-18', 'Archidply MR Plywood 18 mm', 'Archidply', "8' × 4' sheet", 2590, 2990, { heavy: true, k: 'sheet', c: '#c09a63', specs: { Thickness: '18 mm' } }],
    ['century-club-bwp-18', 'Century Club Prime BWP Marine Plywood 18 mm', 'Century', "8' × 4' sheet", 4590, 5300, { heavy: true, k: 'sheet', c: '#a8743f', specs: { Grade: 'IS 710 BWP', Thickness: '18 mm', Use: 'Kitchens, bathrooms' } }],
    ['action-tesa-mdf-18', 'Action Tesa Interior MDF 18 mm', 'Action Tesa', "8' × 4' sheet", 1890, 2200, { heavy: true, k: 'sheet', c: '#cfa977', specs: { Thickness: '18 mm' } }],
    ['action-tesa-hdhmr-18', 'Action Tesa HDHMR 18 mm', 'Action Tesa', "8' × 4' sheet", 2690, 3100, { heavy: true, k: 'sheet', c: '#8f6a43', specs: { Thickness: '18 mm', Use: 'Kitchen shutters, wardrobes' } }],
    ['merino-laminate-1mm', 'Merino Decorative Laminate 1 mm', 'Merino', "8' × 4' sheet", 1190, 1400, { nr: true, k: 'sheet', c: '#5b5b60', specs: { Finish: 'Suede / gloss (choose on call)' } }],
  ],
  adhesives: [
    ['fevicol-sh', 'Fevicol SH Synthetic Resin Adhesive', 'Fevicol', '', 0, 0, { tag: 'Bestseller', k: 'jar', c: '#f5d327', v: [['1 kg', 320, 365], ['5 kg', 1490, 1700], ['10 kg', 2890, 3300]] }],
    ['fevicol-marine', 'Fevicol Marine Waterproof Adhesive', 'Fevicol', '1 kg', 315, 360, { src: 'hr', k: 'jar', c: '#1f7ac2' }],
    ['araldite-standard', 'Araldite Standard Epoxy', 'Araldite', '180 g', 260, 300, { k: 'tube', c: '#1c4f9c' }],
    ['anabond-silicone', 'Anabond Silicone Sealant (Clear)', 'Anabond', '280 ml', 290, 340, { k: 'cartridge', c: '#e8eef2' }],
    ['m-seal', 'M-Seal Epoxy Putty', 'M-Seal', '100 g', 75, 90, { k: 'box', c: '#e5262b' }],
  ],
  wires: [
    ['polycab-maxima-1-5', 'Polycab Maxima+ Green FR-LSH Wire 1.5 sq mm', 'Polycab', '90 m coil', 3365, 3980, { src: 'hr', tag: 'Bestseller', k: 'coil', c: '#e5262b', v: [['Red', 3365, 3980], ['Black', 3365, 3980], ['Green', 3365, 3980], ['Yellow', 3365, 3980], ['Blue', 3365, 3980]], specs: { Length: '90 m', Insulation: 'HR FR-LSH, lead-free' } }],
    ['polycab-maxima-2-5', 'Polycab Maxima+ Green FR-LSH Wire 2.5 sq mm', 'Polycab', '90 m coil', 5290, 6250, { k: 'coil', c: '#1c1c1e', v: [['Red', 5290, 6250], ['Black', 5290, 6250], ['Green', 5290, 6250]] }],
    ['polycab-maxima-4', 'Polycab Maxima+ Green FR-LSH Wire 4 sq mm', 'Polycab', '90 m coil', 8390, 9900, { k: 'coil', c: '#2b8a3e' }],
    ['polycab-frls-1', 'Polycab FRLS-H Single Core Wire 1 sq mm', 'Polycab', '90 m coil', 1990, 2390, { k: 'coil', c: '#1f6fb5' }],
    ['mcb-sp', 'Schneider Single Pole MCB (C-curve)', 'Schneider', 'Each', 195, 260, { k: 'mcb', c: '#3dcd58', v: [['6 A', 195, 260], ['16 A', 195, 260], ['32 A', 210, 280]] }],
    ['rccb-dp-40', 'Legrand RCCB 2-Pole 40 A 30 mA', 'Legrand', 'Each', 2290, 2950, { k: 'mcb', c: '#e5262b' }],
    ['db-8way', 'Schneider 8-Way SPN Distribution Board', 'Schneider', 'Each', 1290, 1650, { k: 'db', c: '#e8e8ea' }],
  ],
  kitchen: [
    ['nirali-ss-sink', 'Nirali Stainless Steel Sink 24 × 18"', 'Nirali', 'Each', 3490, 4650, { heavy: true, tag: 'Bestseller', k: 'sink', c: '#c7ccd1' }],
    ['carysil-quartz-sink', 'Carysil Quartz Single Bowl Sink 32 × 18"', 'Carysil', 'Each', 9990, 13500, { heavy: true, k: 'sink', c: '#3a3a3c' }],
    ['jaquar-sink-mixer', 'Jaquar Wall-mounted Sink Mixer', 'Jaquar', 'Each', 2690, 3450, { k: 'tap', c: '#c7ccd1' }],
    ['sink-coupling', 'Sink Coupling with Waste Pipe', 'Generic', 'Set', 299, 390, { k: 'fitting', c: '#c7ccd1' }],
  ],
  sanitary: [
    ['jaquar-pillar-cock', 'Jaquar Pillar Cock', 'Jaquar', 'Each', 1290, 1650, { tag: 'Bestseller', k: 'tap', c: '#c7ccd1' }],
    ['hindware-health-faucet', 'Hindware Health Faucet with Hose', 'Hindware', 'Set', 790, 1050, { k: 'faucet', c: '#f2f2f7' }],
    ['jaquar-overhead-shower', 'Jaquar Overhead Shower 8" Square', 'Jaquar', 'Each', 1890, 2450, { k: 'shower', c: '#c7ccd1' }],
    ['cera-angle-valve', 'Cera Angle Valve', 'Cera', 'Each', 390, 495, { k: 'fitting', c: '#c7ccd1' }],
    ['braided-connection', 'Braided Connection Pipe 18"', 'Generic', 'Each', 149, 199, { k: 'hose', c: '#c7ccd1' }],
    ['floor-trap', 'Anti-cockroach Floor Trap 5"', 'Generic', 'Each', 249, 320, { k: 'trap', c: '#c7ccd1' }],
  ],
  switches: [
    ['legrand-switch-6a', 'Legrand Myrius 6 A 1-Way Switch', 'Legrand', 'Each', 59, 75, { tag: 'Bestseller', t: [[20, 55], [50, 52]], k: 'switch', c: '#ffffff' }],
    ['legrand-socket-6a', 'Legrand Myrius 6 A Socket', 'Legrand', 'Each', 129, 160, { t: [[20, 122]], k: 'socket', c: '#ffffff' }],
    ['legrand-socket-16a', 'Legrand Myrius 16 A Socket', 'Legrand', 'Each', 199, 245, { k: 'socket', c: '#ffffff' }],
    ['legrand-plate-8m', 'Legrand Myrius 8-Module Cover Plate', 'Legrand', 'Each', 299, 370, { k: 'plate', c: '#ffffff', v: [['White', 299, 370], ['Graphite', 349, 430]] }],
    ['anchor-usb', 'Anchor Roma USB Charger Module', 'Anchor', 'Each', 990, 1250, { k: 'socket', c: '#ffffff' }],
    ['anchor-regulator', 'Anchor Roma Fan Regulator', 'Anchor', 'Each', 349, 430, { k: 'switch', c: '#ffffff' }],
  ],
  hinges: [
    ['hettich-softclose-hinge', 'Hettich Sensys Soft-close Hinge', 'Hettich', 'Pair', 349, 460, { tag: 'Bestseller', k: 'hinge', c: '#c7ccd1', v: [['Full overlay', 349, 460, [[10, 330]]], ['Half overlay', 349, 460, [[10, 330]]], ['Inset', 349, 460, [[10, 330]]]] }],
    ['ebco-channel', 'Ebco Telescopic Drawer Channel', 'Ebco', 'Pair', 399, 520, { k: 'channel', c: '#c7ccd1', v: [['12"', 299, 390], ['18"', 399, 520], ['24"', 499, 650]] }],
    ['profile-handle', 'Aluminium Profile Handle 8"', 'Generic', 'Each', 149, 220, { k: 'handle', c: '#1c1c1e', v: [['Black', 149, 220], ['Gold', 179, 260], ['Steel', 149, 220]] }],
    ['tower-bolt', 'SS Tower Bolt 6"', 'Generic', 'Each', 129, 170, { k: 'handle', c: '#c7ccd1' }],
  ],
  'kitchen-systems': [
    ['hettich-tandem-box', 'Hettich InnoTech Tandem Box 500 mm', 'Hettich', 'Set', 3990, 5200, { tag: 'Bestseller', k: 'drawer', c: '#e8e8ea' }],
    ['ebco-cutlery-basket', 'Ebco Cutlery Basket 15 × 20"', 'Ebco', 'Each', 1890, 2450, { k: 'basket', c: '#c7ccd1' }],
    ['ebco-plate-basket', 'Ebco Plate Basket 15 × 20"', 'Ebco', 'Each', 1690, 2190, { k: 'basket', c: '#c7ccd1' }],
  ],
  wardrobe: [
    ['hafele-wardrobe-lift', 'Häfele Wardrobe Pull-down Lift', 'Häfele', 'Each', 6490, 8200, { k: 'drawer', c: '#c7ccd1' }],
    ['ebco-gas-strut', 'Ebco Gas Lift Strut 100 N', 'Ebco', 'Pair', 499, 650, { k: 'strut', c: '#1c1c1e' }],
    ['bed-fitting', 'Hydraulic Bed Lift Fitting', 'Ebco', 'Set', 2490, 3200, { k: 'strut', c: '#1c1c1e' }],
  ],
  locks: [
    ['godrej-mortise-set', 'Godrej Mortise Lock Set with Handles', 'Godrej', 'Set', 2490, 3200, { tag: 'Bestseller', k: 'lock', c: '#b08d57' }],
    ['godrej-digital-lock', 'Godrej Advantis Digital Lock', 'Godrej', 'Each', 13990, 18500, { k: 'digilock', c: '#1c1c1e', specs: { Access: 'Fingerprint, PIN, RFID, key' } }],
    ['dorset-bathroom-lock', 'Dorset Cylindrical Bathroom Lock', 'Dorset', 'Each', 690, 890, { k: 'knob', c: '#c7ccd1' }],
    ['godrej-padlock', 'Godrej Padlock 50 mm', 'Godrej', 'Each', 349, 450, { k: 'padlock', c: '#b08d57' }],
  ],
  conduits: [
    ['pvc-conduit', 'Precision PVC Conduit Pipe (3 m)', 'Precision', '3 m length', 49, 65, { tag: 'Bestseller', k: 'pipe', c: '#f2f2f2', v: [['20 mm', 49, 65, [[50, 46]]], ['25 mm', 69, 90, [[50, 65]]]] }],
    ['conduit-bend', 'PVC Conduit Bend 20 mm', 'Precision', 'Pack of 10', 70, 95, { k: 'elbow', c: '#f2f2f2' }],
    ['gi-modular-box', 'GI Modular Box', 'Generic', 'Each', 85, 110, { k: 'gibox', c: '#a1a7ad', v: [['3 module', 55, 75, [[25, 52]]], ['6 module', 75, 95, [[25, 71]]], ['8 module', 85, 110, [[25, 80]]], ['12 module', 115, 150, [[25, 109]]]] }],
    ['junction-box', 'Round Junction Box 20 mm', 'Precision', 'Pack of 10', 120, 160, { k: 'box', c: '#f2f2f2' }],
  ],
  lighting: [
    ['philips-led-bulb', 'Philips LED Bulb Cool Day', 'Philips', 'Each', 89, 120, { tag: 'Bestseller', k: 'bulb', c: '#fff8d6', v: [['9 W', 89, 120, [[10, 84]]], ['12 W', 129, 170, [[10, 122]]], ['20 W', 249, 330, [[10, 236]]]] }],
    ['wipro-batten-20w', 'Wipro LED Batten 20 W 4 ft', 'Wipro', 'Each', 299, 420, { k: 'batten', c: '#ffffff' }],
    ['havells-panel-15w', 'Havells Recessed LED Panel 15 W Round', 'Havells', 'Each', 399, 560, { k: 'panel', c: '#ffffff', v: [['Cool white', 399, 560], ['Warm white', 399, 560]] }],
    ['philips-cob-7w', 'Philips COB Spotlight 7 W', 'Philips', 'Each', 449, 620, { k: 'spot', c: '#ffffff' }],
  ],
  pipes: [
    ['ashirvad-flowguard-cpvc', 'Ashirvad FlowGuard Plus CPVC Pipe SDR-11 (5 m)', 'Ashirvad', '5 m length', 316, 600, { src: 'hr', tag: 'Bestseller', k: 'pipe', c: '#e9dcc3', v: [['1/2"', 316, 600], ['3/4"', 495, 940], ['1"', 760, 1440]] }],
    ['ashirvad-cpvc-elbow', 'Ashirvad CPVC Elbow 90°', 'Ashirvad', 'Pack of 10', 95, 120, { k: 'elbow', c: '#e9dcc3', v: [['1/2"', 95, 120], ['3/4"', 150, 190], ['1"', 240, 300]] }],
    ['ashirvad-cpvc-ball-valve', 'Ashirvad CPVC Ball Valve', 'Ashirvad', 'Each', 210, 280, { k: 'valve', c: '#e9dcc3', v: [['1/2"', 210, 280], ['3/4"', 290, 380]] }],
    ['supreme-swr-4', 'Supreme SWR Pipe 4" (3 m)', 'Supreme', '3 m length', 690, 830, { k: 'pipe', c: '#8e8e93' }],
    ['ashirvad-solvent', 'Ashirvad CPVC Solvent Cement', 'Ashirvad', '118 ml', 199, 245, { k: 'tin', c: '#e9dcc3' }],
    ['sintex-tank-1000', 'Sintex Triple Layer Water Tank 1000 L', 'Sintex', 'Each', 7490, 8990, { heavy: true, k: 'tank', c: '#1c1c1e', specs: { Capacity: '1000 L', Layers: '3' } }],
  ],
  fans: [
    ['atomberg-renesa', 'Atomberg Renesa BLDC Ceiling Fan 1200 mm', 'Atomberg', 'Each', 3690, 5190, { heavy: true, tag: 'Bestseller', k: 'fan', c: '#ffffff', v: [['White', 3690, 5190], ['Matt Black', 3790, 5290]], specs: { Power: '28 W', Remote: 'Included' } }],
    ['crompton-fan-1200', 'Crompton Ceiling Fan 1200 mm', 'Crompton', 'Each', 1790, 2390, { heavy: true, k: 'fan', c: '#7a5230' }],
    ['havells-exhaust-150', 'Havells Exhaust Fan 150 mm', 'Havells', 'Each', 990, 1290, { k: 'exhaust', c: '#ffffff' }],
  ],
  tools: [
    ['bosch-gsb-600', 'Bosch GSB 600 Impact Drill 13 mm', 'Bosch', 'Each', 2990, 3850, { tag: 'Bestseller', k: 'drill', c: '#1f5fa8' }],
    ['bosch-gws-750', 'Bosch GWS 750 Angle Grinder 4"', 'Bosch', 'Each', 2690, 3450, { k: 'grinder', c: '#1f5fa8' }],
    ['bosch-masonry-bits', 'Bosch Masonry Drill Bit Set (5 pc)', 'Bosch', 'Set', 349, 450, { k: 'box', c: '#1f5fa8' }],
  ],
  cctv: [
    ['cpplus-kit-4', 'CP Plus 4-Camera HD Kit (DVR + 1 TB)', 'CP Plus', 'Kit', 11990, 15500, { tag: 'Bestseller', k: 'camera', c: '#ffffff' }],
    ['cpplus-wifi-cam', 'CP Plus Wi-Fi Smart Camera 3 MP', 'CP Plus', 'Each', 1990, 2690, { k: 'domecam', c: '#ffffff' }],
  ],
  'power-backup': [
    ['luminous-inverter-1100', 'Luminous Sine-wave Inverter 1100 VA', 'Luminous', 'Each', 6290, 7990, { heavy: true, tag: 'Bestseller', k: 'inverter', c: '#1f5fa8' }],
    ['exide-tubular-150', 'Exide Tall Tubular Battery 150 Ah', 'Exide', 'Each', 13490, 16990, { heavy: true, k: 'battery', c: '#e5262b' }],
    ['vguard-stabiliser', 'V-Guard Voltage Stabiliser 4 kVA', 'V-Guard', 'Each', 2290, 2990, { k: 'inverter', c: '#f2f2f7' }],
    ['racold-geyser-15', 'Racold Storage Water Heater 15 L', 'Racold', 'Each', 7490, 9890, { heavy: true, k: 'geyser', c: '#ffffff' }],
  ],
  hardware: [
    ['wood-screws', 'Wood Screws Assorted', 'Generic', 'Box of 200', 199, 260, { tag: 'Bestseller', k: 'screws', c: '#a1a7ad' }],
    ['fischer-wall-plugs', 'Fischer Nylon Wall Plugs 6 mm', 'Fischer', 'Pack of 100', 149, 199, { k: 'screws', c: '#9a9a9a' }],
    ['hilti-anchor', 'Hilti Anchor Fastener 10 mm', 'Hilti', 'Pack of 10', 390, 495, { k: 'screws', c: '#d7322d' }],
    ['wire-nails', 'Wire Nails 2"', 'Generic', '1 kg', 95, 120, { k: 'screws', c: '#7b7f85' }],
    ['binding-wire', 'GI Binding Wire', 'Generic', '1 kg', 99, 125, { t: [[10, 92]], k: 'coil', c: '#7b7f85' }],
  ],
  safety: [
    ['karam-helmet', 'Karam Safety Helmet (Ratchet)', 'Karam', 'Each', 249, 320, { tag: 'Bestseller', t: [[10, 230]], k: 'helmet', c: '#ffcc00' }],
    ['cut-gloves', 'Cut-resistant Gloves', 'Generic', 'Pair', 149, 199, { t: [[12, 135]], k: 'gloves', c: '#8e8e93' }],
    ['karam-goggles', 'Karam Safety Goggles (Anti-fog)', 'Karam', 'Each', 129, 170, { k: 'goggles', c: '#64d2ff' }],
    ['karam-harness', 'Karam Full Body Harness', 'Karam', 'Each', 1690, 2150, { k: 'harness', c: '#ff9f0a' }],
  ],
  'glass-hardware': [
    ['dorma-floor-spring', 'Dorma Floor Spring', 'Dorma', 'Each', 5990, 7600, { k: 'gibox', c: '#c7ccd1' }],
    ['glass-patch-fitting', 'Glass Door Patch Fitting Set', 'Generic', 'Set', 2490, 3200, { k: 'hinge', c: '#c7ccd1' }],
    ['glass-door-handle', 'SS Glass Door Pull Handle 24"', 'Generic', 'Pair', 1290, 1690, { k: 'handle', c: '#c7ccd1' }],
  ],
};

// Weekly deals and new arrivals (by product id)
const DEALS = ['ultratech-ppc', 'ap-trucare-putty-40', 'ashirvad-flowguard-cpvc', 'polycab-maxima-1-5', 'atomberg-renesa', 'century-sainik-mr-18'];
const NEW = ['birla-wallseal-putty', 'acc-suraksha-power', 'racold-geyser-15', 'glass-patch-fitting', 'bed-fitting'];

function build() {
  const list = [];
  for (const [categoryId, items] of Object.entries(raw)) {
    for (const [id, name, brand, unit, price, mrp, o = {}] of items) {
      const tiers = (t) => (t || []).map(([min, p]) => ({ min, price: p }));
      const variants = o.v
        ? o.v.map(([label, p, m, t], i) => ({ id: `${id}-${i}`, label, price: p, mrp: m, tiers: tiers(t) }))
        : [{ id: `${id}-0`, label: unit, price, mrp, tiers: tiers(o.t) }];
      for (const v of variants) {
        // bulk tiers must be per size and always cheaper than that size's price
        if (o.v && o.t) throw new Error(`${id}: put bulk tiers on each size, not the product`);
        for (const t of v.tiers) if (!(t.price < v.price && t.min > 1)) throw new Error(`${id}: bad tier ${t.min}:${t.price}`);
        if (!(v.mrp >= v.price && v.price > 0)) throw new Error(`${id}: bad price`);
      }
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
        kind: o.k || 'box',
        color: o.c || '#c7ccd1',
        priceSource: o.src === 'hr' ? 'homerun-list' : 'estimate',
        deal: DEALS.includes(id),
        isNew: NEW.includes(id),
        image: null,
        inStock: true,
        active: true,
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
