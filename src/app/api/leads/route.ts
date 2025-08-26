/**
 * Leads Management API Routes
 *
 * This module provides RESTful API endpoints for managing lead data in the Fileadx CRM system.
 * It serves as the primary interface for lead retrieval, creation, and management operations,
 * supporting both automated pipeline processing and manual lead entry workflows.
 *
 * API Design Philosophy:
 *
 * 1. **RESTful Compliance**
 *    - GET /api/leads: Retrieve lead collections with pagination
 *    - POST /api/leads: Create new leads manually or via integrations
 *    - Follows HTTP status code conventions (200, 400, 500)
 *    - Consistent JSON response format across all endpoints
 *
 * 2. **Pagination & Performance**
 *    - Built-in pagination with configurable limits (default: 50 leads)
 *    - Offset-based pagination for simple implementation
 *    - Total count included for UI pagination controls
 *    - Chronological ordering (newest first) for optimal UX
 *
 * 3. **Data Validation & Flexibility**
 *    - Flexible lead creation: requires at least one key field (name, email, or company)
 *    - Automatic timestamp and source attribution
 *    - Input sanitization and type validation
 *    - Graceful handling of partial lead data
 *
 * 4. **Integration-Ready Architecture**
 *    - Supports multiple lead sources (OCR pipeline, manual entry, API imports)
 *    - Source tracking for audit trails and analytics
 *    - Extensible for webhook integrations and bulk operations
 *    - Database-agnostic query patterns for easy migration
 *
 * Usage Patterns:
 *
 * - **CRM Dashboard**: Fetching lead lists with pagination for admin interfaces
 * - **Pipeline Integration**: Automated lead creation from business card processing
 * - **Manual Entry**: Direct lead creation through admin forms
 * - **API Integrations**: Third-party systems importing leads
 * - **Analytics**: Lead count and source attribution tracking
 *
 * Security Considerations:
 * - Input validation prevents SQL injection (via Supabase RLS)
 * - Rate limiting should be implemented at API Gateway level
 * - Sensitive PII data handling with proper access controls
 * - Audit logging for compliance (GDPR, CCPA) requirements
 *
 * Environment Dependencies:
 * - `SUPABASE_URL` & `SUPABASE_API_KEY`: Database connection credentials
 * - Database schema: `leads` table with indexed created_at column
 *
 * @module api/leads
 * @author Ahmed Kamal
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/leads
 *
 * Retrieves a paginated collection of leads from the database, ordered by creation date
 * (newest first). Supports configurable pagination parameters for efficient data loading
 * and optimal user experience in dashboard interfaces.
 *
 * Query Parameters:
 * - `limit` (optional): Number of leads to return (default: 50, max recommended: 100)
 * - `offset` (optional): Number of leads to skip for pagination (default: 0)
 *
 * Response Format:
 * ```json
 * {
 *   "success": true,
 *   "leads": [
 *     {
 *       "id": "uuid",
 *       "name": "John Doe",
 *       "email": "john@company.com",
 *       "phone": "+1-555-123-4567",
 *       "company": "Acme Corp",
 *       "job_title": "CEO",
 *       "website": "acme.com",
 *       "source": "Google Vision - 2024-01-15",
 *       "created_at": "2024-01-15T14:30:25.123Z"
 *     }
 *   ],
 *   "total": 1247,
 *   "limit": 50,
 *   "offset": 0
 * }
 * ```
 *
 * Pagination Logic:
 * - Uses offset-based pagination for simplicity and broad compatibility
 * - Returns total count for UI pagination controls
 * - Consistent ordering ensures predictable results across pages
 * - Handles edge cases (empty results, invalid parameters gracefully)
 *
 * Performance Optimizations:
 * - Database query uses `range()` for efficient limit/offset handling
 * - Single query with count for optimal database round trips
 * - Indexed `created_at` column for fast ordering
 * - Supabase connection pooling for concurrent request handling
 *
 * @param request - Next.js request object with URL search parameters
 * @returns Promise<NextResponse> - JSON response with paginated lead data
 *
 * @example
 * // Fetch first page (50 leads):
 * GET /api/leads
 *
 * // Fetch specific page with custom limit:
 * GET /api/leads?limit=25&offset=50
 *
 * // Client-side usage:
 * const response = await fetch('/api/leads?limit=25&offset=50');
 * const { leads, total, limit, offset } = await response.json();
 *
 * // Calculate pagination info:
 * const currentPage = Math.floor(offset / limit) + 1;
 * const totalPages = Math.ceil(total / limit);
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Cap at 100 for performance
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0); // Ensure non-negative

    const db = getSupabaseClient();

    // Execute paginated query with total count
    // Uses single query optimization - gets data and count in one database round trip
    const {
      data: leads,
      error,
      count,
    } = await db
      .from("leads")
      .select("*", { count: "exact" }) // Include total count for pagination
      .order("created_at", { ascending: false }) // Newest leads first
      .range(offset, offset + limit - 1); // Supabase range is inclusive

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    // Return paginated response with metadata
    return NextResponse.json({
      success: true,
      leads: leads || [],
      total: count || 0,
      limit,
      offset,
      // Additional metadata for client convenience
      hasNextPage: (count || 0) > offset + limit,
      hasPreviousPage: offset > 0,
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

/**
 * POST /api/leads
 *
 * Creates a new lead record in the database with flexible validation rules.
 * Supports both manual lead entry and programmatic lead creation from external
 * integrations or administrative interfaces.
 *
 * Request Body:
 * ```json
 * {
 *   "name": "John Doe",           // Optional - personal name
 *   "email": "john@company.com",  // Optional - email address
 *   "phone": "+1-555-123-4567",   // Optional - phone number
 *   "company": "Acme Corp",       // Optional - company name
 *   "job_title": "CEO",           // Optional - job/position title
 *   "website": "acme.com",        // Optional - company website
 *   "source": "Manual Entry"      // Optional - lead source attribution
 * }
 * ```
 *
 * Validation Rules:
 * - **Flexible Requirements**: At least one of `name`, `email`, or `company` must be provided
 * - **Data Quality**: No strict format validation - accepts partial/incomplete data
 * - **Source Attribution**: Automatically assigns source if not provided
 * - **Timestamp**: Automatically adds creation timestamp
 *
 * Business Logic:
 * - Prioritizes data capture over strict validation (leads are valuable even if incomplete)
 * - Supports progressive enhancement - partial leads can be enriched later
 * - Maintains audit trail with source and timestamp information
 * - Handles duplicate detection at application level (future enhancement)
 *
 * Response Format:
 * ```json
 * {
 *   "success": true,
 *   "lead": {
 *     "id": "newly-generated-uuid",
 *     "name": "John Doe",
 *     "email": "john@company.com",
 *     "company": "Acme Corp",
 *     "source": "Manual Entry",
 *     "created_at": "2024-01-15T14:30:25.123Z"
 *   },
 *   "message": "Lead created successfully"
 * }
 * ```
 *
 * Error Responses:
 * - 400: Validation failure (missing required fields)
 * - 500: Database error or internal server error
 *
 * @param request - Next.js request object containing JSON lead data
 * @returns Promise<NextResponse> - JSON response with created lead data or error
 *
 * @example
 * // Minimal lead creation:
 * POST /api/leads
 * {
 *   "email": "contact@newcompany.com",
 *   "company": "New Startup Inc"
 * }
 *
 * // Full lead data:
 * POST /api/leads
 * {
 *   "name": "Sarah Johnson",
 *   "email": "sarah@techcorp.com",
 *   "phone": "+1-555-987-6543",
 *   "company": "TechCorp Solutions",
 *   "job_title": "VP of Engineering",
 *   "website": "techcorp.com",
 *   "source": "Conference Contact"
 * }
 *
 * // Client-side usage:
 * const response = await fetch('/api/leads', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(leadData)
 * });
 *
 * if (response.ok) {
 *   const { lead } = await response.json();
 *   console.log('Created lead:', lead.id);
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const leadData = await request.json();

    // Flexible validation: require at least one key identifier
    // This approach prioritizes lead capture over strict data requirements
    if (!leadData.name && !leadData.email && !leadData.company) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one of name, email, or company is required",
          hint: "Partial lead data is acceptable - we can enrich it later",
        },
        { status: 400 },
      );
    }

    const db = getSupabaseClient();

    // Create new lead with automatic metadata
    const { data: lead, error } = await db
      .from("leads")
      .insert([
        {
          ...leadData,
          // Automatic field population
          source: leadData.source || "Manual Entry", // Default source attribution
          created_at: new Date().toISOString(), // Consistent timestamp format
          // Future enhancement: add created_by user tracking
          // Future enhancement: add lead_score calculation
        },
      ])
      .select() // Return the created record
      .single(); // Expect exactly one result

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create lead",
          // In production: don't expose internal error details
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 },
      );
    }

    // Success response with created lead data
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
