"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_GRANTS } from "@/lib/mock-data";
import { Sparkles, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Simple Circular Progress Component
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

export default function ResultsPage() {
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
                    <p className="text-muted-foreground">Found {MOCK_GRANTS.length} potentially suitable grants</p>
                </div>
            </header>

            {/* Grid */}
            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_GRANTS.map((grant, index) => (
                    <motion.div
                        key={grant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-primary/10">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="space-y-1 pr-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{grant.provider}</p>
                                    <CardTitle className="text-xl leading-tight text-balance">{grant.title}</CardTitle>
                                </div>
                                <CircularProgress value={grant.matchScore} />
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {grant.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                </div>

                                {/* AI Insight */}
                                <div className="bg-primary/5 rounded-lg p-3 text-sm relative border border-primary/10">
                                    <Sparkles className="w-4 h-4 text-yellow-500 absolute top-3 left-3" />
                                    <p className="pl-6 text-muted-foreground italic">&quot;{grant.aiInsight}&quot;</p>
                                </div>

                                {/* Key Data */}
                                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Max Funding</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">${grant.maxFunding.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline</span>
                                        <span className={`font-semibold ${new Date(grant.deadline) < new Date('2026-05-01') ? 'text-red-500' : ''}`}>
                                            {new Date(grant.deadline).toLocaleDateString("en-SG", { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full">Apply Now</Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </main>
        </div>
    );
}
