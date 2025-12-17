import { PatientContext } from './context';

export interface StructuredCode {
    code: string;
    label: string;
    rationale: string;
    guideline?: string;
    trigger?: string;
    rule?: string;
}

export interface EngineOutput {
    primary: StructuredCode | null;
    secondary: StructuredCode[];
    procedures: StructuredCode[];
    warnings: string[];
    validationErrors: string[];
    _debugTrauma?: any;
}

export type SequencedCode = StructuredCode; // Alias for compatibility

// Standard Resolver Interface (Phase 1 Requirement)
export type DomainResolver = (ctx: PatientContext) => StructuredCode[];
