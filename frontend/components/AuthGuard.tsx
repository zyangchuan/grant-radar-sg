"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/grants"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;

    // 1. Unauthenticated -> Redirect to Login (except public routes)
    if (!user && !isPublicRoute) {
      console.log("[AuthGuard] Redirecting to /login reason: !user", { user, isPublicRoute });
      router.push("/login");
      return;
    }

    // 2. Authenticated but No Profile -> Redirect to Onboarding
    //    Allow /onboarding to prevent infinite loop
    if (user && hasProfile === false && pathname !== "/onboarding" && !isPublicRoute) {
      console.log("[AuthGuard] Redirecting to /onboarding reason: hasProfile=false", { hasProfile, pathname });
      router.push("/onboarding");
      return;
    }
  }, [user, loading, hasProfile, router, pathname, isPublicRoute]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Guard blocks render while redirecting
  if (!user && !isPublicRoute) return null;
  if (user && hasProfile === false && pathname !== "/onboarding" && !isPublicRoute) return null;

  return <>{children}</>;
}

