module.exports = async function versionHandler(req, res) {
    return res.status(200).json({
        apiVersion: 'v1.4-level4',
        gitCommit: '3f9c63f',
        frozenTags: [
            'v1.0-level0-freeze',
            'v1.1-level1-freeze',
            'v1.2-level2-freeze',
            'v1.3.1-level3-fix-freeze',
            'v1.4-level4-freeze'
        ],
        frozenLevels: {
            level0: { tests: 24, status: 'frozen', tag: 'v1.0-level0-freeze' },
            level1: { tests: 12, status: 'frozen', tag: 'v1.1-level1-freeze' },
            level2: { tests: 12, status: 'frozen', tag: 'v1.2-level2-freeze' },
            level3: { tests: 12, status: 'frozen', tag: 'v1.3.1-level3-fix-freeze' },
            level4: { tests: 12, status: 'frozen', tag: 'v1.4-level4-freeze' }
        },
        totalTests: 72,
        message: 'All levels 0-4 are frozen. Future work is Level 5+ only.'
    });
};
