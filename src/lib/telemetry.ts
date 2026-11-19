"use client";

import { VehicleCommissionLead } from "./adminData";
import { supabase } from "./supabase";

export interface TelemetryEvent {
  id: string;
  eventName:
    | "STUDIO_ENTER"
    | "MODEL_SELECTED"
    | "PAINT_CHANGED"
    | "WHEELS_CHANGED"
    | "GLASS_TINT_CHANGED"
    | "DECAL_APPLIED"
    | "AR_SESSION_STARTED"
    | "AR_SNAPSHOT_CAPTURED"
    | "VIEW_MODE_TOGGLED"
    | "SPEC_SHEET_OPENED"
    | "COMMISSION_SUBMITTED";
  modelId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

const EVENTS_STORAGE_KEY = "customly_analytics_events";
const LEADS_STORAGE_KEY = "customly_commission_leads";
const UTM_STORAGE_KEY = "customly_utm_params";

/**
 * Parses and stores UTM tracking parameters from URL query string or document referrer.
 */
export function captureUTMParams(): UTMParameters {
  if (typeof window === "undefined") return { utm_source: "direct", utm_medium: "direct", utm_campaign: "direct" };

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get("utm_source") || undefined;
    const utm_medium = urlParams.get("utm_medium") || undefined;
    const utm_campaign = urlParams.get("utm_campaign") || undefined;
    const utm_term = urlParams.get("utm_term") || undefined;
    const utm_content = urlParams.get("utm_content") || undefined;

    let referrerHostname: string | undefined = undefined;
    if (document.referrer) {
      try {
        referrerHostname = new URL(document.referrer).hostname;
      } catch {
        // ignore malformed referrer
      }
    }

    // Explicit UTM parameters take top precedence
    if (utm_source || utm_campaign) {
      const captured: UTMParameters = {
        utm_source: utm_source || "unknown",
        utm_medium: utm_medium || (utm_source === "google" ? "cpc" : "social_ad"),
        utm_campaign: utm_campaign || "campaign_general",
        utm_term,
        utm_content,
        referrer: referrerHostname,
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
      return captured;
    }

    // Check existing stored session
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY) || localStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Infer from organic referrer if external
    if (referrerHostname && !referrerHostname.includes(window.location.hostname)) {
      const isSearch = referrerHostname.includes("google") || referrerHostname.includes("bing") || referrerHostname.includes("yahoo");
      const isSocial = referrerHostname.includes("instagram") || referrerHostname.includes("t.co") || referrerHostname.includes("twitter") || referrerHostname.includes("facebook") || referrerHostname.includes("tiktok") || referrerHostname.includes("youtube");

      const inferred: UTMParameters = {
        utm_source: referrerHostname.replace("www.", ""),
        utm_medium: isSearch ? "organic_search" : isSocial ? "organic_social" : "referral",
        utm_campaign: "organic_referral",
        referrer: referrerHostname,
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(inferred));
      return inferred;
    }

    const direct: UTMParameters = {
      utm_source: "direct",
      utm_medium: "none",
      utm_campaign: "direct_studio",
    };
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(direct));
    return direct;
  } catch {
    return { utm_source: "direct", utm_medium: "none", utm_campaign: "direct_studio" };
  }
}

export function getStoredUTMParams(): UTMParameters {
  if (typeof window === "undefined") return { utm_source: "direct", utm_medium: "none", utm_campaign: "direct_studio" };
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY) || localStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return captureUTMParams();
  } catch {
    return { utm_source: "direct", utm_medium: "none", utm_campaign: "direct_studio" };
  }
}

/**
 * Non-blocking event tracker for 3D configurator telemetry.
 * Automatically saves to localStorage and Supabase, injecting UTM context.
 */
