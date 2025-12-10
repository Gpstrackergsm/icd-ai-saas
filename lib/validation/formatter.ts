import { ValidationRuleResult } from './highRiskRules';

export function formatValidationError(result: ValidationRuleResult, index: number = 1): string {
    const isError = result.level === 'error';

    // Color definitions
    const styles = isError ? {
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#DC2626]',
        title: 'text-[#991B1B]',
        icon: 'text-[#EF4444]',
        text: 'text-[#7F1D1D]',
        badgeBg: 'bg-[#FEE2E2]',
        badgeText: 'text-[#991B1B]',
        label: 'HIGH RISK'
    } : {
        bg: 'bg-[#FFF7ED]',
        border: 'border-[#F97316]',
        title: 'text-[#EA580C]',
        icon: 'text-[#FB923C]',
        text: 'text-[#7C2D12]',
        badgeBg: 'bg-[#FFEDD5]',
        badgeText: 'text-[#9A3412]',
        label: 'MEDIUM RISK'
    };

    const actionList = result.action.map(step => `<div class="flex items-start gap-2"><i class="fa-solid fa-check mt-1"></i><span>${step}</span></div>`).join('');

    return `
    <div class="relative w-full rounded-md shadow-sm border border-slate-200 ${styles.bg} border-l-[6px] ${styles.border} p-4 mb-4 font-sans transition-all hover:shadow-md">
        <!-- Header -->
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-shield-halved ${styles.icon} text-lg"></i>
                <span class="font-bold text-lg ${styles.title}">${result.ruleId} — ${result.ruleName}</span>
            </div>
            <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${styles.badgeBg} ${styles.badgeText}">
                ${styles.label}
            </span>
        </div>

        <!-- content -->
        <div class="space-y-3 ${styles.text} text-sm">
            <!-- Issue -->
            <div>
                <strong class="block text-xs uppercase tracking-wide opacity-80 mb-1">Issue Detected</strong>
                <div class="leading-relaxed font-medium">
                    ${result.issue}
                </div>
            </div>

            <!-- Impact -->
            <div>
                <strong class="block text-xs uppercase tracking-wide opacity-80 mb-1">Why This Matters</strong>
                <div class="leading-relaxed italic opacity-90">
                    ${result.why}
                </div>
            </div>

            <!-- Action -->
            <div class="mt-4 pt-3 border-t border-black/5">
                <strong class="block text-xs uppercase tracking-wide opacity-80 mb-2">Action Required</strong>
                <div class="space-y-1 font-semibold">
                    ${actionList}
                </div>
            </div>
        </div>
    </div>
    `;
}
