/**
 * AUDIT TRAIL - Immutable Compliance Logging
 * 
 * Persists all audit decisions for Medicare/RAC review.
 * Tamper-resistant, read-only, fully exportable.
 */

import { AuditResult } from '../auditResult';
import { DecisionState } from '../decision';
import * as fs from 'fs';
import * as path from 'path';

const ENGINE_VERSION = '1.0.0';
const COMMIT_HASH = process.env.COMMIT_HASH || 'development';

export interface AuditTrailEntry {
    id: string;
    timestamp: string;
    engineVersion: string;
    commitHash: string;
    input: {
        rawNarrative: string;
        structuredConcepts: any;
    };
    rulesTriggered: string[];
    decisionState: DecisionState;
    autoCoded: Array<{ code: string; description: string; position: string }>;
    autoExcluded: Array<{ concept: string; reason: string }>;
    queriesGenerated: Array<{ concept: string; query: string; ruleGroup: string }>;
    metadata: {
        caseId?: string;
        facilityId?: string;
        userId?: string;
    };
}

export class AuditTrail {
    private logDirectory: string;

    constructor(logDirectory: string = './audit_logs') {
        this.logDirectory = logDirectory;
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
    }

    /**
     * Log an audit decision - immutable, append-only
     */
    log(
        rawNarrative: string,
        structuredConcepts: any,
        auditResult: AuditResult,
        metadata: { caseId?: string; facilityId?: string; userId?: string } = {}
    ): string {
        const entryId = this.generateEntryId();

        const entry: AuditTrailEntry = {
            id: entryId,
            timestamp: new Date().toISOString(),
            engineVersion: ENGINE_VERSION,
            commitHash: COMMIT_HASH,
            input: {
                rawNarrative,
                structuredConcepts,
            },
            rulesTriggered: auditResult.rulesTriggered,
            decisionState: auditResult.decisionState,
            autoCoded: auditResult.autoCoded,
            autoExcluded: auditResult.autoExcluded,
            queriesGenerated: auditResult.queriesRequired,
            metadata,
        };

        this.persistEntry(entry);
        return entryId;
    }

    private generateEntryId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `audit_${timestamp}_${random}`;
    }

    private persistEntry(entry: AuditTrailEntry): void {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${date}.jsonl`;
        const filepath = path.join(this.logDirectory, filename);

        // Append to JSONL file (newline-delimited JSON)
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(filepath, line); // Append to log
    }

    /**
     * Retrieve audit entry by ID (read-only)
     */
    getEntry(entryId: string): AuditTrailEntry | null {
        // Search through log files
        const files = fs.readdirSync(this.logDirectory);

        for (const file of files) {
            if (!file.endsWith('.jsonl')) continue;

            const filepath = path.join(this.logDirectory, file);
            const content = fs.readFileSync(filepath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());

            for (const line of lines) {
                const entry: AuditTrailEntry = JSON.parse(line);
                if (entry.id === entryId) {
                    return entry;
                }
            }
        }

        return null;
    }

    /**
     * Export audit trail for compliance review
     */
    exportToJSON(startDate: Date, endDate: Date): AuditTrailEntry[] {
        const entries: AuditTrailEntry[] = [];
        const files = fs.readdirSync(this.logDirectory);

        for (const file of files) {
            if (!file.endsWith('.jsonl')) continue;

            const filepath = path.join(this.logDirectory, file);
            const content = fs.readFileSync(filepath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());

            for (const line of lines) {
                const entry: AuditTrailEntry = JSON.parse(line);
                const entryDate = new Date(entry.timestamp);

                if (entryDate >= startDate && entryDate <= endDate) {
                    entries.push(entry);
                }
            }
        }

        return entries;
    }

    /**
     * Generate compliance report summary
     */
    generateComplianceReport(startDate: Date, endDate: Date): {
        totalCases: number;
        decisionStateDistribution: Record<DecisionState, number>;
        queriesGenerated: number;
        hardStops: number;
        exclusions: number;
    } {
        const entries = this.exportToJSON(startDate, endDate);

        const distribution: Record<DecisionState, number> = {
            [DecisionState.AUTO_CODE]: 0,
            [DecisionState.AUTO_EXCLUDE]: 0,
            [DecisionState.AUTO_QUERY]: 0,
            [DecisionState.BLOCK_AND_QUERY]: 0,
        };

        let queriesGenerated = 0;
        let hardStops = 0;
        let exclusions = 0;

        for (const entry of entries) {
            distribution[entry.decisionState]++;
            queriesGenerated += entry.queriesGenerated.length;

            if (entry.decisionState === DecisionState.BLOCK_AND_QUERY) {
                hardStops++;
            }

            exclusions += entry.autoExcluded.length;
        }

        return {
            totalCases: entries.length,
            decisionStateDistribution: distribution,
            queriesGenerated,
            hardStops,
            exclusions,
        };
    }
}

// Export singleton instance
export const auditTrail = new AuditTrail();
