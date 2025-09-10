#!/usr/bin/env node

/**
 * Simple Jenkins AI Code Reviewer
 */

require('dotenv').config();
const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const { CodeReviewer } = require('ai-reviewer-core');
const { Command } = require('commander');

// Simple logging utility
const logger = {
    info: (message, data = {}) => console.log(`ℹ️  ${message}`, Object.keys(data).length ? data : ''),
    warn: (message, data = {}) => console.warn(`⚠️  ${message}`, Object.keys(data).length ? data : ''),
    error: (message, data = {}) => console.error(`❌ ${message}`, Object.keys(data).length ? data : ''),
    success: (message, data = {}) => console.log(`✅ ${message}`, Object.keys(data).length ? data : '')
};

// Centralized environment validation
function validateEnvironment() {
    const required = {
        'LLM_API_KEY': 'OpenAI API key',
        'LLM_ENDPOINT': 'OpenAI API endpoint', 
        'GITHUB_APP_ID': 'GitHub App ID',
        'GITHUB_APP_PRIVATE_KEY': 'GitHub App private key',
        'GITHUB_INSTALLATION_ID': 'GitHub App installation ID'
    };
    
    for (const [envVar, description] of Object.entries(required)) {
        if (!process.env[envVar]) {
            throw new Error(`${envVar} environment variable is required (${description})`);
        }
    }
    
    logger.info('Environment validation passed');
}

// Retry utility with exponential backoff
async function withRetry(fn, maxAttempts = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isLastAttempt = attempt === maxAttempts;
            const isRetryable = error.status >= 500 || error.status === 429 || error.code === 'ECONNRESET';
            
            if (isLastAttempt || !isRetryable) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: error.message });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Rate limiting helper
const rateLimiter = {
    checkAndWait: async (response) => {
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '5000');
        const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0');
        
        if (remaining < 10) {
            const waitTime = Math.max(0, (resetTime * 1000) - Date.now() + 1000);
            if (waitTime > 0) {
                logger.warn(`Rate limit low (${remaining} remaining), waiting ${Math.round(waitTime/1000)}s`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        return remaining;
    }
};

// Input validation
function validateInputs(org, repo, pr) {
    if (!org || !repo || !pr) {
        throw new Error('Organization, repository, and PR number are required');
    }
    
    // Basic validation for org/repo names (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(org) || !/^[a-zA-Z0-9_-]+$/.test(repo)) {
        throw new Error('Invalid organization or repository name');
    }
    
    // PR number should be numeric
    if (!/^\d+$/.test(pr)) {
        throw new Error('PR number must be numeric');
    }
}

// Create authenticated Octokit instance using GitHub App
function createOctokit() {
    const githubBaseUrl = process.env.GITHUB_BASE_URL || 'https://api.github.com';
    
    logger.info('Using GitHub App authentication', { baseUrl: githubBaseUrl });
    
    return new Octokit({
        baseUrl: githubBaseUrl,
        authStrategy: createAppAuth,
        auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
            installationId: process.env.GITHUB_INSTALLATION_ID,
        },
    });
}

// Enhanced CLI argument parsing using commander
function parseArgs() {
    const program = new Command();
    
    program
        .name('ai-review')
        .description('AI-powered code review for GitHub PRs using CodeWhisperer')
        .version('1.0.0')
        .argument('<org>', 'GitHub organization/owner name')
        .argument('<repo>', 'Repository name')
        .argument('<pr>', 'Pull request number')
        .option('-o, --output <file>', 'Output file for review results', 'review-results.json')
        .option('--no-comments', 'Skip posting comments to PR (generate review only)')
        .option('--dry-run', 'Perform review without posting to GitHub')
        .option('--max-retries <number>', 'Maximum retry attempts for API calls', '3')
        .addHelpText('after', `
Environment Variables:
  LLM_API_KEY               OpenAI API key
  LLM_ENDPOINT              OpenAI API endpoint
  POST_COMMENTS             Post comments to PR (true/false, default: true)
  GITHUB_BASE_URL           GitHub base URL (default: https://api.github.com)
  
  GitHub App Authentication (required):
  GITHUB_APP_ID             GitHub App ID
  GITHUB_APP_PRIVATE_KEY    GitHub App private key (PEM format)
  GITHUB_INSTALLATION_ID    GitHub App installation ID

Examples:
  ai-review myorg myrepo 123
  ai-review myorg myrepo 123 --output custom-results.json
  ai-review myorg myrepo 123 --no-comments --dry-run
        `);

    try {
        program.parse(process.argv);
        const options = program.opts();
        const args = program.args;

        // Set environment variables based on CLI options
        if (options.noComments || options.dryRun) {
            process.env.POST_COMMENTS = 'false';
        }

        return {
            org: args[0],
            repo: args[1],
            pr: args[2],
            outputFile: options.output,
            dryRun: options.dryRun,
            maxRetries: parseInt(options.maxRetries)
        };
    } catch (error) {
        logger.error('Invalid command line arguments', { error: error.message });
        process.exit(1);
    }
}

