"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAllGrants } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { ExternalLink, DollarSign, Building2 } from "lucide-react";

export default function GrantsPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [grants, setGrants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };


    useEffect(() => {
        async function loadGrants() {
            try {
                const data = await fetchAllGrants();
                setGrants(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        loadGrants();
    }, []);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">All Grants</h1>
                        <p className="text-muted-foreground mt-1">
                            {loading ? "Loading..." : `${grants.length} grants available`}
                        </p>
                    </div>
                </div>
            </header>


            {/* Error State */}
            {error && (
                <div className="max-w-6xl mx-auto text-center py-12">
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="max-w-6xl mx-auto text-center py-12">
                    <p className="text-muted-foreground">Loading grants...</p>
                </div>
            )}

            {/* Grants Grid */}
            {!loading && !error && (
                <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grants.map((grant, index) => (
                        <Card key={grant.id || index} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {grant.agency || "Unknown Agency"}
                                        </p>
                                        <CardTitle className="text-lg leading-snug">
                                            {grant.name || "Untitled Grant"}
                                        </CardTitle>
                                    </div>
                                    <Badge className={grant.is_open ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}>
                                        {grant.is_open ? "Open" : "Closed"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                {grant.max_funding && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                                        <span>Up to <strong>${grant.max_funding.toLocaleString()}</strong></span>
                                    </div>
                                )}
                                {grant.full_text_context && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {grant.full_text_context.slice(0, 150)}...
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-2 pt-4">
                                {grant.original_url && (
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <a href={grant.original_url} target="_blank" rel="noopener noreferrer">
                                            Details <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}
                                {grant.application_url && (
                                    <Button size="sm" className="flex-1" asChild>
                                        <a href={grant.application_url} target="_blank" rel="noopener noreferrer">
                                            Register <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </main>
            )}
        </div>
    );
}
