/**
 * QUERY LIFECYCLE MANAGER
 * 
 * Manages query states and re-evaluation logic.
 * Ensures deterministic query resolution.
 */

import { auditEngine } from '../auditEngine';
import { AuditResult } from '../auditResult';
import { DecisionState } from '../decision';

export enum QueryStatus {
    GENERATED = 'GENERATED',
    SENT = 'SENT',
    ANSWERED = 'ANSWERED',
    RESOLVED = 'RESOLVED',
    UNANSWERED = 'UNANSWERED',
}

export interface Query {
    id: string;
    caseId: string;
    concept: string;
    queryText: string;
    ruleGroup: string;
    status: QueryStatus;
    generatedAt: string;
    sentAt?: string;
    answeredAt?: string;
    resolvedAt?: string;
    providerResponse?: string;
    updatedDocumentation?: string;
    finalDecision?: AuditResult;
}

export class QueryLifecycleManager {
    private queries: Map<string, Query> = new Map();

    /**
     * Generate queries from audit result
     */
    generateQueries(caseId: string, auditResult: AuditResult): Query[] {
        const queries: Query[] = [];

        for (const queryReq of auditResult.queriesRequired) {
            const query: Query = {
                id: this.generateQueryId(),
                caseId,
                concept: queryReq.concept,
                queryText: queryReq.query,
                ruleGroup: queryReq.ruleGroup,
                status: QueryStatus.GENERATED,
                generatedAt: new Date().toISOString(),
            };

            this.queries.set(query.id, query);
            queries.push(query);
        }

        return queries;
    }

    /**
     * Mark query as sent to provider
     */
    markAsSent(queryId: string): void {
        const query = this.queries.get(queryId);
        if (!query) {
            throw new Error(`Query ${queryId} not found`);
        }

        query.status = QueryStatus.SENT;
        query.sentAt = new Date().toISOString();
    }

    /**
     * Process provider response
     * Re-runs audit engine on updated documentation
     */
    async receiveAnswer(
        queryId: string,
        providerResponse: string,
        updatedDocumentation: string,
        reEvaluateFn: () => AuditResult
    ): Promise<AuditResult> {
        const query = this.queries.get(queryId);
        if (!query) {
            throw new Error(`Query ${queryId} not found`);
        }

        query.status = QueryStatus.ANSWERED;
        query.answeredAt = new Date().toISOString();
        query.providerResponse = providerResponse;
        query.updatedDocumentation = updatedDocumentation;

        // Re-run audit engine on updated documentation
        const finalDecision = reEvaluateFn();

        query.finalDecision = finalDecision;
        query.status = QueryStatus.RESOLVED;
        query.resolvedAt = new Date().toISOString();

        return finalDecision;
    }

    /**
     * Apply fallback logic for unanswered query
     */
    applyFallback(queryId: string, fallbackResult: AuditResult): void {
        const query = this.queries.get(queryId);
        if (!query) {
            throw new Error(`Query ${queryId} not found`);
        }

        query.status = QueryStatus.UNANSWERED;
        query.finalDecision = fallbackResult;
        query.resolvedAt = new Date().toISOString();
    }

    /**
     * Get all queries for a case
     */
    getQueriesForCase(caseId: string): Query[] {
        return Array.from(this.queries.values()).filter(q => q.caseId === caseId);
    }

    /**
     * Get query by ID
     */
    getQuery(queryId: string): Query | undefined {
        return this.queries.get(queryId);
    }

    /**
     * Get queries by status
     */
    getQueriesByStatus(status: QueryStatus): Query[] {
        return Array.from(this.queries.values()).filter(q => q.status === status);
    }

    private generateQueryId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `query_${timestamp}_${random}`;
    }
}

// Export singleton instance
export const queryLifecycle = new QueryLifecycleManager();
