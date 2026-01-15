
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
    status: 'initializing' | 'analyzing' | 'searching' | 'evaluating' | 'finalizing' | 'complete' | 'error';
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
        const response = await fetch(`${API_URL}/search/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requirements)
        });

        if (!response.body) {
            throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        onProgress(data);
                    } catch (e) {
                        console.error("Error parsing stream chunk", e);
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
    const response = await fetch(`${API_URL}/grants`);

    if (!response.ok) {
        throw new Error('Failed to fetch grants');
    }

    // API returns array directly, not { grants: [...] }
    return await response.json();
}
