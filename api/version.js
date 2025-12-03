export default async function handler(req, res) {
    const versionData = {
        version: '2.0.0',
        lastUpdate: '2025-12-03T22:13:00Z',
        features: [
            'Sepsis-first sequencing (R65.20 as primary)',
            'Organism-specific pneumonia (J15.5, J15.212)',
            'Postpartum coding (O82/O80)',
            'ICD-10 guideline compliance',
            'No redundant B96.x codes'
        ],
        status: 'Latest version deployed'
    };

    // If requesting JSON, return JSON
    if (req.headers.accept?.includes('application/json')) {
        return res.status(200).json(versionData);
    }

    // Otherwise, return beautiful HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICD-10-CM Encoder - Version Info</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            padding: 48px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .logo {
            font-size: 48px;
            margin-bottom: 16px;
        }

        h1 {
            color: #1a202c;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #718096;
            font-size: 16px;
        }

        .version-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 20px;
            font-weight: 600;
            margin: 24px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 16px 0;
            padding: 12px;
            background: #f0fdf4;
            border-radius: 12px;
            border: 2px solid #86efac;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }

        .status-text {
            color: #166534;
            font-weight: 600;
        }

        .section {
            margin: 32px 0;
        }

        .section-title {
            color: #2d3748;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .features-list {
            list-style: none;
        }

        .feature-item {
            padding: 14px;
            margin: 8px 0;
            background: #f7fafc;
            border-radius: 12px;
            border-left: 4px solid #667eea;
            color: #2d3748;
            transition: all 0.3s ease;
        }

        .feature-item:hover {
            transform: translateX(8px);
            background: #edf2f7;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .feature-item::before {
            content: "✓";
            color: #667eea;
            font-weight: bold;
            margin-right: 12px;
            font-size: 18px;
        }

        .timestamp {
            text-align: center;
            color: #a0aec0;
            font-size: 14px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 2px solid #e2e8f0;
        }

        .footer {
            text-align: center;
            margin-top: 32px;
        }

        .btn {
            display: inline-block;
            padding: 12px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        @media (max-width: 640px) {
            .container {
                padding: 32px 24px;
            }

            h1 {
                font-size: 24px;
            }

            .version-badge {
                font-size: 18px;
                padding: 10px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏥</div>
            <h1>ICD-10-CM Encoder</h1>
            <p class="subtitle">Clinical Coding Engine</p>
        </div>

        <div style="text-align: center;">
            <div class="version-badge">Version ${versionData.version}</div>
        </div>

        <div class="status">
            <div class="status-dot"></div>
            <span class="status-text">${versionData.status}</span>
        </div>

        <div class="section">
            <div class="section-title">
                <span>🚀</span>
                <span>Latest Features</span>
            </div>
            <ul class="features-list">
                ${versionData.features.map(feature => `
                    <li class="feature-item">${feature}</li>
                `).join('')}
            </ul>
        </div>

        <div class="timestamp">
            Last updated: ${new Date(versionData.lastUpdate).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
    })}
        </div>

        <div class="footer">
            <a href="/" class="btn">Go to Encoder</a>
        </div>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
}
