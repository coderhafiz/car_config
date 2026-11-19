import { supabase } from "./supabase";
import { VehicleCommissionLead } from "./adminData";
import { TelemetryEvent } from "./telemetry";

export interface RealDashboardMetrics {
  commissionPipelineValue: number;
  depositsCollectedValue: number;
  depositsCollectedCount: number;
  totalConfigurations: number;
  completedBuildRate: string;
  activeStudios: number;
  pipelineTrend: Array<{ day: string; pipelineValue: number; sessions: number }>;
  vehicleModelBreakdown: Array<{ name: string; count: number; share: number; color: string }>;
  recentLeads: VehicleCommissionLead[];
}

export interface RealPreferencesData {
  paintFinishes: Array<{ name: string; count: number; share: number; color: string }>;
  wheelChoices: Array<{ name: string; selections: number; share: number; avgOptionPrice: number }>;
  decalPlacements: Array<{ location: string; count: number; share: string }>;
  arStats?: {
    sessionsLaunched: number;
    stickersPlacedInAR: number;
    snapshotsCaptured: number;
  };
  topCombinations: Array<{
    combo: string;
    share: string;
    volume: number;
    avgMSRP: string;
    topModel: string;
  }>;
}

export interface RealFunnelData {
  totalVisitors: number;
  stages: Array<{
    step: string;
    visitors: number;
    dropRate: string;
    avgTimeSeconds: number;
  }>;
  cameraAngles: Array<{
    name: string;
    views: number;
    avgDuration: string;
    engagement: "Low" | "Medium" | "High" | "Very High";
  }>;
  deviceViews: Array<{ device: string; share: number; count: number }>;
}

export interface ActiveViewerSession {
  id: string;
  device: "Desktop" | "Mobile" | "Tablet";
  activeModel: string;
  currentAngle: string;
  lastAction: string;
  lastActiveAgo: string;
  isCurrentSession?: boolean;
}

export interface RealSavedBuild {
  id: string;
  vehicleModel: string;
  year: string;
  exteriorFinish: string;
  exteriorHex: string;
  wheels: string;
  windowTint: string;
  activeLivery: string;
  totalMSRP: number;
  addedOptionsValue: number;
  intentScore: "High" | "Medium" | "Converted";
  savedAgo: string;
}

export interface RealAcquisitionData {
  totalTrackedVisitors: number;
  paidTrafficRatio: number;
  organicTrafficRatio: number;
  topChannel: string;
  totalPipelineValue: number;
  sources: Array<{
    source: string;
    medium: string;
    visitors: number;
    share: number;
    color: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    source: string;
    medium: string;
    visitors: number;
    builds: number;
    deposits: number;
    pipelineValue: number;
    conversionRate: string;
  }>;
  channelConversion: Array<{
    channel: string;
    conversionRate: number;
    avgOrderValue: number;
    color: string;
  }>;
}

const EVENTS_STORAGE_KEY = "customly_analytics_events";
const LEADS_STORAGE_KEY = "customly_commission_leads";
const BUILDS_STORAGE_KEY = "customly_saved_builds";

/**
 * Fetch all real telemetry events from Supabase, with localStorage fallback.
 */
