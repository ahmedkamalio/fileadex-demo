"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Users,
  Building,
  Mail,
  Phone,
} from "lucide-react";

interface Lead {
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

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leads");
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncToCRM = async (leadId: string) => {
    try {
      setSyncing(leadId);
      const response = await fetch(`/api/crm-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      if (response.ok) {
        // Show success feedback
        console.log("CRM sync successful");
      }
    } catch (error) {
      console.error("CRM sync failed:", error);
    } finally {
      setSyncing(null);
    }
  };

  const stats = {
    total: leads.length,
    withEmail: leads.filter((lead) => lead.email).length,
    withPhone: leads.filter((lead) => lead.phone).length,
    companies: new Set(leads.map((lead) => lead.company).filter(Boolean)).size,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Leads Dashboard
            </h1>
            <p className="text-gray-600">
              Processed business cards and contact information
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLeads} disabled={loading}>
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Back to Upload
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    With Email
                  </p>
                  <p className="text-2xl font-bold">{stats.withEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    With Phone
                  </p>
                  <p className="text-2xl font-bold">{stats.withPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Companies</p>
                  <p className="text-2xl font-bold">{stats.companies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Processed Leads</CardTitle>
            <CardDescription>
              All business cards processed through the Fileadx pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading leads...</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No leads processed yet.</p>
                <Button asChild className="mt-2">
                  <Link href="/">Process Your First Business Card</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-medium text-gray-900">
                        Contact
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900">
                        Company
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900">
                        Contact Info
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900">
                        Source
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900">
                        Processed
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium">
                              {lead.name || "Unknown"}
                            </p>
                            {lead.job_title && (
                              <p className="text-sm text-gray-600">
                                {lead.job_title}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">
                              {lead.company || "Unknown"}
                            </p>
                            {lead.website && (
                              <a
                                href={
                                  lead.website.startsWith("http")
                                    ? lead.website
                                    : `https://${lead.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {lead.website}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {lead.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="text-sm">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-sm">{lead.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">
                            {lead.source}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600">
                            {new Date(lead.created_at).toLocaleDateString()}{" "}
                            {new Date(lead.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncToCRM(lead.id)}
                            disabled={syncing === lead.id}
                            className="gap-1"
                          >
                            {syncing === lead.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            Sync to CRM
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Demo Implementation Notes</h3>
              <p className="text-sm text-gray-600">
                This dashboard demonstrates the complete Fileadx pipeline with
                real OCR processing, data normalization, Postgres storage, and
                mock CRM integration.
              </p>
              <p className="text-xs text-gray-500">
                Built by Ahmed Kamal • Technical Test Submission
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
