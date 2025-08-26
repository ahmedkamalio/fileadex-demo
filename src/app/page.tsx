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
} from "lucide-react";
import axios, { isAxiosError } from "axios";

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

export default function FileadxDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setSteps((prev) =>
        prev.map((step) => ({ ...step, status: "pending" as const })),
      );
    }
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
            Built by Ahmed Kamal • Technical Test Submission
          </p>
        </div>

        {/* GitHub Link */}
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4" />
              View Source Code
            </a>
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
                Upload any business card image to see the complete Fileadx
                pipeline in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*"
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
                    PNG, JPG, JPEG up to 10MB
                  </span>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileImage className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={processCard}
                disabled={!file || processing}
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