export async function fetchAllRealEvents(): Promise<TelemetryEvent[]> {
  const localEvents: TelemetryEvent[] = (() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  if (!supabase) return localEvents;

  try {
    const { data, error } = await supabase
      .from("telemetry_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !data) return localEvents;

    const remoteEvents: TelemetryEvent[] = data.map((d: { id: string; event_name: string; metadata?: Record<string, unknown>; created_at: string }) => ({
      id: d.id,
      eventName: d.event_name as TelemetryEvent["eventName"],
      metadata: d.metadata || {},
      timestamp: d.created_at,
    }));

    // Merge and deduplicate by ID
    const eventMap = new Map<string, TelemetryEvent>();
    localEvents.forEach((e) => eventMap.set(e.id, e));
    remoteEvents.forEach((e) => eventMap.set(e.id, e));

    return Array.from(eventMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return localEvents;
  }
}

/**
 * Fetch all real commission leads from Supabase, with localStorage fallback.
 */
export async function fetchAllRealLeads(): Promise<VehicleCommissionLead[]> {
  const localLeads: VehicleCommissionLead[] = (() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LEADS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  if (!supabase) return localLeads;

  try {
    const { data, error } = await supabase
      .from("commission_leads")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !data) return localLeads;

    interface SupabaseRow {
      id: string;
      client_name: string;
      email: string;
      phone: string | null;
      location: string | null;
      vehicle_model: string;
      exterior_finish: string | null;
      exterior_color: string | null;
      wheel_design: string | null;
      wheel_color: string | null;
      glass_tint: string | null;
      caliper_color: string | null;
      active_decals: string[] | null;
      base_price: number | string | null;
      options_total: number | string | null;
      total_price: number | string | null;
      deposit_status: VehicleCommissionLead["depositStatus"];
      payment_method: VehicleCommissionLead["paymentMethod"];
      submitted_at: string;
    }

    const remoteLeads: VehicleCommissionLead[] = (data as unknown as SupabaseRow[]).map((d) => ({
      id: d.id,
      clientName: d.client_name,
      email: d.email,
      phone: d.phone || "",
      location: d.location || "",
      vehicleModel: d.vehicle_model,
      exteriorFinish: d.exterior_finish || "High-Gloss Mirror Finish",
      exteriorColor: d.exterior_color || "#0a0a0a",
      wheelDesign: d.wheel_design || "Forged Alloy Wheels",
      wheelColor: d.wheel_color || "#ffffff",
      glassTint: d.glass_tint || "Clear Crystal Factory",
      caliperColor: d.caliper_color || "Ceramic Red",
      activeDecals: d.active_decals || [],
      basePrice: Number(d.base_price || 0),
      optionsTotal: Number(d.options_total || 0),
      totalPrice: Number(d.total_price || 0),
      depositStatus: d.deposit_status,
      paymentMethod: d.payment_method,
      submittedAt: new Date(d.submitted_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // Merge and deduplicate by ID
    const leadMap = new Map<string, VehicleCommissionLead>();
    localLeads.forEach((l) => leadMap.set(l.id, l));
    remoteLeads.forEach((l) => leadMap.set(l.id, l));

    return Array.from(leadMap.values());
  } catch {
    return localLeads;
  }
}

/**
 * Fetch all saved builds from localStorage and commission leads.
 */
export async function fetchAllRealSavedBuilds(): Promise<RealSavedBuild[]> {
  const leads = await fetchAllRealLeads();

  const localBuilds: RealSavedBuild[] = (() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(BUILDS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  const leadBuilds: RealSavedBuild[] = leads.map((lead) => ({
    id: lead.id,
    vehicleModel: lead.vehicleModel,
    year: "2024 Edition",
    exteriorFinish: lead.exteriorFinish,
    exteriorHex: lead.exteriorColor,
    wheels: `${lead.wheelDesign} (${lead.wheelColor})`,
    windowTint: lead.glassTint,
    activeLivery: lead.activeDecals.length > 0 ? lead.activeDecals.join(", ") : "Standard Livery",
    totalMSRP: lead.totalPrice,
    addedOptionsValue: lead.optionsTotal,
    intentScore: lead.depositStatus.includes("Deposited") ? "Converted" : "High",
    savedAgo: lead.submittedAt,
  }));

  const buildMap = new Map<string, RealSavedBuild>();
  localBuilds.forEach((b) => buildMap.set(b.id, b));
  leadBuilds.forEach((b) => buildMap.set(b.id, b));

  return Array.from(buildMap.values());
}

/**
 * Computes live Real Dashboard Metrics directly from events and leads.
 */
export function computeRealDashboardMetrics(
  events: TelemetryEvent[],
  leads: VehicleCommissionLead[]
): RealDashboardMetrics {
  const totalPipelineValue = leads.reduce((acc, lead) => acc + (lead.totalPrice || 0), 0);
  const depositedLeads = leads.filter((l) => l.depositStatus?.includes("Deposited"));
  const depositsCollectedCount = depositedLeads.length;
  const depositsCollectedValue = depositsCollectedCount * 5000;

  const studioEnters = events.filter((e) => e.eventName === "STUDIO_ENTER").length;
  const totalConfigurations = Math.max(leads.length, events.filter((e) => e.eventName === "COMMISSION_SUBMITTED" || e.eventName === "SPEC_SHEET_OPENED").length);
  const completionRateNum = studioEnters > 0 ? ((totalConfigurations / studioEnters) * 100).toFixed(1) : "0.0";

  // Calculate active visitors in last 30 minutes
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentEvents = events.filter((e) => new Date(e.timestamp).getTime() > thirtyMinAgo);
  const uniqueRecentSessions = new Set(recentEvents.map((e) => (e.metadata?.sessionId as string) || e.id)).size;
  const activeStudios = Math.max(1, uniqueRecentSessions);

  // Vehicle model breakdown from leads and MODEL_SELECTED events
  const modelCounts: Record<string, number> = {};
  leads.forEach((l) => {
    modelCounts[l.vehicleModel] = (modelCounts[l.vehicleModel] || 0) + 1;
  });
  events
    .filter((e) => e.eventName === "MODEL_SELECTED" && e.metadata?.modelName)
    .forEach((e) => {
      const name = String(e.metadata?.modelName);
      modelCounts[name] = (modelCounts[name] || 0) + 1;
    });

  const totalModelSelections = Object.values(modelCounts).reduce((a, b) => a + b, 0) || 1;
  const modelColors: Record<string, string> = {
    "Porsche 911 992": "#d16b54",
    "Audi RS6 Avant": "#38bdf8",
    "Audi RS8 Sport": "#a855f7",
    "Audi R8 V10": "#eab308",
    "Lamborghini Revuelto": "#10b981",
  };

  const vehicleModelBreakdown = Object.entries(modelCounts).map(([name, count]) => ({
    name,
    count,
    share: Number(((count / totalModelSelections) * 100).toFixed(1)),
    color: modelColors[name] || "#38bdf8",
  })).sort((a, b) => b.count - a.count);

  // Group activity by day of the week (last 7 days)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendMap: Record<string, { pipelineValue: number; sessions: number }> = {};
  days.forEach((d) => {
    trendMap[d] = { pipelineValue: 0, sessions: 0 };
  });

  events.forEach((e) => {
    const d = days[new Date(e.timestamp).getDay()];
    if (trendMap[d]) trendMap[d].sessions += 1;
  });

  leads.forEach((l) => {
    // If submittedAt is recent or parseable
    const d = days[new Date().getDay()];
    if (trendMap[d]) trendMap[d].pipelineValue += l.totalPrice || 0;
  });

  const pipelineTrend = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    pipelineValue: trendMap[day]?.pipelineValue || 0,
    sessions: trendMap[day]?.sessions || 0,
  }));

  return {
    commissionPipelineValue: totalPipelineValue,
    depositsCollectedValue,
    depositsCollectedCount,
    totalConfigurations,
    completedBuildRate: `${completionRateNum}%`,
    activeStudios,
    pipelineTrend,
    vehicleModelBreakdown: vehicleModelBreakdown.length > 0 ? vehicleModelBreakdown : [
      { name: "Porsche 911 992", count: 0, share: 0, color: "#d16b54" },
    ],
    recentLeads: leads.slice(0, 5),
  };
}

/**
 * Computes live Real Preferences Data directly from events and leads.
 */
export function computeRealPreferences(
  events: TelemetryEvent[],
  leads: VehicleCommissionLead[]
): RealPreferencesData {
  // 1. Paint Finishes
  const finishCounts: Record<string, number> = {
    "Satin Matte Clearcoat": 0,
    "High-Gloss Mirror Finish": 0,
    "Metallic Pearl": 0,
    "Bespoke Wrap": 0,
  };

  leads.forEach((l) => {
    if (l.exteriorFinish && finishCounts[l.exteriorFinish] !== undefined) {
      finishCounts[l.exteriorFinish] += 1;
    } else if (l.exteriorFinish?.includes("Matte")) {
      finishCounts["Satin Matte Clearcoat"] += 1;
    } else {
      finishCounts["High-Gloss Mirror Finish"] += 1;
    }
  });

  events.filter((e) => e.eventName === "PAINT_CHANGED").forEach((e) => {
    const finish = String(e.metadata?.finish || "");
    if (finish.includes("Matte")) finishCounts["Satin Matte Clearcoat"] += 1;
    else if (finish.includes("Pearl")) finishCounts["Metallic Pearl"] += 1;
    else finishCounts["High-Gloss Mirror Finish"] += 1;
  });

  const totalPaintPicks = Object.values(finishCounts).reduce((a, b) => a + b, 0) || 1;
  const paintFinishes = [
    { name: "Satin Matte Clearcoat", count: finishCounts["Satin Matte Clearcoat"], share: Number(((finishCounts["Satin Matte Clearcoat"] / totalPaintPicks) * 100).toFixed(1)), color: "#d16b54" },
    { name: "High-Gloss Mirror Finish", count: finishCounts["High-Gloss Mirror Finish"], share: Number(((finishCounts["High-Gloss Mirror Finish"] / totalPaintPicks) * 100).toFixed(1)), color: "#38bdf8" },
    { name: "Metallic Pearl", count: finishCounts["Metallic Pearl"], share: Number(((finishCounts["Metallic Pearl"] / totalPaintPicks) * 100).toFixed(1)), color: "#eab308" },
    { name: "Bespoke Wrap", count: finishCounts["Bespoke Wrap"], share: Number(((finishCounts["Bespoke Wrap"] / totalPaintPicks) * 100).toFixed(1)), color: "#10b981" },
  ];

  // 2. Wheel choices
  const wheelCounts: Record<string, { count: number; avgPrice: number }> = {
    "Forged Aero Turbine": { count: 0, avgPrice: 4800 },
    "Lightweight Monoblock": { count: 0, avgPrice: 3800 },
    "Carbon Composite Multi-Spoke": { count: 0, avgPrice: 6200 },
    "Classic Brushed Silver": { count: 0, avgPrice: 2200 },
  };

  leads.forEach((l) => {
    const design = l.wheelDesign || "Forged Aero Turbine";
    const key = Object.keys(wheelCounts).find((k) => design.includes(k)) || "Forged Aero Turbine";
    wheelCounts[key].count += 1;
  });

  events.filter((e) => e.eventName === "WHEELS_CHANGED").forEach((e) => {
    const design = String(e.metadata?.wheelDesign || "Forged Aero Turbine");
    const key = Object.keys(wheelCounts).find((k) => design.includes(k)) || "Forged Aero Turbine";
    wheelCounts[key].count += 1;
  });

  const totalWheels = Object.values(wheelCounts).reduce((a, b) => a + b.count, 0) || 1;
  const wheelChoices = Object.entries(wheelCounts).map(([name, val]) => ({
    name,
    selections: val.count,
    share: Number(((val.count / totalWheels) * 100).toFixed(1)),
    avgOptionPrice: val.avgPrice,
  }));

  // 3. Decal placements & AR Usage
  const decalCounts: Record<string, number> = {
    "AR Real-Car Surface (WebXR)": 0,
    "Driver Door Panel": 0,
    "Passenger Door Panel": 0,
    "Front Hood Center": 0,
    "Rear Diffuser / Quarter": 0,
  };

  let arStickersPlaced = 0;
  events.filter((e) => e.eventName === "DECAL_APPLIED").forEach((e) => {
    const isAR = e.metadata?.mode === "WebXR_AR_HitTest" || String(e.metadata?.location || "").includes("AR");
    if (isAR) {
      decalCounts["AR Real-Car Surface (WebXR)"] += 1;
      arStickersPlaced += 1;
    } else {
      const loc = String(e.metadata?.location || "Driver Door Panel");
      if (decalCounts[loc] !== undefined) decalCounts[loc] += 1;
      else decalCounts["Driver Door Panel"] += 1;
    }
  });

  const arSessionsLaunched = events.filter((e) => e.eventName === "AR_SESSION_STARTED").length;
  const arSnapshotsCaptured = events.filter((e) => e.eventName === "AR_SNAPSHOT_CAPTURED").length;

  const totalDecals = Object.values(decalCounts).reduce((a, b) => a + b, 0) || 1;
  const decalPlacements = Object.entries(decalCounts).map(([location, count]) => ({
    location,
    count,
    share: `${((count / totalDecals) * 100).toFixed(1)}%`,
  }));

  // 4. Top combinations from real leads
  const comboMap: Record<string, { count: number; prices: number[]; topModel: string }> = {};
  leads.forEach((l) => {
    const key = `${l.exteriorFinish} + ${l.wheelDesign} + ${l.glassTint}`;
    if (!comboMap[key]) {
      comboMap[key] = { count: 0, prices: [], topModel: l.vehicleModel };
    }
    comboMap[key].count += 1;
    comboMap[key].prices.push(l.totalPrice || 0);
  });

  const topCombinations = Object.entries(comboMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([combo, data]) => {
      const avg = data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0;
      return {
        combo,
        share: `${((data.count / (leads.length || 1)) * 100).toFixed(1)}%`,
        volume: data.count,
        avgMSRP: `$${avg.toLocaleString()}`,
        topModel: data.topModel,
      };
    });

  return {
    paintFinishes,
    wheelChoices,
    decalPlacements,
    arStats: {
      sessionsLaunched: arSessionsLaunched,
      stickersPlacedInAR: arStickersPlaced,
      snapshotsCaptured: arSnapshotsCaptured,
    },
    topCombinations,
  };
}

/**
 * Computes live Real Funnel Data directly from events and leads.
 */
export function computeRealFunnel(events: TelemetryEvent[]): RealFunnelData {
  const enters = events.filter((e) => e.eventName === "STUDIO_ENTER").length;
  const models = events.filter((e) => e.eventName === "MODEL_SELECTED").length;
  const customizes = events.filter((e) => e.eventName === "PAINT_CHANGED" || e.eventName === "WHEELS_CHANGED" || e.eventName === "DECAL_APPLIED").length;
  const specs = events.filter((e) => e.eventName === "SPEC_SHEET_OPENED").length;
  const submissions = events.filter((e) => e.eventName === "COMMISSION_SUBMITTED").length;

  const totalVisitors = Math.max(enters, 1);

  const stages = [
    {
      step: "Step 1: Studio Launch",
      visitors: totalVisitors,
      dropRate: enters > 0 && models > 0 ? `${Math.max(0, Math.round(((totalVisitors - models) / totalVisitors) * 100))}%` : "0%",
      avgTimeSeconds: 4,
    },
    {
      step: "Step 2: Vehicle Selected",
      visitors: models,
      dropRate: models > 0 && customizes > 0 ? `${Math.max(0, Math.round(((models - customizes) / models) * 100))}%` : "0%",
      avgTimeSeconds: 16,
    },
    {
      step: "Step 3: Custom Styling & Paint",
      visitors: customizes,
      dropRate: customizes > 0 && specs > 0 ? `${Math.max(0, Math.round(((customizes - specs) / customizes) * 100))}%` : "0%",
      avgTimeSeconds: 68,
    },
    {
      step: "Step 4: Spec Sheet Explored",
      visitors: specs,
      dropRate: specs > 0 && submissions > 0 ? `${Math.max(0, Math.round(((specs - submissions) / specs) * 100))}%` : "0%",
      avgTimeSeconds: 45,
    },
    {
      step: "Step 5: Reservation / Quote Placed",
      visitors: submissions,
      dropRate: "0%",
      avgTimeSeconds: 28,
    },
  ];

  // Camera angles & AR Camera views
  const angleCounts: Record<string, number> = {
    "AR Real-Car Camera (WebXR)": 0,
    "Driver Side Profile (90°)": 0,
    "3/4 Front Beauty View (45°)": 0,
    "Cockpit / Interior View": 0,
    "Rear Fascia & Diffuser (180°)": 0,
    "Front Fascia & Grille (0°)": 0,
  };

  events.forEach((e) => {
    if (e.eventName === "AR_SESSION_STARTED" || (e.eventName === "DECAL_APPLIED" && e.metadata?.mode === "WebXR_AR_HitTest")) {
      angleCounts["AR Real-Car Camera (WebXR)"] += 1;
    } else if (e.eventName === "VIEW_MODE_TOGGLED") {
      const angle = String(e.metadata?.angle || e.metadata?.viewMode || "");
      if (angle.includes("interior") || angle.includes("Cockpit")) {
        angleCounts["Cockpit / Interior View"] += 1;
      } else if (angle.includes("Side") || angle.includes("90")) {
        angleCounts["Driver Side Profile (90°)"] += 1;
      } else if (angle.includes("Rear") || angle.includes("180")) {
        angleCounts["Rear Fascia & Diffuser (180°)"] += 1;
      } else if (angle.includes("Front") || angle.includes("0")) {
        angleCounts["Front Fascia & Grille (0°)"] += 1;
      } else {
        angleCounts["3/4 Front Beauty View (45°)"] += 1;
      }
    }
  });

  const cameraAngles = Object.entries(angleCounts).map(([name, views]) => {
    const engagement: "Low" | "Medium" | "High" | "Very High" =
      views > 20 ? "Very High" : views > 10 ? "High" : views > 3 ? "Medium" : "Low";
    return {
      name,
      views,
      avgDuration: `${Math.min(45, 12 + views * 2)}s`,
      engagement,
    };
  });

  // Devices
  const deviceCounts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
  events.forEach((e) => {
    const dev = String(e.metadata?.device || "Desktop");
    if (deviceCounts[dev] !== undefined) deviceCounts[dev] += 1;
    else deviceCounts["Desktop"] += 1;
  });

  const totalDev = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
  const deviceViews = Object.entries(deviceCounts).map(([device, count]) => ({
    device,
    count,
    share: Number(((count / totalDev) * 100).toFixed(1)),
  }));

  return {
    totalVisitors,
    stages,
    cameraAngles,
    deviceViews,
  };
}

/**
 * 1-Click Function to Seed Real Test Traffic directly into Supabase & LocalStorage.
 * Inserts genuine rows into `telemetry_events` and `commission_leads` so all charts populate with real DB records.
 */
export async function seedRealTelemetryData(): Promise<{ success: boolean; eventsCreated: number; leadsCreated: number }> {
  const testLeads: VehicleCommissionLead[] = [
    {
      id: `CMD-${Date.now()}-01`,
      clientName: "Elena Rostova",
      email: "elena.rostova@geneva-motors.ch",
      phone: "+41 22 819 9021",
      location: "Geneva, Switzerland",
      vehicleModel: "Porsche 911 992",
      exteriorFinish: "Satin Matte Clearcoat",
      exteriorColor: "#d2b48c",
      wheelDesign: "Forged Aero Turbine",
      wheelColor: "#d4af37",
      glassTint: "Limousine 5%",
      caliperColor: "Ceramic Red",
      activeDecals: ["Apex GT Crest"],
      basePrice: 142700,
      optionsTotal: 12400,
      totalPrice: 155100,
      depositStatus: "Deposited ($5,000)",
      paymentMethod: "Credit Card",
      submittedAt: "10m ago",
      utmSource: "instagram",
      utmMedium: "paid_social",
      utmCampaign: "porsche_911_launch",
      utmContent: "reel_video_gt3_carbon",
    },
    {
      id: `CMD-${Date.now()}-02`,
      clientName: "Marcus Sterling",
      email: "m.sterling@mayfaircapital.co.uk",
      phone: "+44 20 7946 0912",
      location: "London, United Kingdom",
      vehicleModel: "Audi RS6 Avant",
      exteriorFinish: "High-Gloss Mirror Finish",
      exteriorColor: "#0a0a0a",
      wheelDesign: "Lightweight Monoblock",
      wheelColor: "#111111",
      glassTint: "Clear Crystal Factory",
      caliperColor: "Acid Green",
      activeDecals: [],
      basePrice: 126000,
      optionsTotal: 14200,
      totalPrice: 140200,
      depositStatus: "Deposited ($5,000)",
      paymentMethod: "Bank Wire",
      submittedAt: "25m ago",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "bespoke_custom_cars",
      utmContent: "search_headline_custom_rs6",
    },
    {
      id: `CMD-${Date.now()}-03`,
      clientName: "David Chen",
      email: "d.chen@apextechnologies.sg",
      phone: "+65 6789 0123",
      location: "Singapore",
      vehicleModel: "Audi RS8 Sport",
      exteriorFinish: "Satin Matte Clearcoat",
      exteriorColor: "#1f2937",
      wheelDesign: "Carbon Composite Multi-Spoke",
      wheelColor: "#333333",
      glassTint: "Limousine 5%",
      caliperColor: "Bright Yellow",
      activeDecals: ["Apex Stripe"],
      basePrice: 138000,
      optionsTotal: 16800,
      totalPrice: 154800,
      depositStatus: "Quote Requested",
      paymentMethod: "Crypto (USDC)",
      submittedAt: "1h ago",
      utmSource: "youtube",
      utmMedium: "influencer",
      utmCampaign: "supercar_blondie_review",
      utmContent: "pinned_link_description",
    },
    {
      id: `CMD-${Date.now()}-04`,
      clientName: "Sophie Martin",
      email: "smartin@parisluxury.fr",
      phone: "+33 1 42 68 55 00",
      location: "Paris, France",
      vehicleModel: "Porsche 911 992",
      exteriorFinish: "Metallic Pearl",
      exteriorColor: "#ffffff",
      wheelDesign: "Classic Brushed Silver",
      wheelColor: "#cccccc",
      glassTint: "Clear Crystal Factory",
      caliperColor: "Ceramic Red",
      activeDecals: [],
      basePrice: 142700,
      optionsTotal: 8600,
      totalPrice: 151300,
      depositStatus: "Deposited ($5,000)",
      paymentMethod: "Credit Card",
      submittedAt: "2h ago",
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "concours_elegance_vip",
      utmContent: "exclusive_preview_cta",
    },
  ];

  // Store in LocalStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(testLeads));
  }

  // Push to Supabase
  if (supabase) {
    for (const lead of testLeads) {
      await supabase.from("commission_leads").upsert({
        id: lead.id,
        client_name: lead.clientName,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        vehicle_model: lead.vehicleModel,
        exterior_finish: lead.exteriorFinish,
        exterior_color: lead.exteriorColor,
        wheel_design: lead.wheelDesign,
        wheel_color: lead.wheelColor,
        glass_tint: lead.glassTint,
        caliper_color: lead.caliperColor,
        active_decals: lead.activeDecals,
        base_price: lead.basePrice,
        options_total: lead.optionsTotal,
        total_price: lead.totalPrice,
        deposit_status: lead.depositStatus,
        payment_method: lead.paymentMethod,
        submitted_at: new Date().toISOString(),
      });
    }
  }

  // Generate real telemetry events with rich UTM campaign attribution & WebXR AR telemetry
  const sampleEvents: Array<{
    id: string;
    event_name: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [
    { id: `EVT-${Date.now()}-1`, event_name: "STUDIO_ENTER", metadata: { device: "Desktop", path: "/", utm_source: "instagram", utm_medium: "social_ad", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-2`, event_name: "STUDIO_ENTER", metadata: { device: "Mobile", path: "/", utm_source: "google", utm_medium: "cpc", utm_campaign: "bespoke_custom_cars" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-3`, event_name: "STUDIO_ENTER", metadata: { device: "Desktop", path: "/", utm_source: "youtube", utm_medium: "influencer", utm_campaign: "supercar_blondie_review" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-4`, event_name: "MODEL_SELECTED", metadata: { modelName: "Porsche 911 992", utm_source: "instagram", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-5`, event_name: "MODEL_SELECTED", metadata: { modelName: "Audi RS6 Avant", utm_source: "google", utm_campaign: "bespoke_custom_cars" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-6`, event_name: "PAINT_CHANGED", metadata: { finish: "Satin Matte Clearcoat", hex: "#d2b48c", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-7`, event_name: "PAINT_CHANGED", metadata: { finish: "High-Gloss Mirror Finish", hex: "#0a0a0a", utm_campaign: "bespoke_custom_cars" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-8`, event_name: "WHEELS_CHANGED", metadata: { wheelDesign: "Forged Aero Turbine", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-9`, event_name: "VIEW_MODE_TOGGLED", metadata: { angle: "Driver Side Profile (90°)", utm_campaign: "supercar_blondie_review" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-10`, event_name: "VIEW_MODE_TOGGLED", metadata: { angle: "3/4 Front Beauty View (45°)", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-11`, event_name: "AR_SESSION_STARTED", metadata: { arMode: "WebXR Hit-Test", angle: "AR Real-Car Camera (WebXR)", device: "Mobile", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-12`, event_name: "DECAL_APPLIED", metadata: { mode: "WebXR_AR_HitTest", location: "AR Real-Car Surface (WebXR)", stickerName: "Apex GT Crest", panelPreset: "door", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-13`, event_name: "AR_SNAPSHOT_CAPTURED", metadata: { placedStickersCount: 2, arMode: "webxr", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-14`, event_name: "SPEC_SHEET_OPENED", metadata: { model: "Porsche 911 992", utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
    { id: `EVT-${Date.now()}-15`, event_name: "COMMISSION_SUBMITTED", metadata: { model: "Porsche 911 992", totalPrice: 155100, utm_campaign: "porsche_911_launch" }, created_at: new Date().toISOString() },
  ];

  if (supabase) {
    for (const evt of sampleEvents) {
      await supabase.from("telemetry_events").upsert(evt);
    }
  }

  if (typeof window !== "undefined") {
    const localSampleEvents = sampleEvents.map((s) => ({
      id: s.id,
      eventName: s.event_name as TelemetryEvent["eventName"],
      metadata: s.metadata,
      timestamp: s.created_at,
    }));
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(localSampleEvents));
  }

  return { success: true, eventsCreated: sampleEvents.length, leadsCreated: testLeads.length };
}

/**
 * Clear all local and Supabase telemetry records.
 */
export async function clearAllRealTelemetry(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    localStorage.removeItem(LEADS_STORAGE_KEY);
    localStorage.removeItem(BUILDS_STORAGE_KEY);
  }

  if (supabase) {
    try {
      await supabase.from("commission_leads").delete().neq("id", "protect_keep_schema");
      await supabase.from("telemetry_events").delete().neq("id", "protect_keep_schema");
    } catch (e) {
      console.warn("Supabase clear notice:", e);
    }
  }
}

/**
 * Extracts and formats live active viewer sessions within the last 30 minutes.
 */
export function getActiveViewerSessions(events: TelemetryEvent[]): ActiveViewerSession[] {
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentEvents = events.filter((e) => new Date(e.timestamp).getTime() > thirtyMinAgo);

  const sessionMap = new Map<string, TelemetryEvent[]>();

  recentEvents.forEach((e) => {
    const sId = (e.metadata?.sessionId as string) || e.id.split("-").slice(0, 2).join("-");
    if (!sessionMap.has(sId)) sessionMap.set(sId, []);
    sessionMap.get(sId)!.push(e);
  });

  const sessions: ActiveViewerSession[] = [];

  sessionMap.forEach((evtList, sId) => {
    evtList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest = evtList[0];
    const diffSec = Math.max(0, Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 1000));
    const timeAgo = diffSec < 60 ? `${diffSec}s ago` : `${Math.round(diffSec / 60)}m ago`;

    const dev = evtList.find((e) => e.metadata?.device)?.metadata?.device as "Desktop" | "Mobile" | "Tablet" | undefined;
    const device = dev || "Desktop";

    const modelEvt = evtList.find((e) => e.metadata?.modelName || e.metadata?.model);
    const activeModel = String(modelEvt?.metadata?.modelName || modelEvt?.metadata?.model || "Porsche 911 992");

    const angleEvt = evtList.find((e) => e.metadata?.angle || e.metadata?.viewMode);
    const currentAngle = String(angleEvt?.metadata?.angle || (angleEvt?.metadata?.viewMode === "interior" ? "Cockpit / Interior View" : "3/4 Front Beauty View (45°)"));

    const actionNames: Record<string, string> = {
      STUDIO_ENTER: "Launched 3D Studio",
      MODEL_SELECTED: "Exploring Car Models",
      PAINT_CHANGED: "Customizing Paint & Finish",
      WHEELS_CHANGED: "Selecting Wheels & Accents",
      DECAL_APPLIED: "Applying Stickers & Decals",
      AR_SESSION_STARTED: "Launched WebXR AR Sticker Camera",
      AR_SNAPSHOT_CAPTURED: "Captured AR Car Sticker Photo",
      VIEW_MODE_TOGGLED: "Inspecting 3D Angles",
      SPEC_SHEET_OPENED: "Reviewing Specification Sheet",
      COMMISSION_SUBMITTED: "Submitted Bespoke Order",
    };

    sessions.push({
      id: sId,
      device,
      activeModel,
      currentAngle,
      lastAction: actionNames[latest.eventName] || "Interacting in Studio",
      lastActiveAgo: diffSec < 15 ? "Active now" : timeAgo,
      isCurrentSession: true,
    });
  });

  if (sessions.length === 0) {
    sessions.push({
      id: "SES-LIVE-ADMIN",
      device: typeof window !== "undefined" && window.innerWidth < 768 ? "Mobile" : "Desktop",
      activeModel: "Porsche 911 992",
      currentAngle: "3/4 Front Beauty View (45°)",
      lastAction: "Live Studio Session",
      lastActiveAgo: "Active now",
      isCurrentSession: true,
    });
  }

  return sessions;
}

/**
 * Computes acquisition & campaign analytics from real telemetry and commission leads.
 */
export function computeRealAcquisition(
  events: TelemetryEvent[],
  leads: VehicleCommissionLead[]
): RealAcquisitionData {
  // Map sessions to UTM data
  const sessionMap = new Map<
    string,
    {
      source: string;
      medium: string;
      campaign: string;
      events: TelemetryEvent[];
      lead?: VehicleCommissionLead;
    }
  >();

  events.forEach((e) => {
    const sId =
      (e.metadata?.sessionId as string) ||
      e.id.split("-").slice(0, 2).join("-");
    if (!sessionMap.has(sId)) {
      const src =
        (e.metadata?.utm_source as string) ||
        (e.metadata?.referrer && (e.metadata.referrer as string).includes("google")
          ? "google"
          : (e.metadata?.referrer && (e.metadata.referrer as string).includes("instagram")
          ? "instagram"
          : (e.metadata?.referrer && (e.metadata.referrer as string).includes("youtube")
          ? "youtube"
          : "direct")));
      const med =
        (e.metadata?.utm_medium as string) ||
        (src === "direct" ? "none" : src === "google" ? "organic" : "social");
      const camp =
        (e.metadata?.utm_campaign as string) ||
        (src === "direct" ? "direct_nav" : "general_brand");

      sessionMap.set(sId, {
        source: src,
        medium: med,
        campaign: camp,
        events: [],
      });
    }
    sessionMap.get(sId)!.events.push(e);
  });

  // Attach leads to sessions if matching sessionId or fallback by utmSource
  leads.forEach((l) => {
    const foundSession = sessionMap.get(l.id);
    if (foundSession) {
      foundSession.lead = l;
      if (l.utmSource) foundSession.source = l.utmSource;
      if (l.utmMedium) foundSession.medium = l.utmMedium;
      if (l.utmCampaign) foundSession.campaign = l.utmCampaign;
    } else {
      sessionMap.set(`lead-${l.id}`, {
        source: l.utmSource || "direct",
        medium: l.utmMedium || (l.utmSource ? "cpc" : "none"),
        campaign: l.utmCampaign || "bespoke_commission",
        events: [],
        lead: l,
      });
    }
  });

  // Aggregators
  const sourceCounts: Record<string, { medium: string; visitors: number }> = {};
  const campaignAgg: Record<
    string,
    {
      source: string;
      medium: string;
      visitors: number;
      builds: number;
      deposits: number;
      pipelineValue: number;
    }
  > = {};

  const channelMap: Record<
    string,
    { visitors: number; orders: number; pipeline: number }
  > = {
    "Instagram Ads": { visitors: 0, orders: 0, pipeline: 0 },
    "Google Search": { visitors: 0, orders: 0, pipeline: 0 },
    "YouTube Influencer": { visitors: 0, orders: 0, pipeline: 0 },
    "Private Newsletter": { visitors: 0, orders: 0, pipeline: 0 },
    "Organic / Direct": { visitors: 0, orders: 0, pipeline: 0 },
  };

  sessionMap.forEach((val) => {
    const srcKey = val.source.toLowerCase();
    const medKey = val.medium.toLowerCase();
    const campKey = val.campaign;

    // Source count
    if (!sourceCounts[srcKey]) {
      sourceCounts[srcKey] = { medium: medKey, visitors: 0 };
    }
    sourceCounts[srcKey].visitors += 1;

    // Campaign count
    if (!campaignAgg[campKey]) {
      campaignAgg[campKey] = {
        source: val.source,
        medium: val.medium,
        visitors: 0,
        builds: 0,
        deposits: 0,
        pipelineValue: 0,
      };
    }
    campaignAgg[campKey].visitors += 1;

    // Builds
    const hasBuild = val.events.some(
      (e) =>
        e.eventName === "SPEC_SHEET_OPENED" ||
        e.eventName === "COMMISSION_SUBMITTED"
    );
    if (hasBuild) campaignAgg[campKey].builds += 1;

    // Deposits / Pipeline
    if (val.lead) {
      if (val.lead.depositStatus.includes("Deposited")) {
        campaignAgg[campKey].deposits += 1;
      }
      campaignAgg[campKey].pipelineValue += val.lead.totalPrice || 215000;
    }

    // Channel map bucket
    let assignedChannel = "Organic / Direct";
    if (srcKey.includes("instagram") || srcKey.includes("meta")) {
      assignedChannel = "Instagram Ads";
    } else if (srcKey.includes("google")) {
      assignedChannel = medKey.includes("cpc") ? "Google Search" : "Organic / Direct";
    } else if (srcKey.includes("youtube")) {
      assignedChannel = "YouTube Influencer";
    } else if (srcKey.includes("email") || srcKey.includes("newsletter")) {
      assignedChannel = "Private Newsletter";
    }

    if (channelMap[assignedChannel]) {
      channelMap[assignedChannel].visitors += 1;
      if (val.lead) {
        channelMap[assignedChannel].orders += 1;
        channelMap[assignedChannel].pipeline += val.lead.totalPrice || 215000;
      }
    }
  });

  const totalVisitors = Math.max(sessionMap.size, 1);

  // Palette colors for sources
  const palette = ["#026dfe", "#d16b54", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

  const sources = Object.entries(sourceCounts)
    .sort((a, b) => b[1].visitors - a[1].visitors)
    .map(([src, d], idx) => ({
      source: src.charAt(0).toUpperCase() + src.slice(1),
      medium: d.medium,
      visitors: d.visitors,
      share: Math.round((d.visitors / totalVisitors) * 100),
      color: palette[idx % palette.length],
    }));

  const campaigns = Object.entries(campaignAgg)
    .sort((a, b) => b[1].pipelineValue - a[1].pipelineValue || b[1].visitors - a[1].visitors)
    .map(([name, d], idx) => {
      const cr = d.visitors > 0 ? ((d.deposits / d.visitors) * 100).toFixed(1) : "0.0";
      return {
        id: `camp-${idx + 1}`,
        name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        source: d.source,
        medium: d.medium,
        visitors: d.visitors,
        builds: d.builds,
        deposits: d.deposits,
        pipelineValue: d.pipelineValue,
        conversionRate: `${cr}%`,
      };
    });

  const channelColors: Record<string, string> = {
    "Instagram Ads": "#ec4899",
    "Google Search": "#026dfe",
    "YouTube Influencer": "#ef4444",
    "Private Newsletter": "#10b981",
    "Organic / Direct": "#8b5cf6",
  };

  const channelConversion = Object.entries(channelMap).map(([chan, val]) => {
    const convRate = val.visitors > 0 ? +((val.orders / val.visitors) * 100).toFixed(1) : 0;
    const avgOrder = val.orders > 0 ? Math.round(val.pipeline / val.orders) : 0;
    return {
      channel: chan,
      conversionRate: convRate,
      avgOrderValue: avgOrder,
      color: channelColors[chan] || "#026dfe",
    };
  });

  const paidVisitors = sources
    .filter((s) => ["cpc", "paid", "social", "influencer", "ads"].includes(s.medium.toLowerCase()))
    .reduce((sum, s) => sum + s.visitors, 0);

  const paidRatio = Math.round((paidVisitors / totalVisitors) * 100);
  const organicRatio = 100 - paidRatio;
  const topChannel = sources[0]?.source || "Direct";
  const totalPipeline = leads.reduce((sum, l) => sum + (l.totalPrice || 0), 0);

  return {
    totalTrackedVisitors: totalVisitors,
    paidTrafficRatio: paidRatio,
    organicTrafficRatio: organicRatio,
    topChannel,
    totalPipelineValue: totalPipeline,
    sources,
    campaigns,
    channelConversion,
  };
}

