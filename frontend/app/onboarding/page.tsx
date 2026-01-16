"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { saveOrganization, Organization } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, checkProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Organization>({
    organization_name: "",
    registration_id: "",
    mailing_address: "",
    mission_summary: "",
    primary_focus_area: "",
    primary_contact_name: "",
    contact_email: "",
    organization_website: "",
    total_staff_volunteers: 0,
    annual_budget_range: "",
  });

  const handleChange = (field: keyof Organization, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await saveOrganization(formData);
      await checkProfile();
      router.push("/");
    } catch (err: any) {
      console.error("Failed to save organization", err);
      setError("Failed to save details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us about your organization to get personalized grant recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Essential Details</h3>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Organization Name</label>
                <Input
                  required
                  value={formData.organization_name}
                  onChange={(e) => handleChange("organization_name", e.target.value)}
                  placeholder="e.g. Green Earth Initiative"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Registration ID (UEN/Tax ID)</label>
                <Input
                  required
                  value={formData.registration_id}
                  onChange={(e) => handleChange("registration_id", e.target.value)}
                  placeholder="e.g. T12SS0001A"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Mailing Address</label>
                <Textarea
                  required
                  value={formData.mailing_address}
                  onChange={(e) => handleChange("mailing_address", e.target.value)}
                  placeholder="123 Charity Lane, Singapore 123456"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Mission Summary</label>
                <Textarea
                  required
                  value={formData.mission_summary}
                  onChange={(e) => handleChange("mission_summary", e.target.value)}
                  placeholder="Briefly describe your organization's mission..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Organization Website</label>
                <Input
                    type="url"
                    value={formData.organization_website}
                    onChange={(e) => handleChange("organization_website", e.target.value)}
                    placeholder="https://example.org"
                />
              </div>
            </div>

            {/* Categorization */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Focus & Scale</h3>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Primary Focus Area</label>
                <Select
                  value={formData.primary_focus_area}
                  onValueChange={(val) => handleChange("primary_focus_area", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Focus Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Social Services">Social Services</SelectItem>
                    <SelectItem value="Arts & Heritage">Arts & Heritage</SelectItem>
                    <SelectItem value="Environment">Environment</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Community Development">Community Development</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Total Staff/Volunteers</label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={formData.total_staff_volunteers || ""}
                    onChange={(e) => handleChange("total_staff_volunteers", parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Annual Budget Range</label>
                  <Select
                    value={formData.annual_budget_range}
                    onValueChange={(val) => handleChange("annual_budget_range", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Budget Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Under $100k">Under $100k</SelectItem>
                      <SelectItem value="$100k - $500k">$100k - $500k</SelectItem>
                      <SelectItem value="$500k - $1M">$500k - $1M</SelectItem>
                      <SelectItem value="$1M - $5M">$1M - $5M</SelectItem>
                      <SelectItem value="Over $5M">Over $5M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Primary Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    required
                    value={formData.primary_contact_name}
                    onChange={(e) => handleChange("primary_contact_name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    required
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="john@example.org"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
