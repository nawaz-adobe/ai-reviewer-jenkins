/**
 * Security utilities for input validation and sanitization
 * Prevents command injection and path traversal attacks
 */

const path = require('path');
const crypto = require('crypto');

/**
 * Validates and sanitizes git repository URLs
 * Only allows HTTPS GitHub URLs with proper format
 */
function validateGitUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Git URL is required and must be a string');
    }

    // Remove any whitespace that could be used for injection
    const cleanUrl = url.trim();

    // Only allow HTTPS GitHub URLs
    const githubHttpsRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\.git$/;
    
    if (!githubHttpsRegex.test(cleanUrl)) {
        throw new Error('Invalid git URL format. Only HTTPS GitHub URLs are allowed (https://github.com/owner/repo.git)');
    }

    // Additional checks for suspicious patterns (excluding normal URL patterns)
    const suspiciousPatterns = [
        ';', '&', '|', '`', '$', '(', ')', '<', '>', 
        '\n', '\r', '\t', '..', '\\',
        'rm ', 'curl ', 'wget ', 'nc ', 'bash ', 'sh ',
        'exec', 'eval', 'system'
    ];

    for (const pattern of suspiciousPatterns) {
        if (cleanUrl.includes(pattern)) {
            throw new Error(`Git URL contains suspicious pattern: ${pattern}`);
        }
    }

    // Check for triple slashes or more (which would be suspicious)
    if (cleanUrl.includes('///')) {
        throw new Error('Git URL contains suspicious pattern: ///');
    }

    return cleanUrl;
}

/**
 * Validates and sanitizes branch names
 * Only allows alphanumeric characters, hyphens, underscores, and forward slashes
 */
function validateBranchName(branch) {
    if (!branch || typeof branch !== 'string') {
        throw new Error('Branch name is required and must be a string');
    }

    // Remove any whitespace
    const cleanBranch = branch.trim();

    // Check for empty string after trimming
    if (cleanBranch.length === 0) {
        throw new Error('Branch name cannot be empty');
    }

    // Only allow safe characters: alphanumeric, hyphens, underscores, dots, forward slashes
    const validBranchRegex = /^[\w\-\.\/]+$/;
    
    if (!validBranchRegex.test(cleanBranch)) {
        throw new Error('Branch name contains invalid characters. Only alphanumeric, hyphens, underscores, dots, and forward slashes are allowed');
    }

    // Check for suspicious patterns that could be used for injection
    const suspiciousPatterns = [
        ';', '&', '|', '`', '$', '(', ')', '<', '>', 
        '\n', '\r', '\t', ' ', '\\',
        'rm ', 'curl ', 'wget ', 'nc ', 'bash ', 'sh ',
        'exec', 'eval', 'system'
    ];

    for (const pattern of suspiciousPatterns) {
        if (cleanBranch.includes(pattern)) {
            throw new Error(`Branch name contains suspicious pattern: ${pattern}`);
        }
    }

    // Prevent path traversal attempts
    if (cleanBranch.includes('..') || cleanBranch.startsWith('/')) {
        throw new Error('Branch name contains path traversal patterns');
    }

    // Check for multiple consecutive slashes which could be suspicious
    if (cleanBranch.includes('//')) {
        throw new Error('Branch name contains suspicious pattern: //');
    }

    return cleanBranch;
}

/**
 * Validates and sanitizes file paths to prevent path traversal
 */
function validateFilePath(filePath, allowedBasePath = process.cwd()) {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('File path is required and must be a string');
    }

    const cleanPath = filePath.trim();

    // Check for path traversal attempts
    if (cleanPath.includes('..') || cleanPath.includes('~') || cleanPath.startsWith('/')) {
        throw new Error('File path contains path traversal patterns');
    }

    // Resolve the path and ensure it's within the allowed base path
    const resolvedPath = path.resolve(allowedBasePath, cleanPath);
    const normalizedBasePath = path.resolve(allowedBasePath);

    if (!resolvedPath.startsWith(normalizedBasePath)) {
        throw new Error('File path is outside allowed directory');
    }

    return resolvedPath;
}

/**
 * Creates a secure temporary directory name
 * Uses cryptographically secure random values instead of predictable timestamps
 */
function createSecureTempDir() {
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `/tmp/ai-review-${timestamp}-${randomSuffix}`;
}

/**
 * Validates environment variable values to prevent injection
 */
function validateEnvVar(name, value) {
    if (!name || typeof name !== 'string') {
        throw new Error('Environment variable name is required');
    }

    if (value === null || value === undefined) {
        return value; // Allow null/undefined values
    }

    if (typeof value !== 'string') {
        throw new Error('Environment variable value must be a string');
    }

    // Check for command injection patterns in environment variables
    const suspiciousPatterns = [
        '$(', '`', '${', ';', '&', '|', '<', '>',
        '\n', '\r', '\0'
    ];

    for (const pattern of suspiciousPatterns) {
        if (value.includes(pattern)) {
            throw new Error(`Environment variable ${name} contains suspicious pattern: ${pattern}`);
        }
    }

    return value;
}

/**
 * Sanitizes shell command arguments by escaping special characters
 */
function escapeShellArg(arg) {
    if (!arg || typeof arg !== 'string') {
        throw new Error('Shell argument must be a non-empty string');
    }

    // Escape single quotes by replacing them with '\''
    return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validates that a string contains only safe characters for shell commands
 */
function isSafeForShell(str) {
    if (!str || typeof str !== 'string') {
        return false;
    }

    // Check for any characters that could be used for command injection
    const dangerousChars = /[;&|`$()<>\n\r\t\\]/;
    return !dangerousChars.test(str);
}

module.exports = {
    validateGitUrl,
    validateBranchName,
    validateFilePath,
    createSecureTempDir,
    validateEnvVar,
    escapeShellArg,
    isSafeForShell
};
