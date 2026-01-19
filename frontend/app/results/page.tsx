"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { searchGrantsStream } from "@/lib/api";
import { CheckCircle2, DollarSign, ArrowLeft, ExternalLink, AlertTriangle, Lightbulb, Building, Clock } from "lucide-react";
import Link from "next/link";

// Circular Progress Component
const CircularProgress = ({ value }: { value: number }) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    let color = "text-red-500";
    let bgGlow = "shadow-red-500/20";
    if (value > 50) { color = "text-yellow-500"; bgGlow = "shadow-yellow-500/20"; }
    if (value > 80) { color = "text-green-500"; bgGlow = "shadow-green-500/20"; }

    return (
        <div className={`relative flex items-center justify-center p-1 rounded-full ${bgGlow} shadow-lg`}>
            <svg className="transform -rotate-90 w-14 h-14">
                <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" />
                <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={color} strokeLinecap="round" />
            </svg>
            <span className="absolute text-sm font-bold">{value}%</span>
        </div>
    );
};

// Recommendation badge colors
const getRecommendationStyle = (recommendation: string) => {
    switch (recommendation) {
        case "HIGHLY_RECOMMENDED":
            return "bg-green-100 text-green-700 border-green-200";
        case "RECOMMENDED":
            return "bg-blue-100 text-blue-700 border-blue-200";
        case "NOT_RECOMMENDED":
            return "bg-red-100 text-red-700 border-red-200";
        default:
            return "bg-gray-100 text-gray-700 border-gray-200";
    }
};

// Clean progress message (remove emojis)
function cleanMessage(message: string): string {
    return message.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2500}-\u{257F}]|[\u{2580}-\u{259F}]|[\u{25A0}-\u{25FF}]|[\u{2190}-\u{21FF}]/gu, '').trim();
}

function ResultsContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<string>('initializing');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("Initializing search...");
    const [grants, setGrants] = useState<any[]>([]);

    useEffect(() => {
        const performSearch = async () => {
            const scope = searchParams.get("scope");
            const funding = searchParams.get("funding");
            const issue_area = searchParams.get("issue_area");
            const kpis = searchParams.get("kpis");

            if (!scope) return;

            await searchGrantsStream({
                scope_of_grant: scope,
                funding_quantum: parseFloat(funding || "0"),
                issue_area: issue_area || "General",
                kpis: kpis ? kpis.split(",") : ["General Impact"]
            }, (data) => {
                // API returns 'stage' but we use 'status' - handle both
                const statusValue = data.status || data.stage || 'initializing';
                console.log(`[Results] Status: ${statusValue}, Progress: ${data.progress}`);
                setStatus(statusValue);

                // Smooth progress: only increase, never decrease
                setProgress(prev => Math.max(prev, data.progress));
                setProgressMessage(cleanMessage(data.message));
                if (data.data && data.data.grants) {
                    console.log(`[Results] Received ${data.data.grants.length} grants`, data.data.grants);
                    setGrants(data.data.grants);
                }
            });


        }

        performSearch();
    }, [searchParams]);

    const isComplete = status === 'complete';

    // Get the best URL for applying (only if different from details)
    const getApplyUrl = (grant: any) => {
        // Only return application_url if it exists and is different from original/details
        const applyUrl = grant.application_url;
        const detailsUrl = grant.details_url || grant.original_url;
        if (applyUrl && applyUrl !== detailsUrl) {
            return applyUrl;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
                <Link href="/">
                    <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                        <ArrowLeft className="w-4 h-4" /> Back to Search
                    </Button>
                </Link>
                <div className="text-right">
                    <h1 className="text-2xl font-bold">Top Matches</h1>
                    <p className="text-muted-foreground">
                        {isComplete ? `Found ${grants.length} matches` : 'Searching...'}
                    </p>
                </div>
            </header>

            {/* Loading State - Smooth fade out when complete */}
            <AnimatePresence>
                {!isComplete && (
                    <motion.div
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="max-w-xl mx-auto mb-12 text-center space-y-4 overflow-hidden"
                    >
                        <p className="text-lg font-medium text-muted-foreground">{progressMessage}</p>
                        <Progress value={progress} className="h-2 w-full" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Grid */}
            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grants.map((grant, index) => (
                    <motion.div
                        key={grant.grant_id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-primary/10 overflow-hidden">
                            {/* Card Header with Score */}
                            <CardHeader className="flex flex-row items-start justify-between pb-3 bg-gradient-to-br from-muted/30 to-transparent">
                                <div className="space-y-1 pr-2 flex-1">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Building className="w-3 h-3" />
                                        <span className="uppercase tracking-wide truncate">{grant.agency}</span>
                                    </div>
                                    <CardTitle className="text-lg leading-tight text-balance line-clamp-2">
                                        {grant.grant_name}
                                    </CardTitle>
                                </div>
                                <CircularProgress value={grant.evaluation?.overall_score ?? 0} />
                            </CardHeader>

                            <CardContent className="flex-grow space-y-4 pt-2">
                                {/* Recommendation Badge */}
                                {grant.evaluation?.recommendation && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-medium ${getRecommendationStyle(grant.evaluation.recommendation)}`}
                                    >
                                        {grant.evaluation.recommendation.replace(/_/g, ' ')}
                                    </Badge>
                                )}

                                {/* Funding & Deadline Stats */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-muted/50 rounded-lg p-2.5">
                                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                            <DollarSign className="w-3 h-3" /> Max Funding
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            ${grant.funding_amount?.toLocaleString() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-2.5">
                                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Deadline
                                        </span>
                                        <span className="font-semibold text-foreground block">
                                            {grant.deadline || 'Open'}
                                        </span>
                                    </div>
                                </div>

                                {/* AI Insights: Strengths */}
                                {grant.evaluation?.strengths && grant.evaluation.strengths.length > 0 && (
                                    <div className="bg-green-500/5 rounded-lg p-3 text-sm border border-green-500/20">
                                        <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Strengths
                                        </p>
                                        <ul className="space-y-1">
                                            {grant.evaluation.strengths.slice(0, 3).map((s: string, i: number) => (
                                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                                    <span className="text-green-600 mt-0.5">•</span>
                                                    <span className="line-clamp-2">{s}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AI Insights: Concerns */}
                                {grant.evaluation?.concerns && grant.evaluation.concerns.length > 0 && (
                                    <div className="bg-amber-500/5 rounded-lg p-3 text-sm border border-amber-500/20">
                                        <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Considerations
                                        </p>
                                        <ul className="space-y-1">
                                            {grant.evaluation.concerns.slice(0, 2).map((c: string, i: number) => (
                                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                                    <span className="text-amber-600 mt-0.5">•</span>
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            </CardContent>

                            <CardFooter className="flex gap-2 pt-4 border-t">
                                {(grant.details_url || grant.original_url) && (
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <a href={grant.details_url || grant.original_url} target="_blank" rel="noopener noreferrer">
                                            Details <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}
                                {getApplyUrl(grant) && (
                                    <Button size="sm" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" asChild>
                                        <a href={getApplyUrl(grant)!} target="_blank" rel="noopener noreferrer">
                                            Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>

                        </Card>
                    </motion.div>
                ))}
            </main>

            {/* Empty State */}
            {isComplete && grants.length === 0 && (
                <div className="max-w-xl mx-auto text-center py-12">
                    <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No matching grants found. Try adjusting your search criteria.</p>
                    <Link href="/">
                        <Button variant="outline" className="mt-4">
                            <ArrowLeft className="w-4 h-4 mr-2" /> New Search
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ResultsContent />
        </Suspense>
    );
}
