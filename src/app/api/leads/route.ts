import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const db = getSupabaseClient();

    // Fetch leads from database with pagination
    const {
      data: leads,
      error,
      count,
    } = await db
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      leads: leads || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Optional: POST endpoint to manually create leads
export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json();

    // Validate required fields
    if (!leadData.name && !leadData.email && !leadData.company) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one of name, email, or company is required",
        },
        { status: 400 },
      );
    }

    const db = getSupabaseClient();

    // Insert new lead
    const { data: lead, error } = await db
      .from("leads")
      .insert([
        {
          ...leadData,
          source: leadData.source || "Manual Entry",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to create lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lead,
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
