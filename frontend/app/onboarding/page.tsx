"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { saveOrganization, getOrganization, Organization } from "@/lib/api";
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
import { Loader2, Bell, Sparkles, Lock } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, checkProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Organization>({
    organization_name: "",
    mission_summary: "",
    primary_focus_area: "",
    primary_contact_name: "",
    contact_email: "",
    total_staff_volunteers: 0,
    annual_budget_range: "",
    subscribe_to_updates: false,
  });


  // Fetch existing organization data for editing
  useEffect(() => {
    async function loadExistingData() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const existingOrg = await getOrganization();
        if (existingOrg) {
          setFormData({
            ...existingOrg,
            subscribe_to_updates: false, // Reset this for each session
          });
          setIsEditing(true);
        } else {
          // New user - just populate email
          setFormData(prev => ({
            ...prev,
            contact_email: user.email || ""
          }));
        }
      } catch (err) {
        console.error("Failed to load organization", err);
        // Still populate email for new users
        setFormData(prev => ({
          ...prev,
          contact_email: user.email || ""
        }));
      } finally {
        setInitialLoading(false);
      }
    }

    loadExistingData();
  }, [user]);

  const handleChange = (field: keyof Organization, value: any) => {
    // Prevent changing email if it's from Firebase
    if (field === "contact_email" && user?.email) return;
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

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditing ? "Edit Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Update your organization details below."
              : "Tell us about your organization to get personalized grant recommendations."}
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
                <label className="text-sm font-medium">Mission Summary</label>
                <Textarea
                  required
                  value={formData.mission_summary}
                  onChange={(e) => handleChange("mission_summary", e.target.value)}
                  placeholder="Briefly describe your organization's mission..."
                  className="min-h-[100px]"
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
                    onChange={(e) => handleChange("total_staff_volunteers", parseInt(e.target.value) || 0)}
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
                  <label className="text-sm font-medium flex items-center gap-2">
                    Email
                    {user?.email && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </label>
                  <Input
                    required
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="john@example.org"
                    disabled={!!user?.email}
                    className={user?.email ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {user?.email && (
                    <p className="text-xs text-muted-foreground">
                      Email is linked to your Google account
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Preference - AI Themed Toggle */}
            <div
              className={`
                relative border rounded-xl p-1 transition-all duration-300 cursor-pointer group overflow-hidden
                ${formData.subscribe_to_updates
                  ? "border-transparent"
                  : "border-border hover:border-primary/50"}
              `}
              onClick={() => handleChange("subscribe_to_updates", !formData.subscribe_to_updates)}
            >
              {/* Gradient Border Background (visible via padding when active) */}
              {formData.subscribe_to_updates && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy" />
              )}

              {/* Inner Content Card */}
              <div className={`
                relative h-full w-full rounded-[10px] p-4 flex items-start space-x-4 transition-colors duration-300
                ${formData.subscribe_to_updates ? "bg-background/95 backdrop-blur-sm" : "bg-card hover:bg-muted/50"}
              `}>
                <div className={`
                  p-2.5 rounded-full transition-all duration-500 relative
                  ${formData.subscribe_to_updates ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/25" : "bg-muted text-muted-foreground"}
                `}>
                  {formData.subscribe_to_updates ? <Sparkles className="h-6 w-6 animate-pulse" /> : <Bell className="h-6 w-6" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-lg transition-all duration-300 ${formData.subscribe_to_updates
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
                      : "text-foreground"
                      }`}>
                      Enable Grant Radar AI
                    </span>

                    {/* AI Toggle Switch */}
                    <div className={`
                      w-14 h-8 rounded-full p-1 transition-all duration-500 ease-spring
                      ${formData.subscribe_to_updates ? "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-inner" : "bg-muted-foreground/30"}
                    `}>
                      <div className={`
                        w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-500 ease-out-back
                        ${formData.subscribe_to_updates ? "translate-x-6" : "translate-x-0"}
                      `} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pr-8">
                    Our AI agents will continuously scan for grants matching your profile and notify you instantly.
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Save & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
