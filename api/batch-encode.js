// Batch Encode API - Process multiple structured cases from uploaded file
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileContent } = req.body;

        if (!fileContent) {
            return res.status(400).json({ error: 'No file content provided' });
        }

        // Dynamically import processing modules
        const { parseInput } = await import('../lib/structured/parser.js');
        const { runStructuredRules } = await import('../lib/structured/engine.js');
        const { validateCodeSet } = await import('../lib/structured/validator-post.js');
        const { validateFinalOutput } = await import('../lib/structured/validator-enhanced.js');
        const { applyAdvancedCodingRules } = await import('../lib/structured/validator-advanced.js');

        // Parse cases from file content
        const cases = [];
        const lines = fileContent.split('\n');
        let currentCase = null;

        for (const line of lines) {
            if (line.trim().startsWith('CASE ')) {
                if (currentCase) {
                    cases.push(currentCase);
                }
                const caseNum = parseInt(line.replace('CASE ', '').trim());
                currentCase = { id: caseNum, lines: [] };
            } else if (currentCase && line.trim()) {
                currentCase.lines.push(line.trim());
            }
        }
        if (currentCase) {
            cases.push(currentCase);
        }

        // Process each case
        const results = [];
        for (const testCase of cases) {
            const input = testCase.lines.join('\n');

            try {
                const { context } = parseInput(input);
                const engineResult = runStructuredRules(context);
                const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
                const enhanced = validateFinalOutput(validated.codes, input);
                const finalCodes = applyAdvancedCodingRules(enhanced.codes, input);

                results.push({
                    caseId: testCase.id,
                    input,
                    codes: finalCodes.map(c => c.code),
                    success: true
                });
            } catch (error) {
                results.push({
                    caseId: testCase.id,
                    input,
                    codes: [],
                    success: false,
                    error: error.message
                });
            }
        }

        // Format output
        let output = '';
        for (const result of results) {
            output += `CASE ${result.caseId}:\n`;
            const inputLines = result.input.split('\n');
            inputLines.forEach(line => {
                output += `  ${line}\n`;
            });
            output += '\n';
            output += 'ICD_CODES:\n';
            if (result.codes.length === 0) {
                output += '  NO CODABLE DIAGNOSIS\n';
            } else {
                output += `  ${result.codes.join(', ')}\n`;
            }
            output += '\n';
        }

        return res.status(200).json({
            success: true,
            totalCases: cases.length,
            processedCases: results.filter(r => r.success).length,
            failedCases: results.filter(r => !r.success).length,
            output: output.trim()
        });

    } catch (error) {
        console.error('Batch encode error:', error);
        return res.status(500).json({
            error: 'Processing failed',
            message: error.message
        });
    }
}