export function trackStudioEvent(
  eventName: TelemetryEvent["eventName"],
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  try {
    const utm = getStoredUTMParams();

    const mergedMetadata: Record<string, unknown> = {
      ...(metadata || {}),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    };

    const event: TelemetryEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName,
      metadata: mergedMetadata,
      timestamp: new Date().toISOString(),
    };

    // 1. Local Storage queue (keeps last 500 events)
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    const events: TelemetryEvent[] = stored ? JSON.parse(stored) : [];
    events.unshift(event);
    if (events.length > 500) events.pop();
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));

    // 2. Supabase background push (non-blocking)
    if (supabase) {
      Promise.resolve(
        supabase.from("telemetry_events").insert({
          id: event.id,
          event_name: event.eventName,
          metadata: event.metadata,
          created_at: event.timestamp,
        })
      ).catch(() => {});
    }
  } catch (err) {
    // Failsafe to protect 3D canvas execution
    console.debug("[Telemetry] skipped", err);
  }
}

/**
 * Saves a new bespoke commission lead to both LocalStorage and Supabase.
 */
export async function recordCommissionLead(lead: VehicleCommissionLead) {
  if (typeof window === "undefined") return;

  try {
    const utm = getStoredUTMParams();
    const enrichedLead: VehicleCommissionLead = {
      ...lead,
      utmSource: lead.utmSource || utm.utm_source,
      utmMedium: lead.utmMedium || utm.utm_medium,
      utmCampaign: lead.utmCampaign || utm.utm_campaign,
      utmContent: lead.utmContent || utm.utm_content,
    };

    // 1. Save locally for instant offline preview
    const stored = localStorage.getItem(LEADS_STORAGE_KEY);
    const leads: VehicleCommissionLead[] = stored ? JSON.parse(stored) : [];
    leads.unshift(enrichedLead);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));

    // 2. Push to Supabase if configured
    if (supabase) {
      const { error } = await supabase.from("commission_leads").insert({
        id: enrichedLead.id,
        client_name: enrichedLead.clientName,
        email: enrichedLead.email,
        phone: enrichedLead.phone,
        location: enrichedLead.location,
        vehicle_model: enrichedLead.vehicleModel,
        exterior_finish: enrichedLead.exteriorFinish,
        exterior_color: enrichedLead.exteriorColor,
        wheel_design: enrichedLead.wheelDesign,
        wheel_color: enrichedLead.wheelColor,
        glass_tint: enrichedLead.glassTint,
        caliper_color: enrichedLead.caliperColor,
        active_decals: enrichedLead.activeDecals,
        base_price: enrichedLead.basePrice,
        options_total: enrichedLead.optionsTotal,
        total_price: enrichedLead.totalPrice,
        deposit_status: enrichedLead.depositStatus,
        payment_method: enrichedLead.paymentMethod,
        submitted_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[Supabase] Insert lead notice:", error.message);
      }
    }
  } catch (err) {
    console.error("[Commission Lead] save error", err);
  }
}

/**
 * Retrieves all saved leads from localStorage.
 */
export function getSavedCommissionLeads(): VehicleCommissionLead[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(LEADS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // fallback
  }

  return [];
}

interface SupabaseCommissionLeadRow {
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

/**
 * Fetches fresh leads directly from Supabase, falling back to local leads.
 */
export async function fetchSupabaseLeads(): Promise<VehicleCommissionLead[]> {
  if (!supabase) return getSavedCommissionLeads();

  try {
    const { data, error } = await supabase
      .from("commission_leads")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return getSavedCommissionLeads();
    }

    const mapped: VehicleCommissionLead[] = (
      data as unknown as SupabaseCommissionLeadRow[]
    ).map((d) => ({
      id: d.id,
      clientName: d.client_name,
      email: d.email,
      phone: d.phone || "",
      location: d.location || "",
      vehicleModel: d.vehicle_model,
      exteriorFinish: d.exterior_finish || "",
      exteriorColor: d.exterior_color || "",
      wheelDesign: d.wheel_design || "",
      wheelColor: d.wheel_color || "",
      glassTint: d.glass_tint || "",
      caliperColor: d.caliper_color || "",
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

    return mapped;
  } catch {
    return getSavedCommissionLeads();
  }
}
