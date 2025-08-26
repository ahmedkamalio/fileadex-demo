/**
 * CRM Integration Mock API Routes
 *
 * Mock implementation of CRM synchronization endpoints for demo purposes.
 * Simulates integration with major CRM platforms (HubSpot, Salesforce, Dynamics)
 * with realistic API behavior including delays, failures, and rate limiting.
 *
 * Production Implementation Notes:
 * - Replace mock functions with actual CRM API clients
 * - Implement proper authentication (OAuth, API keys)
 * - Add retry queues (Redis, AWS SQS) for failed syncs
 * - Include webhook handling for bi-directional sync
 *
 * @module api/crm-sync
 * @author Ahmed Kamal
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import type { LeadData } from "@/models/lead";

// Mock CRM providers configuration
const CRM_PROVIDERS = {
  hubspot: {
    name: "HubSpot",
    apiUrl: "https://api.hubapi.com/crm/v3/objects/contacts",
    rateLimit: 100, // requests per 10 seconds
  },
  salesforce: {
    name: "Salesforce",
    apiUrl:
      "https://your-instance.salesforce.com/services/data/v55.0/sobjects/Contact",
    rateLimit: 1000, // requests per day
  },
  dynamics: {
    name: "Microsoft Dynamics",
    apiUrl: "https://your-org.api.crm.dynamics.com/api/data/v9.2/contacts",
    rateLimit: 6000, // requests per 5 minutes
  },
};

/**
 * POST /api/crm-sync
 * Synchronizes a lead to the specified CRM platform (mock implementation)
 */
export async function POST(request: NextRequest) {
  try {
    const {
      leadId,
      crmProvider = "hubspot",
      retryAttempt = 0,
    } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Lead ID is required" },
        { status: 400 },
      );
    }

    const db = getSupabaseClient();

    // Fetch the lead from database
    const { data: lead, error: fetchError } = await db
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 },
      );
    }

    // Mock CRM sync process
    console.log(
      `Syncing lead ${leadId} to ${CRM_PROVIDERS[crmProvider as keyof typeof CRM_PROVIDERS]?.name}...`,
    );

    // Simulate API call delay and potential failures
    await simulateCRMAPICall(lead, crmProvider, retryAttempt);

    // Generate mock CRM ID
    const crmId = `${crmProvider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Update lead with CRM sync information
    const { error: updateError } = await db
      .from("leads")
      .update({
        crm_id: crmId,
        crm_provider: crmProvider,
        crm_synced_at: new Date().toISOString(),
        last_crm_sync_status: "success",
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to update lead with CRM info:", updateError);
    }

    // Log the sync activity
    console.log(
      `Successfully synced lead ${leadId} to ${crmProvider} with CRM ID: ${crmId}`,
    );

    return NextResponse.json({
      success: true,
      message: `Lead successfully synced to ${CRM_PROVIDERS[crmProvider as keyof typeof CRM_PROVIDERS]?.name}`,
      crmId,
      crmProvider,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CRM sync error:", error);

    // Basic retry logic simulation
    const shouldRetry =
      error instanceof Error &&
      error.message.includes("rate limit") &&
      request.json().then((body) => body.retryAttempt < 3);

    if (await shouldRetry) {
      console.log("Scheduling retry for CRM sync...");
      return NextResponse.json({
        success: false,
        message: "Rate limited, retry scheduled",
        retryIn: 60, // seconds
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "CRM sync failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Mock CRM API call with realistic behavior simulation
 */
async function simulateCRMAPICall(
  lead: LeadData,
  provider: string,
  retryAttempt: number,
): Promise<void> {
  // Simulate realistic API call timing
  const baseDelay =
    provider === "hubspot" ? 800 : provider === "salesforce" ? 1200 : 1000;
  const jitter = Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));

  // Simulate occasional failures (10% failure rate, lower on retries)
  const failureRate = Math.max(0.1 - retryAttempt * 0.03, 0.02);
  if (Math.random() < failureRate) {
    const errors = [
      "rate limit exceeded",
      "temporary service unavailable",
      "invalid authentication token",
      "duplicate contact detected",
    ];
    throw new Error(errors[Math.floor(Math.random() * errors.length)]);
  }

  // Log the mock API call
  console.log(`Mock ${provider} API call:`, {
    endpoint: CRM_PROVIDERS[provider as keyof typeof CRM_PROVIDERS]?.apiUrl,
    payload: {
      email: lead.email,
      firstName: lead.name?.split(" ")[0],
      lastName: lead.name?.split(" ").slice(1).join(" "),
      company: lead.company,
      jobTitle: lead.job_title,
      phone: lead.phone,
      website: lead.website,
    },
  });
}

/**
 * GET /api/crm-sync?leadId=uuid
 * Check CRM synchronization status for a specific lead
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Lead ID is required" },
        { status: 400 },
      );
    }

    const db = getSupabaseClient();

    // Fetch sync status from database
    const { data: lead, error } = await db
      .from("leads")
      .select("crm_id, crm_provider, crm_synced_at, last_crm_sync_status")
      .eq("id", leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      syncStatus: {
        isSynced: !!lead.crm_id,
        crmId: lead.crm_id,
        crmProvider: lead.crm_provider,
        syncedAt: lead.crm_synced_at,
        lastSyncStatus: lead.last_crm_sync_status,
      },
    });
  } catch (error) {
    console.error("Error checking sync status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check sync status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
