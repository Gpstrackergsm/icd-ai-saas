/**
 * PARSER INTEGRATION LAYER
 * 
 * Enforces separation of concerns:
 * - Parser extracts WHAT was documented
 * - Audit engine determines WHAT is allowed to be coded
 * 
 * Parser role = extraction ONLY
 * NO diagnosis inference
 * NO rule logic
 */

import { auditEngine } from '../auditEngine';
import { AuditResult } from '../auditResult';
import { auditTrail } from './auditTrail';
import { queryLifecycle } from './queryLifecycle';
import { safetyControls } from './safetyControls';

export interface ParserOutput {
    // Raw extraction only - NO diagnoses
    providerTerms: {
        diagnoses: string[]; // Exact terms provider used
        symptoms: string[];
        procedures: string[];
    };
    vitalSigns: {
        bloodPressure?: string;
        temperature?: number;
        heartRate?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
    };
    labValues: {
        creatinine?: { value: number; baseline?: number };
        lactate?: number;
        glucose?: number;
        hemoglobin?: number;
        // etc.
    };
    clinicalFindings: {
        imagingFindings?: string[];
        physicalExamFindings?: string[];
    };
    treatments: {
        medications?: string[];
        procedures?: string[];
        oxygenSupport?: string;
    };
    // Guardrail flag
    containsInferredDiagnosis: boolean;
}

export class ParserIntegrationLayer {
    /**
     * Main integration point: Parser output → Audit Engine
     */
    async processCase(
        rawNarrative: string,
        parserOutput: ParserOutput,
        metadata?: { caseId?: string; facilityId?: string; userId?: string }
    ): Promise<{
        auditResult: AuditResult;
        auditTrailId: string;
        queriesGenerated: any[];
    }> {
        // GUARDRAIL: Block if parser attempted to infer diagnosis
        if (parserOutput.containsInferredDiagnosis) {
            this.logParserViolation(rawNarrative, parserOutput);
            throw new Error(
                'PARSER VIOLATION: Parser attempted to infer diagnosis. Parser role is extraction only.'
            );
        }

        // Build contexts for audit engine based on EXTRACTED data only
        const contexts = this.buildAuditContexts(parserOutput);

        // Run audit engine
        const auditResult = auditEngine.evaluateComprehensive(contexts);

        // Commercial safety validation
        safetyControls.validateResult(auditResult, {
            providerDocumented: parserOutput.providerTerms.diagnoses.length > 0,
            inferredFromLabs: parserOutput.containsInferredDiagnosis,
            caseId: metadata?.caseId,
            userId: metadata?.userId,
        });

        // Log to audit trail
        const auditTrailId = auditTrail.log(rawNarrative, parserOutput, auditResult, metadata);

        // Generate queries if needed
        const queriesGenerated = queryLifecycle.generateQueries(
            metadata?.caseId || auditTrailId,
            auditResult
        );

        return {
            auditResult,
            auditTrailId,
            queriesGenerated,
        };
    }

    /**
     * Build audit contexts from parser output
     * NO inference - only explicit provider documentation
     */
    private buildAuditContexts(parserOutput: ParserOutput): any {
        const contexts: any = {};

        // Sepsis context (only if provider documented sepsis-related term)
        const sepsisTerms = ['sepsis', 'severe sepsis', 'septic shock', 'sirs'];
        const sepsisDocumented = parserOutput.providerTerms.diagnoses.some(d =>
            sepsisTerms.some(term => d.toLowerCase().includes(term))
        );

        if (sepsisDocumented) {
            const providerTerm = parserOutput.providerTerms.diagnoses.find(d =>
                sepsisTerms.some(term => d.toLowerCase().includes(term))
            );

            contexts.sepsis = {
                providerTerm: providerTerm?.toLowerCase() || '',
                organDysfunctionDocumented: this.checkOrganDysfunctionDocumented(parserOutput),
                hypotensionRequiresVasopressors: parserOutput.treatments.medications?.some(m =>
                    m.toLowerCase().includes('vasopressor') || m.toLowerCase().includes('norepinephrine')
                ) || false,
                lactate: parserOutput.labValues.lactate,
            };
        }

        // Renal context
        const renalTerms = ['aki', 'acute kidney', 'ckd', 'chronic kidney', 'renal insufficiency', 'azotemia'];
        const renalDocumented = parserOutput.providerTerms.diagnoses.some(d =>
            renalTerms.some(term => d.toLowerCase().includes(term))
        );

        if (renalDocumented || parserOutput.labValues.creatinine) {
            const renalTerm = parserOutput.providerTerms.diagnoses.find(d =>
                renalTerms.some(term => d.toLowerCase().includes(term))
            );

            contexts.renal = {
                providerTerm: renalTerm,
                creatinineBaseline: parserOutput.labValues.creatinine?.baseline,
                creatinineCurrent: parserOutput.labValues.creatinine?.value,
                providerDocumentedDiagnosis: !!renalTerm,
            };
        }

        // Add other contexts as needed (diabetes, heart failure, etc.)

        return contexts;
    }

    /**
     * Check if organ dysfunction is documented (not inferred)
     */
    private checkOrganDysfunctionDocumented(parserOutput: ParserOutput): boolean {
        const organDysfunctionTerms = [
            'acute kidney injury',
            'respiratory failure',
            'liver failure',
            'coagulopathy',
            'encephalopathy',
            'shock',
        ];

        return parserOutput.providerTerms.diagnoses.some(d =>
            organDysfunctionTerms.some(term => d.toLowerCase().includes(term))
        );
    }

    /**
     * Log parser violation
     */
    private logParserViolation(narrative: string, parserOutput: ParserOutput): void {
        console.error('PARSER VIOLATION DETECTED');
        console.error('Parser attempted to infer diagnosis');
        console.error('Narrative:', narrative.substring(0, 200) + '...');
        console.error('Parser output:', JSON.stringify(parserOutput, null, 2));
    }
}

// Export singleton instance
export const parserIntegration = new ParserIntegrationLayer();
