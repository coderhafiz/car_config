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
    | "VIEW_MODE_TOGGLED"
    | "SPEC_SHEET_OPENED"
    | "COMMISSION_SUBMITTED";
  modelId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const EVENTS_STORAGE_KEY = "customly_analytics_events";
const LEADS_STORAGE_KEY = "customly_commission_leads";

/**
 * Non-blocking event tracker for 3D configurator telemetry.
 * Automatically saves to localStorage and Supabase.
 */
export function trackStudioEvent(
  eventName: TelemetryEvent["eventName"],
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  try {
    const event: TelemetryEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName,
      metadata,
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
    // 1. Save locally for instant offline preview
    const stored = localStorage.getItem(LEADS_STORAGE_KEY);
    const leads: VehicleCommissionLead[] = stored ? JSON.parse(stored) : [];
    leads.unshift(lead);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));

    // 2. Push to Supabase if configured
    if (supabase) {
      const { error } = await supabase.from("commission_leads").insert({
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
