/**GOOGLE_VISION_API_KEY
 * Google Vision AI Client
 *
 * Provides OCR capabilities for business card text extraction using Google Cloud Vision API.
 *
 * @module google-vision
 * @author Ahmed Kamal
 */

import { ImageAnnotatorClient } from "@google-cloud/vision";

let visionClient: ImageAnnotatorClient | null = null;

/**
 * Returns a singleton instance of the Google Vision client.
 *
 * Supported authentication methods (for demo purposes):
 * 1. API Key (simpler for demos) - uses GOOGLE_VISION_API_KEY
 *
 * @returns {ImageAnnotatorClient} The configured Google Vision client
 * @throws {Error} When authentication credentials are not properly configured
 */
export function getVisionClient(): ImageAnnotatorClient {
  if (visionClient === null) {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Google Vision env vars are not found, did you forgot to set 'GOOGLE_VISION_API_KEY'?",
      );
    }

    // For the purpose of this demo, we're using an API key, in production we might opt-in to using a service account.
    visionClient = new ImageAnnotatorClient({ apiKey });
  }

  return visionClient;
}

/**
 * Extract text from business card image using Google Vision OCR
 *
 * @param imageBuffer - Buffer containing the image data
 * @returns Promise with extracted text and confidence scores
 */
export async function extractTextFromImage(imageBuffer: Buffer) {
  const client = getVisionClient();

  try {
    const [result] = await client.textDetection({
      image: {
        content: imageBuffer.toString("base64"),
      },
      imageContext: {
        // Optimize for document text detection
        textDetectionParams: {
          enableTextDetectionConfidenceScore: true,
        },
      },
    });

    const detections = result.textAnnotations || [];

    if (detections.length === 0) {
      throw new Error("No text detected in image");
    }

    // First detection contains all text, subsequent ones are individual words
    const fullText = detections[0].description || "";
    const confidence = detections[0].confidence || 0;

    // Individual text segments with positions (useful for advanced parsing)
    const textSegments = detections.slice(1).map((detection) => ({
      text: detection.description,
      confidence: detection.confidence,
      boundingBox: detection.boundingPoly,
    }));

    return {
      fullText,
      confidence,
      textSegments,
      wordCount: textSegments.length,
    };
  } catch (error) {
    console.error("Google Vision OCR failed:", error);
    throw new Error(
      `OCR processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
