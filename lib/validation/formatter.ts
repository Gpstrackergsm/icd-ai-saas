import { ValidationRuleResult } from './highRiskRules';

export function formatValidationError(result: ValidationRuleResult, index: number = 1): string {
    const isError = result.level === 'error';

    // Enterprise Color definitions
    const styles = isError ? {
        // BLOCK (High Risk)
        cardBg: 'bg-white',
        strip: 'bg-gradient-to-b from-red-600 to-red-800',
        title: 'text-gray-900',
        icon: 'text-red-600',
        text: 'text-gray-700',
        badge: 'text-red-700 border border-red-200 bg-red-50', // Solid text, subtle bg
        label: 'HIGH RISK',
        primaryBtn: 'bg-red-700 text-white hover:bg-red-800 border-transparent',
        secondaryBtn: 'text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
    } : {
        // WARNING (Medium Risk)
        cardBg: 'bg-white',
        strip: 'bg-gradient-to-b from-orange-500 to-orange-600',
        title: 'text-gray-900',
        icon: 'text-orange-500',
        text: 'text-gray-700',
        badge: 'text-orange-700 border border-orange-200 bg-orange-50',
        label: 'MEDIUM RISK',
        primaryBtn: 'bg-orange-600 text-white hover:bg-orange-700 border-transparent',
        secondaryBtn: 'text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
    };

    const actionList = result.action.map(step => `
        <div class="flex items-start gap-2 text-sm text-gray-800">
            <i class="fa-solid fa-check mt-1 text-green-600"></i>
            <span>${step}</span>
        </div>
    `).join('');

    return `
    <div class="relative w-full rounded-lg shadow-sm ${styles.cardBg} border border-gray-200 overflow-hidden mb-4 font-sans group hover:shadow-md transition-all">
        <!-- Severity Strip -->
        <div class="absolute left-0 top-0 bottom-0 w-1.5 ${styles.strip}"></div>
        
        <div class="pl-6 p-5">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-triangle-exclamation ${styles.icon} text-lg"></i>
                    <div>
                        <span class="block font-bold text-base ${styles.title} uppercase tracking-tight">${result.ruleId}</span>
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">${result.ruleName}</span>
                    </div>
                </div>
                <!-- Risk Badge -->
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${styles.badge}">
                    <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
                    ${styles.label}
                </div>
            </div>

            <!-- Content Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                <div>
                    <strong class="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Issue Detected</strong>
                    <div class="text-sm font-medium text-gray-900 leading-relaxed">
                        ${result.issue}
                    </div>
                </div>
                <div>
                    <strong class="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Audit Impact</strong>
                    <div class="text-sm text-gray-600 italic leading-relaxed">
                        ${result.why}
                    </div>
                </div>
            </div>

            <!-- Action Area -->
            <div class="bg-gray-50 rounded-md p-4 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <strong class="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Resolution Required</strong>
                    <div class="space-y-1 font-semibold">
                        ${actionList}
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex items-center gap-3 shrink-0 mt-2 md:mt-0">
                    <button class="px-4 py-2 text-xs font-bold rounded shadow-sm transition-colors uppercase tracking-wide border ${styles.secondaryBtn}">
                        View Rule
                    </button>
                    <button class="px-5 py-2 text-xs font-bold rounded shadow-sm transition-colors uppercase tracking-wide border ${styles.primaryBtn}">
                        Fix Now
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}
