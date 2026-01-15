"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { searchGrantsStream } from "@/lib/api";
import { CheckCircle2, DollarSign, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

// Circular Progress Component
const CircularProgress = ({ value }: { value: number }) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    let color = "text-red-500";
    if (value > 50) color = "text-yellow-500";
    if (value > 80) color = "text-green-500";

    return (
        <div className="relative flex items-center justify-center">
            <svg className="transform -rotate-90 w-12 h-12">
                <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" />
                <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={color} strokeLinecap="round" />
            </svg>
            <span className="absolute text-xs font-bold">{value}%</span>
        </div>
    );
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
                setStatus(data.status);
                // Smooth progress: only increase, never decrease
                setProgress(prev => Math.max(prev, data.progress));
                setProgressMessage(cleanMessage(data.message));
                if (data.data && data.data.grants) {
                    setGrants(data.data.grants);
                }
            });
        }

        performSearch();
    }, [searchParams]);

    const isComplete = status === 'complete';

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

            {/* Loading State - Only show when NOT complete */}
            {!isComplete && (
                <div className="max-w-xl mx-auto mb-12 text-center space-y-4">
                    <p className="text-lg font-medium text-muted-foreground">{progressMessage}</p>
                    <Progress value={progress} className="h-2 w-full" />
                </div>
            )}

            {/* Results Grid */}
            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grants.map((grant, index) => (
                    <motion.div
                        key={grant.grant_id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-primary/10">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="space-y-1 pr-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{grant.agency}</p>
                                    <CardTitle className="text-xl leading-tight text-balance">{grant.grant_name}</CardTitle>
                                </div>
                                <CircularProgress value={grant.evaluation?.overall_score ?? 0} />
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                {/* Recommendation Badge */}
                                {grant.evaluation?.recommendation && (
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant={grant.evaluation.recommendation === 'HIGHLY_RECOMMENDED' ? 'default' : 'secondary'} className="text-xs">
                                            {grant.evaluation.recommendation.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                )}

                                {/* Strengths */}
                                {grant.evaluation?.strengths && grant.evaluation.strengths.length > 0 && (
                                    <div className="bg-green-500/5 rounded-lg p-3 text-sm border border-green-500/20">
                                        <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                                        <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                                            {grant.evaluation.strengths.slice(0, 2).map((s: string, i: number) => (
                                                <li key={i} className="line-clamp-1">{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> Max Funding
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            ${grant.funding_amount?.toLocaleString() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Relevance</span>
                                        <span className="font-semibold text-foreground">
                                            {grant.evaluation?.relevance_score ?? 'N/A'}/100
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                {grant.details_url && (
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <a href={grant.details_url} target="_blank" rel="noopener noreferrer">
                                            Details <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}
                                <Button size="sm" className="flex-1" asChild>
                                    <a href={grant.application_url || "#"} target="_blank" rel="noopener noreferrer">
                                        Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </main>

            {/* Empty State */}
            {isComplete && grants.length === 0 && (
                <div className="max-w-xl mx-auto text-center py-12">
                    <p className="text-muted-foreground">No matching grants found. Try adjusting your search criteria.</p>
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
