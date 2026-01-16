"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Mail,
    Building2,
    DollarSign,
    CheckCircle2,
    Bell,
    Sparkles
} from "lucide-react";

export default function SubscribePage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [issueArea, setIssueArea] = useState("");
    const [scope, setScope] = useState("");
    const [kpis, setKpis] = useState("");
    const [funding, setFunding] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${API_URL}/subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    organization_name: organizationName,
                    issue_area: issueArea,
                    scope_of_grant: scope,
                    kpis: kpis.split(",").map(k => k.trim()).filter(k => k),
                    funding_quantum: parseFloat(funding) || 0,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Subscription failed");
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
                <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-violet-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Back button */}
            <div className="w-full max-w-2xl mb-4">
                <Link href="/">
                    <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                        <ArrowLeft className="w-4 h-4" /> Back to Search
                    </Button>
                </Link>
            </div>

            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-2xl"
                    >
                        <Card className="border-green-500/20 bg-green-500/5">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                >
                                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-green-700">You&apos;re Subscribed!</h2>
                                <p className="text-muted-foreground max-w-md">
                                    We&apos;ll send you an email whenever new grants matching your criteria become available.
                                    Check your inbox for a confirmation email.
                                </p>
                                <div className="flex gap-3 pt-4">
                                    <Link href="/">
                                        <Button variant="outline">Back to Home</Button>
                                    </Link>
                                    <Button onClick={() => setIsSuccess(false)}>
                                        Subscribe Another
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-2xl"
                    >
                        {/* Header */}
                        <div className="text-center space-y-2 mb-6">
                            <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground border-primary/20">
                                <Bell className="w-3 h-3 mr-1" /> Grant Alerts
                            </Badge>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                                Never miss a <span className="text-primary">matching grant.</span>
                            </h1>
                            <p className="text-muted-foreground">
                                Get notified instantly when new grants matching your criteria are added.
                            </p>
                        </div>

                        {/* Form */}
                        <Card className="border-primary/10 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Email Notifications
                                </CardTitle>
                                <CardDescription>
                                    Tell us about your organization and what you&apos;re looking for.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            Email Address
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-background/50"
                                        />
                                    </div>

                                    {/* Organization Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            Organization Name
                                        </label>
                                        <Input
                                            placeholder="Your Organization"
                                            value={organizationName}
                                            onChange={(e) => setOrganizationName(e.target.value)}
                                            required
                                            className="bg-background/50"
                                        />
                                    </div>

                                    <hr className="border-primary/10" />

                                    {/* Issue Area */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Issue Area</label>
                                        <Input
                                            placeholder="e.g. Environmental Sustainability, Youth Development"
                                            value={issueArea}
                                            onChange={(e) => setIssueArea(e.target.value)}
                                            required
                                            className="bg-background/50"
                                        />
                                    </div>

                                    {/* Scope of Grant */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Scope of Grant</label>
                                        <Textarea
                                            placeholder="Describe the types of projects you're looking to fund..."
                                            value={scope}
                                            onChange={(e) => setScope(e.target.value)}
                                            required
                                            className="min-h-[100px] bg-background/50"
                                        />
                                    </div>

                                    {/* KPIs */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Key Performance Indicators (comma-separated)</label>
                                        <Textarea
                                            placeholder="e.g. number of beneficiaries, amount of waste reduced, community engagement metrics"
                                            value={kpis}
                                            onChange={(e) => setKpis(e.target.value)}
                                            className="min-h-[80px] bg-background/50"
                                        />
                                    </div>

                                    {/* Funding Amount */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                                            Desired Funding Amount
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                placeholder="10000"
                                                value={funding}
                                                onChange={(e) => setFunding(e.target.value)}
                                                required
                                                className="pl-9 bg-background/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full rounded-lg h-12 text-md gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                />
                                                Subscribing...
                                            </>
                                        ) : (
                                            <>
                                                <Bell className="w-4 h-4" />
                                                Subscribe to Alerts
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-xs text-muted-foreground text-center">
                                        By subscribing, you agree to receive email notifications about matching grants.
                                        You can unsubscribe at any time.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
