import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { extractTextFromImage } from "@/lib/google-vision";

interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  website?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json(
        { success: false, message: "No image provided" },
        { status: 400 },
      );
    }

    // Convert image to buffer for Google Vision
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // Step 1: OCR Processing with Google Vision
    const { fullText } = await extractTextFromImage(imageBuffer);

    if (!fullText) {
      return NextResponse.json(
        { success: false, message: "No text detected in image" },
        { status: 400 },
      );
    }

    // Step 2: Data Normalization and Cleaning
    console.log("Cleaning and normalizing data...");
    const cleanedData = await cleanAndNormalizeData(fullText);

    // Step 3: Store in Database
    console.log("Storing in database...");
    const db = getSupabaseClient();
    const { data: lead, error } = await db
      .from("leads")
      .insert([
        {
          ...cleanedData,
          source: `Google Vision - ${new Date().toISOString().split("T")[0]} ${new Date().toTimeString().split(" ")[0]}`,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to store lead data" },
        { status: 500 },
      );
    }

    // Step 4: Trigger CRM Sync (async)
    console.log("Triggering CRM sync...");
    // In a real app, you'd use a queue here
    triggerCRMSync(lead.id).catch(console.error);

    return NextResponse.json({
      success: true,
      lead,
      rawText: fullText, // For debugging
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Data cleaning and normalization functions
async function cleanAndNormalizeData(text: string): Promise<LeadData> {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  const result: LeadData = {};

  // Email extraction with common OCR fixes
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    result.email = cleanEmail(emailMatches[0]);
  }

  // Phone number extraction and normalization
  const phoneRegex = /[\+]?[\s\-\(\)]*[0-9][\s\-\(\)0-9]{8,15}/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    result.phone = cleanPhoneNumber(phoneMatches[0]);
  }

  // Website extraction
  const websiteRegex =
    /(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.(com|net|org|io|co|uk|ca|de))/gi;
  const websiteMatches = text.match(websiteRegex);
  if (websiteMatches) {
    result.website = cleanWebsite(websiteMatches[0]);
  }

  // Name extraction (heuristic: first line that's not email/phone/website)
  for (const line of lines) {
    if (
      !line.match(emailRegex) &&
      !line.match(phoneRegex) &&
      !line.match(websiteRegex) &&
      line.length > 2 &&
      line.length < 50
    ) {
      if (!result.name && isLikelyName(line)) {
        result.name = cleanName(line);
      } else if (!result.company && isLikelyCompany(line)) {
        result.company = cleanCompany(line);
      } else if (!result.job_title && isLikelyJobTitle(line)) {
        result.job_title = cleanJobTitle(line);
      }
    }
  }

  return result;
}

// Helper functions for data cleaning
function cleanEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/[0O]/g, "o") // Common OCR errors
    .replace(/[1l]/g, "l")
    .trim();
}

function cleanPhoneNumber(phone: string): string {
  // Extract digits only and format
  const digits = phone.replace(/\D/g, "");

  // Add country code if not present
  if (digits.length === 10) {
    return `+1-${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits.substring(0, 1)}-${digits.substring(1, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}`;
  }

  return `+${digits}`;
}

function cleanWebsite(website: string): string {
  return website.toLowerCase().replace(/^www\./, "");
}

function cleanName(name: string): string {
  return name
    .replace(/[^a-zA-Z\s.-]/g, "") // Remove non-letter characters except spaces, dots, hyphens
    .trim()
    .replace(/\s+/g, " "); // Normalize whitespace
}

function cleanCompany(company: string): string {
  return company.trim().replace(/\s+/g, " ").replace(/,$/, ""); // Remove trailing comma
}

function cleanJobTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

// Heuristic functions to identify field types
function isLikelyName(text: string): boolean {
  const nameWords = text.trim().split(/\s+/);
  return (
    nameWords.length >= 2 &&
    nameWords.length <= 4 &&
    nameWords.every((word) => /^[A-Z][a-z]+/.test(word))
  );
}

function isLikelyCompany(text: string): boolean {
  const companyKeywords = [
    "Inc",
    "LLC",
    "Corp",
    "Company",
    "Ltd",
    "Group",
    "Solutions",
    "Services",
    "Technologies",
  ];
  return (
    companyKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase()),
    ) ||
    text.includes("&") ||
    /[A-Z]{2,}/.test(text)
  );
}

function isLikelyJobTitle(text: string): boolean {
  const titleKeywords = [
    "CEO",
    "CTO",
    "CFO",
    "Manager",
    "Director",
    "President",
    "Vice",
    "Senior",
    "Lead",
    "Head",
    "Chief",
    "Officer",
    "Agent",
  ];
  return titleKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase()),
  );
}

// Async CRM sync function
async function triggerCRMSync(leadId: string): Promise<void> {
  try {
    // In a real implementation, this would call the actual CRM API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/crm-sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      },
    );

    if (!response.ok) {
      throw new Error("CRM sync failed");
    }

    console.log(`CRM sync successful for lead ${leadId}`);
  } catch (error) {
    console.error(`CRM sync failed for lead ${leadId}:`, error);
  }
}