// Get diff from GitHub API using Octokit
async function getPullRequestDiff(org, repo, prNumber) {
    logger.info('Getting PR diff from GitHub API', { org, repo, prNumber });
    
    return withRetry(async () => {
        const octokit = createOctokit();
        
        const response = await octokit.rest.pulls.get({
            owner: org,
            repo: repo,
            pull_number: parseInt(prNumber),
            mediaType: {
                format: 'diff'
            }
        });
        
        // Check rate limits
        await rateLimiter.checkAndWait(response);
        
        const diff = response.data;
        
        if (!diff || !diff.trim()) {
            throw new Error('No differences found in pull request');
        }
        
        logger.success('Successfully retrieved PR diff', { 
            size: diff.length,
            org, 
            repo, 
            prNumber 
        });
        
        return diff;
        
    }).catch(error => {
        if (error.status === 404) {
            throw new Error(`PR #${prNumber} not found in ${org}/${repo}`);
        } else if (error.status === 403) {
            throw new Error('GitHub API access denied. Check your authentication permissions.');
        } else if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Check your credentials.');
        } else {
            throw new Error(`Failed to get PR diff: ${error.message}`);
        }
    });
}

// Post review comments back to GitHub PR
async function postReviewToGitHub(org, repo, prNumber, review) {
    const shouldPost = process.env.POST_COMMENTS !== 'false';
    if (!shouldPost) {
        logger.info('Skipping GitHub comment posting (POST_COMMENTS=false)');
        return;
    }

    logger.info('Posting review comments to GitHub PR', { 
        org, 
        repo, 
        prNumber,
        summaryLength: review.summary?.length || 0,
        commentCount: review.comments?.length || 0
    });
    
    try {
        const octokit = createOctokit();

        // Post summary as a general PR comment
        if (review.summary && review.summary.trim()) {
            const summaryComment = `## Review Summary

${review.summary}

---
*Generated by CodeWhisperer*`;

            await withRetry(() => octokit.rest.issues.createComment({
                owner: org,
                repo: repo,
                issue_number: parseInt(prNumber),
                body: summaryComment
            }));
            
            logger.success('Posted summary comment to PR');
        }

        // Post line-specific comments if available
        if (review.comments && review.comments.length > 0) {
            let postedCount = 0;
            
            // Get PR details to get the head commit SHA (required for Enterprise GitHub)
            const prDetails = await withRetry(() => octokit.rest.pulls.get({
                owner: org,
                repo: repo,
                pull_number: parseInt(prNumber)
            }));
            const commitId = prDetails.data.head.sha;
            
            for (const comment of review.comments) {
                // Extract properties outside try block for error handling
                const filePath = comment.file || comment.filename;
                const commentBody = comment.message || comment.body;
                
                try {
                    // Only post if we have file path and line number
                    if (filePath && comment.line && commentBody) {
                        await withRetry(() => octokit.rest.pulls.createReviewComment({
                            owner: org,
                            repo: repo,
                            pull_number: parseInt(prNumber),
                            body: commentBody,
                            path: filePath,
                            commit_id: commitId,
                            line: comment.line,
                            side: 'RIGHT'
                        }));
                        postedCount++;
                    }
                } catch (error) {
                    logger.warn(`Could not post comment for ${filePath || 'unknown'}:${comment.line}`, { error: error.message });
                }
            }
            
            if (postedCount > 0) {
                logger.success(`Posted ${postedCount} line-specific comments`);
            } else {
                logger.info('No line-specific comments could be posted');
            }
        }

        logger.success('Successfully posted review to GitHub PR!');
        
    } catch (error) {
        logger.error('Failed to post comments to GitHub', { error: error.message });
        // Don't fail the entire review if posting comments fails
    }
}

// Main function
async function main() {
    // Parse arguments first (outside try-catch for error handling)
    const params = parseArgs();
    
    try {
        logger.info('Starting AI Code Review', { 
            org: params.org, 
            repo: params.repo, 
            prNumber: params.pr,
            outputFile: params.outputFile
        });
        
        // Validate inputs and environment
        validateInputs(params.org, params.repo, params.pr);
        validateEnvironment();
        
        // Get diff from GitHub API
        const diff = await getPullRequestDiff(params.org, params.repo, params.pr);
        
        // Initialize reviewer
        const reviewer = new CodeReviewer();
        
        // Perform review with new API
        logger.info('Analyzing code with AI', { diffSize: diff.length });
        const review = await reviewer.reviewChanges(diff, {
            generateSummary: true
        });
        
        logger.info('AI analysis completed', {
            summaryGenerated: !!review.summary,
            commentCount: review.comments?.length || 0,
            hunkCount: review.hunks?.length || 0
        });
        
        // Post review comments back to GitHub PR
        await postReviewToGitHub(params.org, params.repo, params.pr, review);
        
        // Write results
        const result = {
            success: true,
            repository: `${params.org}/${params.repo}`,
            pullRequest: params.pr,
            timestamp: new Date().toISOString(),
            summary: review.summary,
            comments: review.comments,
            hunks: review.hunks,
            metadata: review.metadata
        };
        
        fs.writeFileSync(params.outputFile, JSON.stringify(result, null, 2));
        
        logger.success(`Review completed! Results saved to ${params.outputFile}`);
        
    } catch (error) {
        logger.error(`Review failed: ${error.message}`);
        
        // Write error result
        const errorResult = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(params.outputFile, JSON.stringify(errorResult, null, 2));
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { 
    main, 
    validateInputs,
    createOctokit,
    getPullRequestDiff,
    postReviewToGitHub
};