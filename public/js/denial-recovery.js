// Denial Recovery Dashboard Logic

// Sample Data
const denialData = {
    claims: [
        {
            id: 'CLM-2024-00123',
            xmlUrl: '/claims/xml/00123.xml',
            payer: 'Daman',
            rejectionReason: 'Medical Necessity',
            falconScore: 85,
            amount: 12500
        },
        {
            id: 'CLM-2024-00124',
            xmlUrl: '/claims/xml/00124.xml',
            payer: 'Neuron',
            rejectionReason: 'Missing Modifier',
            falconScore: 92,
            amount: 8900
        },
        {
            id: 'CLM-2024-00125',
            xmlUrl: '/claims/xml/00125.xml',
            payer: 'Daman',
            rejectionReason: 'Coding Error',
            falconScore: 78,
            amount: 15200
        },
        {
            id: 'CLM-2024-00126',
            xmlUrl: '/claims/xml/00126.xml',
            payer: 'SAICO',
            rejectionReason: 'Documentation Incomplete',
            falconScore: 65,
            amount: 9800
        },
        {
            id: 'CLM-2024-00127',
            xmlUrl: '/claims/xml/00127.xml',
            payer: 'AXA',
            rejectionReason: 'Medical Necessity',
            falconScore: 88,
            amount: 18700
        },
        {
            id: 'CLM-2024-00128',
            xmlUrl: '/claims/xml/00128.xml',
            payer: 'Daman',
            rejectionReason: 'Eligibility Issue',
            falconScore: 45,
            amount: 6500
        },
        {
            id: 'CLM-2024-00129',
            xmlUrl: '/claims/xml/00129.xml',
            payer: 'Neuron',
            rejectionReason: 'Coding Error',
            falconScore: 82,
            amount: 11200
        },
        {
            id: 'CLM-2024-00130',
            xmlUrl: '/claims/xml/00130.xml',
            payer: 'Daman',
            rejectionReason: 'Medical Necessity',
            falconScore: 91,
            amount: 14600
        },
        {
            id: 'CLM-2024-00131',
            xmlUrl: '/claims/xml/00131.xml',
            payer: 'SAICO',
            rejectionReason: 'Missing Documentation',
            falconScore: 72,
            amount: 10400
        },
        {
            id: 'CLM-2024-00132',
            xmlUrl: '/claims/xml/00132.xml',
            payer: 'AXA',
            rejectionReason: 'Coding Error',
            falconScore: 86,
            amount: 13800
        }
    ]
};

// Initialize Dashboard
function initDashboard() {
    renderDenialTable();
    initCharts();
}

// Render Denial Table
function renderDenialTable() {
    const tbody = document.getElementById('denialTableBody');
    tbody.innerHTML = '';

    denialData.claims.forEach(claim => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const scoreClass = getScoreClass(claim.falconScore);
        const payerBadge = getPayerBadge(claim.payer);

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <a href="${claim.xmlUrl}" class="text-blue-600 hover:text-blue-800 font-medium">
                    ${claim.id}
                </a>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${payerBadge}
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-gray-900">${claim.rejectionReason}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${claim.falconScore}%"></div>
                    </div>
                    <span class="${scoreClass}">${claim.falconScore}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button onclick="openAppealPanel('${claim.id}')" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
                    <i class="fas fa-magic mr-1"></i> Generate Appeal
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Get Score Class
function getScoreClass(score) {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
}

// Get Payer Badge
function getPayerBadge(payer) {
    const colors = {
        'Daman': 'bg-blue-100 text-blue-800',
        'Neuron': 'bg-purple-100 text-purple-800',
        'SAICO': 'bg-green-100 text-green-800',
        'AXA': 'bg-orange-100 text-orange-800'
    };

    const colorClass = colors[payer] || 'bg-gray-100 text-gray-800';

    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}">
                ${payer}
            </span>`;
}

// Open Appeal Panel
function openAppealPanel(claimId) {
    const claim = denialData.claims.find(c => c.id === claimId);
    if (!claim) return;

    // Update panel content
    document.getElementById('panelClaimId').textContent = claim.id;
    document.getElementById('panelPayer').textContent = claim.payer;
    document.getElementById('panelReason').textContent = claim.rejectionReason;
    document.getElementById('panelScore').textContent = claim.falconScore;
    document.getElementById('panelScore').className = getScoreClass(claim.falconScore);

    // Show panel
    document.getElementById('appealPanel').classList.add('active');
    document.getElementById('panelOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close Appeal Panel
function closeAppealPanel() {
    document.getElementById('appealPanel').classList.remove('active');
    document.getElementById('panelOverlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Copy Rebuttal
function copyRebuttal() {
    const textarea = document.getElementById('rebuttalText');
    textarea.select();
    document.execCommand('copy');

    // Show feedback
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
    btn.classList.add('bg-green-600');
    btn.classList.remove('bg-blue-600');

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('bg-green-600');
        btn.classList.add('bg-blue-600');
    }, 2000);
}

// Initialize Charts
function initCharts() {
    // Pie Chart: Rejection Reasons
    const rejectionCtx = document.getElementById('rejectionReasonsChart').getContext('2d');
    new Chart(rejectionCtx, {
        type: 'pie',
        data: {
            labels: ['Medical Necessity', 'Coding Error', 'Missing Documentation', 'Eligibility', 'Other'],
            datasets: [{
                data: [35, 28, 18, 12, 7],
                backgroundColor: [
                    '#ef4444',
                    '#f59e0b',
                    '#3b82f6',
                    '#8b5cf6',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Bar Chart: Denials by Department
    const deptCtx = document.getElementById('departmentChart').getContext('2d');
    new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: ['Surgery', 'Emergency', 'Radiology', 'Laboratory', 'Pharmacy', 'Other'],
            datasets: [{
                label: 'Denials',
                data: [15, 12, 8, 5, 4, 3],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
                    }
                }
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);

// Close panel on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAppealPanel();
    }
});
