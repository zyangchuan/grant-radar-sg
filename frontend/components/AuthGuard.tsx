"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Unauthenticated -> Redirect to Login
    if (!user && pathname !== "/login") {
      router.push("/login");
      return;
    }

    // 2. Authenticated but No Profile -> Redirect to Onboarding
    //    Allow /onboarding to prevent infinite loop
    if (user && hasProfile === false && pathname !== "/onboarding") {
      router.push("/onboarding");
      return;
    }
  }, [user, loading, hasProfile, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Guard blocks render while redirecting
  if (!user && pathname !== "/login") return null;
  if (user && hasProfile === false && pathname !== "/onboarding") return null;

  return <>{children}</>;
}
