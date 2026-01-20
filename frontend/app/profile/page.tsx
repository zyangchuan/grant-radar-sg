"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getOrganization, Organization } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building, Pencil, Mail, Globe, Users, DollarSign, Target, LogOut, ArrowLeft } from "lucide-react";

import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };



  useEffect(() => {
    async function loadOrg() {
      // Wait for auth to finish loading
      if (authLoading) return;

      // If no user, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const data = await getOrganization();
        if (!data) {
          // No profile found, redirect to onboarding
          router.push("/onboarding");
        } else {
          setOrg(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadOrg();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organization Profile</h1>
        <div className="flex gap-2">
          <Link href="/onboarding">
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </Link>
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{org.organization_name}</CardTitle>
            </div>
            <CardDescription>{org.primary_focus_area}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Mission</h3>
              <p className="text-muted-foreground">{org.mission_summary}</p>
            </div>
          </CardContent>
        </Card>


        {/* Stats & Key Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">At a Glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Focus Area</p>
                  <p className="text-sm text-muted-foreground">{org.primary_focus_area}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Team Size</p>
                  <p className="text-sm text-muted-foreground">{org.total_staff_volunteers}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Annual Budget</p>
                  <p className="text-sm text-muted-foreground">{org.annual_budget_range}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {org.primary_contact_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{org.primary_contact_name}</p>
                  <p className="text-xs text-muted-foreground">Primary Contact</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${org.contact_email}`} className="text-sm hover:underline">{org.contact_email}</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
