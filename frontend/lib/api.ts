import { auth } from "@/lib/firebase";

export interface SearchRequirements {
    issue_area: string;
    scope_of_grant: string;
    kpis: string[];
    funding_quantum: number;
}

export interface Grant {
    id: string; // From MOCK_GRANTS, it's string. API returns string?
    grant_id?: string; // API returns this
    grant_name?: string; // API returns this
    title?: string;
    agency?: string;
    provider?: string;
    funding_amount?: number;
    maxFunding?: number;
    evaluation?: {
        relevance_score: number;
        sustainability_score: number;
        overall_score: number;
        recommendation: string;
        strengths: string[];
        concerns: string[];
    };
    matchScore?: number;
    aiInsight?: string;
    tags?: string[];
    deadline?: string;
}

export interface StreamProgress {
    status?: 'initializing' | 'analyzing' | 'searching' | 'evaluating' | 'finalizing' | 'complete' | 'error';
    stage?: 'initializing' | 'analyzing' | 'searching' | 'evaluating' | 'finalizing' | 'complete' | 'error';
    message: string;
    progress: number;
    data?: {
        success: boolean;
        grants: any[]; // Raw API response grants
    };
}


export async function searchGrantsStream(
    requirements: SearchRequirements,
    onProgress: (progress: StreamProgress) => void
): Promise<void> {
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`${API_URL}/search/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(requirements)
        });

        if (!response.body) {
            throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // Buffer for incomplete chunks

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Append new data to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines (ending with \n\n for SSE)
            const parts = buffer.split('\n\n');

            // Keep the last part in buffer (might be incomplete)
            buffer = parts.pop() || '';

            for (const part of parts) {
                const lines = part.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);
                                onProgress(data);
                            }
                        } catch (e) {
                            console.error("Error parsing stream chunk:", line, e);
                        }
                    }
                }
            }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr) {
                            const data = JSON.parse(jsonStr);
                            onProgress(data);
                        }
                    } catch (e) {
                        console.error("Error parsing final chunk:", line, e);
                    }
                }
            }
        }
    } catch (error: any) {
        onProgress({
            status: 'error',
            message: error.message || "Unknown error occurred",
            progress: 0
        });
    }
}

// Fetch all grants from database
export async function fetchAllGrants(): Promise<any[]> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_URL}/grants`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch grants');
    }

    // API returns array directly, not { grants: [...] }
    return await response.json();
}

export interface Organization {
    id?: number;
    firebase_uid?: string;
    organization_name: string;
    mission_summary: string;
    primary_focus_area: string;
    primary_contact_name: string;
    contact_email: string;
    total_staff_volunteers: number;
    annual_budget_range: string;
    subscribe_to_updates?: boolean;
}


export async function getOrganization(userOverride?: { getIdToken: () => Promise<string> }): Promise<Organization | null> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Use provided user or fall back to auth.currentUser
    const tokenSource = userOverride || auth.currentUser;
    if (!tokenSource) {
        console.log("[getOrganization] No user available for token");
        return null;
    }

    const token = await tokenSource.getIdToken();
    if (!token) {
        console.log("[getOrganization] Failed to get token");
        return null;
    }

    console.log("[getOrganization] Fetching with token...");
    const response = await fetch(`${API_URL}/organization`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (response.status === 404) {
        console.log("[getOrganization] 404 - no organization found");
        return null;
    }
    if (!response.ok) {
        console.error("[getOrganization] API error:", response.status);
        throw new Error('Failed to fetch organization');
    }

    const org = await response.json();
    console.log("[getOrganization] Found organization:", org?.organization_name);
    return org;
}

export async function saveOrganization(org: Organization): Promise<Organization> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = await auth.currentUser?.getIdToken();

    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/organization`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(org)
    });

    if (!response.ok) {
        throw new Error('Failed to save organization');
    }

    return await response.json();
}
