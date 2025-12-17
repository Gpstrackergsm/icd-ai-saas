
import { PatientContext } from '../context';
import { StructuredCode, DomainResolver } from '../types';

// Importing Resolvers
import { resolveNeurology } from '../neurologyResolver';
import { resolveSepsis } from './sepsisResolver';

// The Registry of active Domain Resolvers
export const resolvers: DomainResolver[] = [
    resolveNeurology,
    resolveSepsis
];

// Orchestrator function to run all resolvers
export function runDomainResolvers(ctx: PatientContext): StructuredCode[] {
    return resolvers.flatMap(resolve => resolve(ctx));
}
