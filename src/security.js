/**
 * Simple security utilities
 */

/**
 * Basic git URL validation
 */
function validateGitUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Git URL is required');
    }

    const cleanUrl = url.trim();
    
    // Only allow HTTPS GitHub URLs
    if (!cleanUrl.startsWith('https://github.com/') || !cleanUrl.endsWith('.git')) {
        throw new Error('Only HTTPS GitHub URLs are allowed');
    }

    return cleanUrl;
}

/**
 * Basic branch name validation
 */
function validateBranchName(branch) {
    if (!branch || typeof branch !== 'string') {
        throw new Error('Branch name is required');
    }

    const cleanBranch = branch.trim();
    
    // Basic branch name validation - no special chars
    if (!/^[a-zA-Z0-9_\/-]+$/.test(cleanBranch)) {
        throw new Error('Invalid branch name format');
    }

    return cleanBranch;
}

module.exports = {
    validateGitUrl,
    validateBranchName
};