"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { Search, FileText, User, LogOut, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (pathname === "/login" || pathname === "/onboarding") return null;

  const navItems = [
    { href: "/", label: "AI Powered Search", icon: Sparkles },
    { href: "/grants", label: "All Grants", icon: FileText },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Sparkles className="h-5 w-5" />
            <span>GrantRadarSG</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isSearch = item.href === "/";
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive && !isSearch ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 ${isSearch 
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity border-0 hover:bg-gradient-to-r" 
                      : ""}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline-block">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline-block">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
