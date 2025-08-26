"use client";

import React, { useState, useCallback } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Upload,
  FileImage,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Github,
  AlertTriangle,
  ArrowRight,
  Download,
} from "lucide-react";
import axios, { isAxiosError } from "axios";
import Link from "next/link";

interface ProcessingStep {
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

interface LeadData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  website?: string;
  source: string;
  created_at: string;
}

// Image validation configuration
const IMAGE_CONFIG = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  MAX_SIZE_MB: 10,
  SUPPORTED_FORMATS: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

export default function FileadxDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { name: "OCR Processing", status: "pending" },
    { name: "Data Cleaning", status: "pending" },
    { name: "Database Storage", status: "pending" },
    { name: "CRM Sync", status: "pending" },
  ]);
  const [result, setResult] = useState<LeadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback(
    (stepIndex: number, status: ProcessingStep["status"], message?: string) => {
      setSteps((prev) =>
        prev.map((step, i) =>
          i === stepIndex ? { ...step, status, message } : step,
        ),
      );
    },
    [],
  );

  const validateImage = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check file type
      if (!IMAGE_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
        resolve(
          `Unsupported format. Please use: ${IMAGE_CONFIG.SUPPORTED_FORMATS.join(
            ", ",
          )
            .replace(/image\//g, "")
            .toUpperCase()}`,
        );
        return;
      }

      // Check file size
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > IMAGE_CONFIG.MAX_SIZE_MB) {
        resolve(`File too large. Maximum size: ${IMAGE_CONFIG.MAX_SIZE_MB}MB`);
        return;
      }

      // Check image dimensions
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (
          img.width < IMAGE_CONFIG.MIN_WIDTH ||
          img.height < IMAGE_CONFIG.MIN_HEIGHT
        ) {
          resolve(
            `Image resolution too low. Minimum: ${IMAGE_CONFIG.MIN_WIDTH}×${IMAGE_CONFIG.MIN_HEIGHT}px. Current: ${img.width}×${img.height}px`,
          );
        } else {
          resolve(null); // Valid image
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("Unable to read image file. Please try a different image.");
      };

      img.src = url;
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setValidationError(null);

    // Validate the image
    const validationResult = await validateImage(selectedFile);

    if (validationResult) {
      setValidationError(validationResult);
      setFile(null);
      event.target.value = ""; // Reset input
      return;
    }

    // Image is valid
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSteps((prev) =>
      prev.map((step) => ({ ...step, status: "pending" as const })),
    );
  };

  const processCard = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Simulate processing steps with realistic timing
      updateStep(0, "processing", "Extracting text from business card...");

      const { data } = await axios.postForm("/api/process-card", formData);

      updateStep(0, "completed", "Text extraction completed");
      updateStep(1, "processing", "Cleaning and normalizing data...");

      updateStep(1, "completed", "Data normalized successfully");
      updateStep(2, "processing", "Storing lead in database...");

      // Simulate database storage
      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStep(2, "completed", "Lead stored successfully");

      updateStep(3, "processing", "Syncing to CRM...");

      // Simulate CRM sync
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateStep(3, "completed", "CRM sync successful");

      setResult(data.lead);
    } catch (err) {
      const currentStep = steps.findIndex(
        (step) => step.status === "processing",
      );
      if (currentStep !== -1) {
        updateStep(currentStep, "error", "Processing failed");
      }
      if (isAxiosError(err) && !!err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setProcessing(false);
    }
  };

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return (
          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const progress =
    (steps.filter((step) => step.status === "completed").length /
      steps.length) *
    100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Fileadx Demo</h1>
          <p className="text-lg text-gray-600">
            Smart Directory CRM Pipeline Demo
          </p>
          <p className="text-sm text-gray-500">
            Built by{" "}
            <a
              href="https://github.com/ahmedkamalio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
            >
              Ahmed Kamal
            </a>{" "}
            • Technical Test Submission
          </p>
        </div>

        {/* GitHub Link */}
        <div className="flex justify-center space-x-2">
          <Button variant="outline" asChild>
            <a
              href="https://github.com/ahmedkamalio/fileadex-demo"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github />
              View Source Code
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/demo-business-card.jpg" download="demo-business-card.jpg">
              <Download />
              Download Demo Card
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leads">
              See Leads Dashboard
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Business Card
              </CardTitle>
              <CardDescription>
                Upload a high-quality business card image to see the complete
                Fileadx pipeline in action. Minimum resolution:{" "}
                {IMAGE_CONFIG.MIN_WIDTH}×{IMAGE_CONFIG.MIN_HEIGHT}px
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept={IMAGE_CONFIG.SUPPORTED_FORMATS.join(",")}
                  onChange={handleFileSelect}
                  disabled={processing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FileImage className="w-12 h-12 text-gray-400" />
                  <span className="text-sm font-medium">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, JPEG, WebP up to {IMAGE_CONFIG.MAX_SIZE_MB}MB
                  </span>
                  <span className="text-xs text-gray-400">
                    Min: {IMAGE_CONFIG.MIN_WIDTH}×{IMAGE_CONFIG.MIN_HEIGHT}px
                    for optimal OCR accuracy
                  </span>
                </label>
              </div>

              {validationError && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Image Requirements Not Met
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {validationError}
                    </p>
                  </div>
                </div>
              )}

              {file && !validationError && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-800">
                      {file.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700"
                    >
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={processCard}
                disabled={!file || processing || !!validationError}
                className="w-full"
                size="lg"
              >
                {processing ? "Processing..." : "Process Business Card"}
              </Button>
            </CardContent>
          </Card>

          {/* Processing Status */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Status</CardTitle>
              <CardDescription>
                Real-time pipeline execution status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {step.name}
                      </p>
                      {step.message && (
                        <p className="text-xs text-gray-500">{step.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Extracted Lead Data</span>
                <Badge variant="default">Successfully Processed</Badge>
              </CardTitle>
              <CardDescription>
                Cleaned and normalized data ready for CRM integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Name:</strong> {result.name || "Not found"}
                    </div>
                    <div>
                      <strong>Email:</strong> {result.email || "Not found"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {result.phone || "Not found"}
                    </div>
                    <div>
                      <strong>Title:</strong> {result.job_title || "Not found"}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Company Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Company:</strong> {result.company || "Not found"}
                    </div>
                    <div>
                      <strong>Website:</strong> {result.website || "Not found"}
                    </div>
                    <div>
                      <strong>Source:</strong> {result.source}
                    </div>
                    <div>
                      <strong>Processed:</strong>{" "}
                      {new Date(result.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Lead ID: {result.id}</p>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-3 h-3" />
                  View in CRM
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tech Stack Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Technical Implementation</h3>
              <p className="text-sm text-gray-600">
                Next.js • TypeScript • Google Vision API • Supabase • Tailwind
                CSS • shadcn/ui
              </p>
              <p className="text-xs text-gray-500">
                Complete source code and documentation available on GitHub
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
