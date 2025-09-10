#!/usr/bin/env node

/**
 * Simple Jenkins AI Code Reviewer
 */

require('dotenv').config();
const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const { CodeReviewer } = require('ai-reviewer-core');

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

// Simple argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: ai-review <org> <repo> <pr> [output-file]

Arguments:
  org           Organization/owner name
  repo          Repository name  
  pr            Pull request number
  output-file   Output file (default: review-results.json)

Environment Variables:
  LLM_API_KEY     OpenAI API key
  LLM_ENDPOINT    OpenAI API endpoint
  GITHUB_TOKEN    GitHub API token (required for enterprise)
  GITHUB_BASE_URL GitHub base URL (default: https://api.github.com)
        `);
        process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
    }

    return {
        org: args[0],
        repo: args[1], 
        pr: args[2],
        outputFile: args[3] || 'review-results.json'
    };
}

// Get diff from GitHub API using Octokit
async function getPullRequestDiff(org, repo, prNumber) {
    console.log('📥 Getting PR diff from GitHub API...');
    
    try {
        // Configure Octokit for GitHub Enterprise or public GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        const githubBaseUrl = process.env.GITHUB_BASE_URL || 'https://api.github.com';
        
        if (!githubToken) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
        
        const octokit = new Octokit({
            auth: githubToken,
            baseUrl: githubBaseUrl
        });
        
        console.log(`🔗 Using GitHub API: ${githubBaseUrl}`);
        
        // Get PR diff using Octokit
        const response = await octokit.rest.pulls.get({
            owner: org,
            repo: repo,
            pull_number: parseInt(prNumber),
            mediaType: {
                format: 'diff'
            }
        });
        
        const diff = response.data;
        
        if (!diff || !diff.trim()) {
            throw new Error('No differences found in pull request');
        }
        
        console.log('✅ Successfully retrieved PR diff');
        return diff;
        
    } catch (error) {
        if (error.status === 404) {
            throw new Error(`PR #${prNumber} not found in ${org}/${repo}`);
        } else if (error.status === 403) {
            throw new Error('GitHub API access denied. Check your GITHUB_TOKEN permissions.');
        } else if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Check your GITHUB_TOKEN.');
        } else {
            throw new Error(`Failed to get PR diff: ${error.message}`);
        }
    }
}

// Main function
async function main() {
    // Parse arguments first (outside try-catch for error handling)
    const params = parseArgs();
    
    try {
        console.log('🚀 Starting AI Code Review...');
        
        // Validate inputs
        validateInputs(params.org, params.repo, params.pr);
        
        // Check environment variables
        if (!process.env.LLM_API_KEY) {
            throw new Error('LLM_API_KEY environment variable is required');
        }
        
        if (!process.env.LLM_ENDPOINT) {
            throw new Error('LLM_ENDPOINT environment variable is required');
        }
        
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
        
        // Get diff from GitHub API
        const diff = await getPullRequestDiff(params.org, params.repo, params.pr);
        
        // Initialize reviewer
        const reviewer = new CodeReviewer();
        
        // Perform review with new API
        console.log('🤖 Analyzing code with AI...');
        const review = await reviewer.reviewChanges(diff, {
            generateSummary: true
        });
        
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
        
        console.log(`✅ Review completed! Results saved to ${params.outputFile}`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        
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

module.exports = { main };