import { ValidationRuleResult } from './highRiskRules';

export function formatValidationError(result: ValidationRuleResult, index: number = 1): string {
    const isError = result.level === 'error';

    // Premium Color definitions
    const styles = isError ? {
        // BLOCK (High Risk)
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#DC2626]',
        title: 'text-[#7F1D1D]',
        icon: 'text-[#EF4444]',
        text: 'text-[#7F1D1D]',
        badgeBg: 'bg-[#FEE2E2]',
        badgeText: 'text-[#991B1B]',
        label: 'HIGH RISK'
    } : {
        // WARNING (Medium Risk)
        bg: 'bg-[#FFF7ED]',
        border: 'border-[#F97316]',
        title: 'text-[#EA580C]',
        icon: 'text-[#FB923C]',
        text: 'text-[#7C2D12]',
        badgeBg: 'bg-[#FFEDD5]',
        badgeText: 'text-[#9A3412]',
        label: 'MEDIUM RISK'
    };

    const actionList = result.action.map(step => `
        <div class="flex items-start gap-2 text-sm">
            <i class="fa-solid fa-check mt-1 text-green-600"></i>
            <span>${step}</span>
        </div>
    `).join('');

    return `
    <div class="relative w-full rounded-lg shadow-sm ${styles.bg} border-l-[6px] ${styles.border} p-5 mb-4 font-sans transition-all hover:shadow-md">
        <!-- Header -->
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-white/50 rounded-full">
                    <i class="fa-solid fa-shield-halved ${styles.icon} text-lg"></i>
                </div>
                <div>
                    <span class="block font-bold text-lg ${styles.title} leading-tight">${result.ruleId}</span>
                    <span class="text-xs font-semibold opacity-75 uppercase tracking-wide">${result.ruleName}</span>
                </div>
            </div>
            <span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm ${styles.badgeBg} ${styles.badgeText}">
                ${styles.label}
            </span>
        </div>

        <!-- content -->
        <div class="space-y-4 ${styles.text}">
            <!-- Issue & Impact Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 p-3 rounded-md border border-black/5">
                <div>
                    <strong class="block text-[10px] uppercase tracking-wider opacity-70 mb-1">Issue Detected</strong>
                    <div class="text-sm font-medium leading-relaxed">
                        ${result.issue}
                    </div>
                </div>
                <div>
                    <strong class="block text-[10px] uppercase tracking-wider opacity-70 mb-1">Audit Impact</strong>
                    <div class="text-sm italic opacity-90 leading-relaxed">
                        ${result.why}
                    </div>
                </div>
            </div>

            <!-- Action Area -->
            <div>
                <strong class="block text-[10px] uppercase tracking-wider opacity-70 mb-2">Resolution Required</strong>
                <div class="space-y-1 font-semibold mb-4">
                    ${actionList}
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-3 mt-3">
                    <button class="px-4 py-1.5 bg-white border border-red-200 shadow-sm rounded text-xs font-bold text-red-900 hover:bg-red-50 transition-colors uppercase tracking-wide">
                        <i class="fa-solid fa-wrench mr-1"></i> Fix Now
                    </button>
                    <button class="px-4 py-1.5 bg-transparent border border-black/10 rounded text-xs font-semibold opacity-60 hover:opacity-100 hover:bg-white/30 transition-all uppercase tracking-wide">
                        View Rule
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}
