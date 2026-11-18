export interface VehicleCommissionLead {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  location: string;
  vehicleModel: string;
  exteriorFinish: string;
  exteriorColor: string;
  wheelDesign: string;
  wheelColor: string;
  glassTint: string;
  caliperColor: string;
  activeDecals: string[];
  basePrice: number;
  optionsTotal: number;
  totalPrice: number;
  depositStatus: "Deposited ($5,000)" | "Quote Requested" | "In Review" | "In Production";
  paymentMethod: "Credit Card" | "Bank Wire" | "Crypto (USDC)";
  submittedAt: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface FunnelStep {
  step: string;
  visitors: number;
  dropRate: string;
  avgTimeSeconds: number;
}

export interface PaintFinishMetric {
  name: string;
  count: number;
  share: number;
  color: string;
}

export interface WheelMetric {
  name: string;
  selections: number;
  share: number;
  avgOptionPrice: number;
}

export interface RuleInsight {
  id: string;
  category: "Opportunity" | "Inventory" | "Conversion Friction" | "Acquisition";
  title: string;
  observation: string;
  evidence: string;
  recommendation: string;
  impact: string;
  confidence: number;
}

export const mockDashboardMetrics = {
  activeStudios: 18,
  totalConfigurations: 1420,
  completedBuildRate: "42.8%",
  commissionPipelineValue: 4850000,
  depositsCollectedCount: 38,
  depositsCollectedValue: 190000,
  avgBuildPrice: 154200,
};

export const mockWeeklyPipelineTrend = [
  { day: "Mon", sessions: 180, buildsCompleted: 64, pipelineValue: 620000 },
  { day: "Tue", sessions: 220, buildsCompleted: 88, pipelineValue: 840000 },
  { day: "Wed", sessions: 210, buildsCompleted: 79, pipelineValue: 710000 },
  { day: "Thu", sessions: 290, buildsCompleted: 114, pipelineValue: 980000 },
  { day: "Fri", sessions: 340, buildsCompleted: 148, pipelineValue: 1250000 },
  { day: "Sat", sessions: 420, buildsCompleted: 182, pipelineValue: 1450000 },
  { day: "Sun", sessions: 390, buildsCompleted: 165, pipelineValue: 1320000 },
];

export const mockVehicleModelBreakdown = [
  { name: "Porsche 911 992", count: 580, share: 40.8, color: "#d16b54" },
  { name: "Audi RS6 Avant", count: 420, share: 29.6, color: "#38bdf8" },
  { name: "Audi RS8 Sport", count: 280, share: 19.7, color: "#a855f7" },
  { name: "Lamborghini Revuelto", count: 140, share: 9.9, color: "#eab308" },
];

export const mockPaintFinishBreakdown: PaintFinishMetric[] = [
  { name: "Satin Matte Clearcoat", count: 620, share: 43.7, color: "#d16b54" },
  { name: "High-Gloss Mirror Finish", count: 490, share: 34.5, color: "#38bdf8" },
  { name: "Metallic Pearl", count: 210, share: 14.8, color: "#eab308" },
  { name: "Bespoke Dual-Tone Wrap", count: 100, share: 7.0, color: "#10b981" },
];

export const mockWheelPreferences: WheelMetric[] = [
  { name: "Forged Aero Turbine (Satin Gold)", selections: 485, share: 34.1, avgOptionPrice: 4800 },
  { name: "Lightweight Monoblock (Gloss Black)", selections: 412, share: 29.0, avgOptionPrice: 3800 },
  { name: "Carbon Composite Multi-Spoke", selections: 320, share: 22.5, avgOptionPrice: 6200 },
  { name: "Classic Brushed Silver Alloy", selections: 203, share: 14.4, avgOptionPrice: 2200 },
];

export const mockDecalPlacements = [
  { location: "Driver Door Panel", count: 540, share: "45.0%" },
  { location: "Passenger Door Panel", count: 480, share: "40.0%" },
  { location: "Front Hood Center", count: 120, share: "10.0%" },
  { location: "Rear Diffuser / Quarter", count: 60, share: "5.0%" },
];

export const mockFunnelSteps: FunnelStep[] = [
  { step: "1. 3D Studio Entry", visitors: 3450, dropRate: "0%", avgTimeSeconds: 14 },
  { step: "2. Body Finish & Color Picked", visitors: 2780, dropRate: "-19.4%", avgTimeSeconds: 48 },
  { step: "3. Alloy Wheels & Calipers", visitors: 2190, dropRate: "-21.2%", avgTimeSeconds: 85 },
  { step: "4. Custom Decal / Livery Applied", visitors: 1680, dropRate: "-23.3%", avgTimeSeconds: 130 },
  { step: "5. Spec Sheet & 360 Snapshots", visitors: 1420, dropRate: "-15.5%", avgTimeSeconds: 195 },
  { step: "6. Bespoke Commission Deposit ($5k)", visitors: 112, dropRate: "-92.1%", avgTimeSeconds: 240 },
];

export const mockRecentCommissionLeads: VehicleCommissionLead[] = [
  {
    id: "CMD-2026-091",
    clientName: "Alexander Vance",
    email: "alexander.vance@bespoke.com",
    phone: "+1 (555) 019-2834",
    location: "Zurich, Switzerland",
    vehicleModel: "Porsche 911 992",
    exteriorFinish: "Satin Matte",
    exteriorColor: "Sandstorm Beige (#d2b48c)",
    wheelDesign: "Forged Aero Turbine",
    wheelColor: "Satin Gold",
    glassTint: "Limousine Dark (5%)",
    caliperColor: "Racing Yellow",
    activeDecals: ["Apex GT Crest (Door Panel)"],
    basePrice: 142700,
    optionsTotal: 10600,
    totalPrice: 153300,
    depositStatus: "Deposited ($5,000)",
    paymentMethod: "Credit Card",
    submittedAt: "12 mins ago",
  },
  {
    id: "CMD-2026-088",
    clientName: "Kareem Al-Mansoor",
    email: "kareem.m@emiratesauto.ae",
    phone: "+971 50 829 4110",
    location: "Dubai, UAE",
    vehicleModel: "Audi RS6 Avant",
    exteriorFinish: "High-Gloss Mirror",
    exteriorColor: "Obsidian Black (#0a0a0a)",
    wheelDesign: "Lightweight Monoblock",
    wheelColor: "Gloss Black",
    glassTint: "Clear Crystal Factory",
    caliperColor: "Acid Green",
    activeDecals: ["Custom Uploaded Brand Logo"],
    basePrice: 117900,
    optionsTotal: 14200,
    totalPrice: 132100,
    depositStatus: "Deposited ($5,000)",
    paymentMethod: "Crypto (USDC)",
    submittedAt: "1 hour ago",
  },
  {
    id: "CMD-2026-085",
    clientName: "Henrik Lindqvist",
    email: "h.lindqvist@nordicmotors.se",
    phone: "+46 8 123 4567",
    location: "Stockholm, Sweden",
    vehicleModel: "Audi RS8 Sport",
    exteriorFinish: "Satin Matte",
    exteriorColor: "Chalk Nardo Grey (#71797e)",
    wheelDesign: "Carbon Composite",
    wheelColor: "Graphite Smoke",
    glassTint: "Medium Smoke (20%)",
    caliperColor: "High-Gloss Red",
    activeDecals: ["Apex GT Crest", "Customly-U Decal"],
    basePrice: 134500,
    optionsTotal: 18900,
    totalPrice: 153400,
    depositStatus: "Quote Requested",
    paymentMethod: "Bank Wire",
    submittedAt: "3 hours ago",
  },
  {
    id: "CMD-2026-082",
    clientName: "Sophia Rossi",
    email: "sophia.rossi@milanodesign.it",
    phone: "+39 02 8901 2345",
    location: "Milan, Italy",
    vehicleModel: "Porsche 911 992",
    exteriorFinish: "Metallic Pearl",
    exteriorColor: "Guards Red (#cc0000)",
    wheelDesign: "Classic Brushed Silver",
    wheelColor: "Silver Metallic",
    glassTint: "Light Tint (50%)",
    caliperColor: "Gloss Black",
    activeDecals: ["Customly-U Script"],
    basePrice: 142700,
    optionsTotal: 7800,
    totalPrice: 150500,
    depositStatus: "Deposited ($5,000)",
    paymentMethod: "Credit Card",
    submittedAt: "5 hours ago",
  },
];

export const mockRuleInsights: RuleInsight[] = [
  {
    id: "INS-001",
    category: "Opportunity",
    title: "Introduce 'Stealth Matte Edition' Pre-Packaged Option",
    observation: "42.8% of Porsche 911 and RS6 Avant visitors combine Satin Matte Paint with Gloss Black Rims and Limousine Tint.",
    evidence: "Detected in 608 of 1,420 total configurations. Users spend an average of 4.2 minutes manually picking these 3 options.",
    recommendation: "Create a 1-click 'Stealth Matte Specification' bundle priced at $9,500 on the main hero banner.",
    impact: "+14% expected increase in fast-track deposit submissions by eliminating 6 selection steps.",
    confidence: 96,
  },
  {
    id: "INS-002",
    category: "Inventory",
    title: "Pre-order 21-inch Forged Aero Wheels (Satin Gold)",
    observation: "Satin Gold Aero wheels lead all rim choices with 34.1% market share on Porsche 911 builds.",
    evidence: "485 configurations selected this rim, and 68% of placed deposits include this wheel model.",
    recommendation: "Reserve batch allocation of 20 wheelsets with the supplier to prevent post-deposit production bottlenecks.",
    impact: "Reduces coachwork delivery lead time from 8 weeks to 3 weeks for top-tier clients.",
    confidence: 94,
  },
  {
    id: "INS-003",
    category: "Conversion Friction",
    title: "High Drop-off at Decal Projection Step on Mobile",
    observation: "23.3% drop-off rate occurs when users enter the custom decal / sticker section from mobile browsers.",
    evidence: "Touch drag & drop projection interaction takes 2.5× longer on touchscreens than desktop mouse clicks.",
    recommendation: "Add 1-tap 'Preset Alignment' pills (Left Door, Right Door, Hood, Fender) for mobile viewports.",
    impact: "Recovers an estimated 150–200 completed specifications per month.",
    confidence: 91,
  },
  {
    id: "INS-004",
    category: "Acquisition",
    title: "Google Search Leads Have 4.2× Higher Deposit Conversion",
    observation: "While Instagram brings 65% of raw studio visitors, Google Organic search leads account for 71% of completed $5,000 deposits.",
    evidence: "CAC on search is $42 vs $180 per qualified lead on social media campaigns.",
    recommendation: "Reallocate 35% of campaign ad budget to high-intent keywords (e.g. 'bespoke Porsche custom coachbuilder').",
    impact: "Lowers blended customer acquisition cost by 26% while increasing pipeline volume.",
    confidence: 88,
  },
];

