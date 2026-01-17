"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ArrowRight, DollarSign } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState(""); // This IS "Scope of Grant"
  const [issueArea, setIssueArea] = useState("Environmental Sustainability"); // Default based on user prompt example
  const [funding, setFunding] = useState("");
  const [kpis, setKpis] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Simulated AI Analysis for Tags (Visual feedback only now)
  useEffect(() => {
    const newTags: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.length > 10) newTags.push("Community");
    if (lowerQuery.includes("art") || lowerQuery.includes("music") || lowerQuery.includes("culture")) newTags.push("Arts & Culture");
    if (lowerQuery.includes("youth") || lowerQuery.includes("child") || lowerQuery.includes("student")) newTags.push("Youth");
    if (lowerQuery.includes("old") || lowerQuery.includes("elderly") || lowerQuery.includes("senior")) newTags.push("Elderly");
    if (lowerQuery.includes("environment") || lowerQuery.includes("eco") || lowerQuery.includes("green")) newTags.push("Sustainability");
    if (lowerQuery.includes("tech") || lowerQuery.includes("digital") || lowerQuery.includes("app")) newTags.push("Digitalization");
    if (lowerQuery.includes("health") || lowerQuery.includes("wellness") || lowerQuery.includes("mental")) newTags.push("Healthcare");

    setTags(Array.from(new Set(newTags)));
  }, [query]);

  const handleSearch = () => {
    // Construct query params
    const params = new URLSearchParams();
    params.set("scope", query); // Scope
    params.set("funding", funding || "5000"); // Default from user prompt
    params.set("issue_area", issueArea); // Explicit Issue Area
    params.set("kpis", kpis || "amount of plastic waste reduced in kilograms"); // Default from user prompt

    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Link href="/profile">
          <Button variant="ghost">
            <Sparkles className="mr-2 h-4 w-4" />
            Profile
          </Button>
        </Link>
        <Button variant="outline" onClick={() => auth.signOut()}>
          Sign Out
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl flex flex-col items-center gap-6"
      >
        {/* Header */}
        <div className="text-center space-y-2 mb-4">
          <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground border-primary/20">
            GrantRadarSG Beta
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Find your <span className="text-primary">perfect grant.</span>
          </h1>
        </div>

        {/* FORM CONTAINER */}
        <div className="w-full space-y-6 bg-card/50 backdrop-blur-sm border rounded-xl p-6 shadow-sm">

          {/* 1. Issue Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Issue Area</label>
            <Input
              value={issueArea}
              onChange={(e) => setIssueArea(e.target.value)}
              placeholder="e.g. Environmental Sustainability"
            />
          </div>

          {/* 2. Scope of Grant (The Magic Box) */}
          <div className="space-y-2 relative group">
            <label className="text-sm font-medium leading-none">Scope of Grant</label>
            <div className="relative">
              <Textarea
                placeholder="e.g., community projects focused on reducing plastic waste and promoting recycling"
                className="min-h-[120px] resize-none text-base bg-background/50"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              {/* Tags Overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-2 overflow-x-auto scrollbar-hide">
                <AnimatePresence>
                  {tags.slice(0, 3).map((tag) => (
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Badge variant="secondary" className="text-xs bg-primary/5">{tag}</Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 3. KPIs */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Key Performance Indicators (comma-separated)</label>
            <Textarea
              value={kpis}
              onChange={(e) => setKpis(e.target.value)}
              placeholder="e.g. amount of plastic waste reduced in kilograms, number of community members engaged"
              className="min-h-[80px] bg-background/50 request-none"
            />
          </div>

          {/* 4. Funding Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Funding Amount ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                className="pl-9 bg-background/50"
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                placeholder="5000"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full rounded-lg h-12 text-md gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold"
              onClick={handleSearch}
              disabled={!query}
            >
              Search Grants
            </Button>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/grants" className="block">
                <Button variant="outline" className="w-full rounded-lg h-10">
                  Browse All Grants
                </Button>
              </Link>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
