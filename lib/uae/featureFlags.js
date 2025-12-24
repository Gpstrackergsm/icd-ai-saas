/**
 * UAE Diagnostic Test Feature Flags - PRODUCTION SAFE
 * 
 * DO NOT MODIFY THESE FLAGS AT RUNTIME
 * Use resolveUaeFlags(req) to get per-request flag configuration
 * 
 * Flags can be enabled via:
 * 1. Environment variables: UAE_ENABLE_DENGUE=true
 * 2. Request body: req.body.uaeFlags = { dengue: true }
 */

const DEFAULT_FLAGS = Object.freeze({
    ENABLE_DENGUE_TEST: false,
    ENABLE_TB_TEST: false,
    ENABLE_RSV_TEST: false,
    ENABLE_INFLUENZA_TEST: false,
    ENABLE_MALARIA_TEST: false,
    ENABLE_HIV_TEST: false,
    ENABLE_PREGNANCY_TEST: false,
    ENABLE_HEPB_TEST: false,
    ENABLE_ROTAVIRUS_TEST: false
});

/**
 * Resolve UAE flags per-request (IMMUTABLE)
 * 
 * Priority:
 * 1. req.body.uaeFlags (explicit per-request override)
 * 2. Environment variables (UAE_ENABLE_*)
 * 3. DEFAULT_FLAGS (all false)
 * 
 * Returns: Frozen object (immutable) - new instance per call
 */
function resolveUaeFlags(req = null) {
    const flags = { ...DEFAULT_FLAGS };

    // Priority 1: Environment variables
    if (process.env.UAE_ENABLE_DENGUE === 'true') flags.ENABLE_DENGUE_TEST = true;
    if (process.env.UAE_ENABLE_TB === 'true') flags.ENABLE_TB_TEST = true;
    if (process.env.UAE_ENABLE_RSV === 'true') flags.ENABLE_RSV_TEST = true;
    if (process.env.UAE_ENABLE_INFLUENZA === 'true') flags.ENABLE_INFLUENZA_TEST = true;
    if (process.env.UAE_ENABLE_MALARIA === 'true') flags.ENABLE_MALARIA_TEST = true;
    if (process.env.UAE_ENABLE_HIV === 'true') flags.ENABLE_HIV_TEST = true;
    if (process.env.UAE_ENABLE_PREGNANCY === 'true') flags.ENABLE_PREGNANCY_TEST = true;
    if (process.env.UAE_ENABLE_HEPB === 'true') flags.ENABLE_HEPB_TEST = true;
    if (process.env.UAE_ENABLE_ROTAVIRUS === 'true') flags.ENABLE_ROTAVIRUS_TEST = true;

    // Priority 2: Request body override (if provided)
    if (req && req.body && req.body.uaeFlags) {
        const reqFlags = req.body.uaeFlags;
        if (reqFlags.dengue === true) flags.ENABLE_DENGUE_TEST = true;
        if (reqFlags.tb === true) flags.ENABLE_TB_TEST = true;
        if (reqFlags.rsv === true) flags.ENABLE_RSV_TEST = true;
        if (reqFlags.influenza === true) flags.ENABLE_INFLUENZA_TEST = true;
        if (reqFlags.malaria === true) flags.ENABLE_MALARIA_TEST = true;
        if (reqFlags.hiv === true) flags.ENABLE_HIV_TEST = true;
        if (reqFlags.pregnancy === true) flags.ENABLE_PREGNANCY_TEST = true;
        if (reqFlags.hepb === true) flags.ENABLE_HEPB_TEST = true;
        if (reqFlags.rotavirus === true) flags.ENABLE_ROTAVIRUS_TEST = true;
    }

    // Return frozen (immutable) copy
    return Object.freeze(flags);
}

module.exports = {
    DEFAULT_FLAGS,
    resolveUaeFlags
};
