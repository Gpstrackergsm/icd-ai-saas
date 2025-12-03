export default async function handler(req, res) {
    const versionData = {
        version: '2.0.0',
        status: 'Deployed',
        lastUpdate: '2025-12-03T22:34:00Z'
    };

    // If requesting JSON, return JSON
    if (req.headers.accept?.includes('application/json')) {
        return res.status(200).json(versionData);
    }

    // Otherwise, return simple HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICD-10-CM Encoder - Version</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }

        h1 {
            color: #1a202c;
            font-size: 28px;
            margin-bottom: 32px;
        }

        .info {
            margin: 24px 0;
        }

        .label {
            color: #718096;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .value {
            color: #1a202c;
            font-size: 32px;
            font-weight: 700;
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: #f0fdf4;
            border-radius: 50px;
            border: 2px solid #86efac;
            margin-top: 16px;
        }

        .dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .status-text {
            color: #166534;
            font-weight: 600;
            font-size: 14px;
        }

        .btn {
            display: inline-block;
            margin-top: 32px;
            padding: 12px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.2s;
        }

        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>ICD-10-CM Encoder</h1>
        
        <div class="info">
            <div class="label">Version</div>
            <div class="value">${versionData.version}</div>
        </div>

        <div class="status">
            <div class="dot"></div>
            <span class="status-text">${versionData.status}</span>
        </div>

        <a href="/" class="btn">Go to Encoder</a>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
}
