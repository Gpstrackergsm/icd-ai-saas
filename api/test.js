// Minimal test endpoint - no dependencies
module.exports = async function handler(req, res) {
    res.status(200).json({
        success: true,
        message: "API is working",
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: "test"
    });
};
