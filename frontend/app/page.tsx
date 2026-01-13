"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Simulated AI Analysis
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
    // In a real app, we'd pass the query params. For MVP, we just navigate.
    router.push("/results");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl flex flex-col items-center gap-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground border-primary/20">
            GrantRadarSG Beta
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Funding found, <span className="text-primary">magically.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-[600px]">
            Describe your mission or project idea below. Our AI will match you with the perfect Singaporean grants.
          </p>
        </div>

        {/* The Magic Box */}
        <div className="w-full relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${isFocused ? 'opacity-60' : ''}`} />
          <div className="relative bg-card rounded-xl border shadow-lg overflow-hidden">
            <div className="p-1">
              <Textarea
                placeholder="e.g., We want to start a digital literacy program for seniors in Bedok..."
                className="min-h-[160px] resize-none border-none focus-visible:ring-0 text-lg p-6 bg-transparent placeholder:text-muted-foreground/50"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </div>

            {/* Magic Tags Area */}
            <div className="px-4 pb-4 h-12 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <AnimatePresence>
                {tags.length === 0 && query.length > 5 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-500" /> Analyzing...
                  </motion.span>
                )}
                {tags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      {tag}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Filters */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Funding needed (SGD)" type="number" className="pl-9" />
          </div>
          <div className="relative">
            {/* Simple date input for MVP */}
            <Input type="date" className="w-full block" />
          </div>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Org Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ipc">IPC (Charity)</SelectItem>
              <SelectItem value="clg">Company Limited by Guarantee</SelectItem>
              <SelectItem value="society">Society</SelectItem>
              <SelectItem value="groundup">Ground-up Initiative</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Action Button */}
        <Button
          size="lg"
          className="rounded-full px-8 h-12 text-md gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
          onClick={handleSearch}
        >
          Find Grants <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
