/**
 * COMMERCIAL SAFETY CONTROLS
 * 
 * Hard safeguards preventing inappropriate code maximization.
 * Any override attempt logged as compliance exception.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult } from '../auditResult';
import * as fs from 'fs';
import * as path from 'path';

export interface ComplianceException {
    id: string;
    timestamp: string;
    violationType: string;
    attemptedAction: string;
    blockReason: string;
    userId?: string;
    caseId?: string;
}

export class CommercialSafetyControls {
    private exceptionsLog: string = './compliance_exceptions.jsonl';

    constructor() {
        this.ensureExceptionsLog();
    }

    private ensureExceptionsLog(): void {
        const dir = path.dirname(this.exceptionsLog);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Validate that result does not contain prohibited patterns
     */
    validateResult(result: AuditResult, metadata?: any): void {
        // Check 1: No auto-upcoding
        this.checkAutoUpcoding(result, metadata);

        // Check 2: No severity escalation without documentation
        this.checkSeverityEscalation(result, metadata);

        // Check 3: No HCC recapture without "addressed" criteria
        this.checkHCCRecapture(result, metadata);

        // Check 4: No inference-based diagnoses
        this.checkInferenceBasedDiagnosis(result, metadata);
    }

    /**
     * Check 1: Prevent auto-upcoding from unspecified to specific codes
     */
    private checkAutoUpcoding(result: AuditResult, metadata?: any): void {
        // Example: Cannot auto-code I50.23 if only "heart failure" documented
        // This is enforced in rule groups, but double-check here

        const hasQueryBypass = result.autoCoded.some(code => {
            return code.description.includes('fallback') &&
                result.queriesRequired.length === 0 &&
                result.decisionState === DecisionState.AUTO_CODE;
        });

        if (hasQueryBypass) {
            this.logException({
                violationType: 'AUTO_UPCODING',
                attemptedAction: 'Attempted to code specific diagnosis without query resolution',
                blockReason: 'Diagnosis specificity requires provider clarification via query',
                caseId: metadata?.caseId,
                userId: metadata?.userId,
            });

            throw new Error('COMPLIANCE VIOLATION: Auto-upcoding detected. Query must be resolved first.');
        }
    }

    /**
     * Check 2: Prevent severity escalation without documentation
     */
    private checkSeverityEscalation(result: AuditResult, metadata?: any): void {
        // Example: Cannot code severe sepsis (R65.20) without organ dysfunction
        const hasSevereSepsisWithoutOrganDysfunction = result.autoCoded.some(code =>
            (code.code === 'R65.20' || code.code === 'R65.21') &&
            !metadata?.organDysfunctionDocumented
        );

        if (hasSevereSepsisWithoutOrganDysfunction) {
            this.logException({
                violationType: 'SEVERITY_ESCALATION',
                attemptedAction: 'Attempted to code severe sepsis without organ dysfunction',
                blockReason: 'Severe sepsis requires documented acute organ dysfunction per ICD-10-CM guidelines',
                caseId: metadata?.caseId,
                userId: metadata?.userId,
            });

            throw new Error('COMPLIANCE VIOLATION: Severity escalation without clinical support.');
        }
    }

    /**
     * Check 3: Prevent HCC recapture without "addressed" criteria
     */
    private checkHCCRecapture(result: AuditResult, metadata?: any): void {
        // Any chronic condition code must have been "addressed"
        if (metadata?.problemListOnly && result.autoCoded.length > 0) {
            this.logException({
                violationType: 'HCC_RECAPTURE_VIOLATION',
                attemptedAction: 'Attempted to code condition from problem list without addressing',
                blockReason: 'ICD-10-CM Section III requires conditions be evaluated/treated/monitored/affecting care',
                caseId: metadata?.caseId,
                userId: metadata?.userId,
            });

            throw new Error('COMPLIANCE VIOLATION: HCC recapture without addressing prohibited.');
        }
    }

    /**
     * Check 4: Prevent inference-based diagnoses
     */
    private checkInferenceBasedDiagnosis(result: AuditResult, metadata?: any): void {
        // Cannot code diagnosis based solely on labs, imaging, or treatment
        if (metadata?.inferredFromLabs || metadata?.inferredFromTreatment) {
            this.logException({
                violationType: 'INFERENCE_BASED_DIAGNOSIS',
                attemptedAction: 'Attempted to code diagnosis inferred from labs/treatment without provider documentation',
                blockReason: 'Provider must explicitly document diagnosis - cannot infer from ancillary data',
                caseId: metadata?.caseId,
                userId: metadata?.userId,
            });

            throw new Error('COMPLIANCE VIOLATION: Inference-based diagnosis prohibited.');
        }
    }

    /**
     * Log compliance exception
     */
    private logException(exception: Omit<ComplianceException, 'id' | 'timestamp'>): void {
        const entry: ComplianceException = {
            id: `exception_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...exception,
        };

        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.exceptionsLog, line, { mode: 0o444 });
    }

    /**
     * Version pinning enforcement
     */
    validateEngineVersion(expectedVersion: string, actualVersion: string): void {
        if (expectedVersion !== actualVersion) {
            this.logException({
                violationType: 'VERSION_MISMATCH',
                attemptedAction: `Attempted to use engine version ${actualVersion} on case requiring ${expectedVersion}`,
                blockReason: 'Historical cases must be reproducible with exact engine version',
            });

            throw new Error(`COMPLIANCE VIOLATION: Engine version mismatch. Expected ${expectedVersion}, got ${actualVersion}.`);
        }
    }
}

// Export singleton instance
export const safetyControls = new CommercialSafetyControls();
