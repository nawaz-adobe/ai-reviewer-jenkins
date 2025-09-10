#!/usr/bin/env node

/**
 * Simple Jenkins AI Code Reviewer
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { CodeReviewer } = require('ai-reviewer-core');
const { validateGitUrl, validateBranchName } = require('./security');

// Simple argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length < 6 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: ai-review <org> <repo> <pr> <git-url> <base-branch> <head-branch> [output-file]

Arguments:
  org           Organization/owner name
  repo          Repository name  
  pr            Pull request number
  git-url       Git repository URL
  base-branch   Base branch
  head-branch   Head branch
  output-file   Output file (default: review-results.json)

Environment Variables:
  LLM_API_KEY   OpenAI API key
  LLM_ENDPOINT  OpenAI API endpoint
        `);
        process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
    }

    return {
        org: args[0],
        repo: args[1], 
        pr: args[2],
        gitUrl: args[3],
        baseBranch: args[4],
        headBranch: args[5],
        outputFile: args[6] || 'review-results.json'
    };
}

// Get diff from git
function getDiff(gitUrl, baseBranch, headBranch) {
    console.log('📥 Getting code diff...');
    
    // Validate inputs
    const cleanUrl = validateGitUrl(gitUrl);
    const cleanBase = validateBranchName(baseBranch);
    const cleanHead = validateBranchName(headBranch);
    
    // Create temp directory
    const tempDir = `/tmp/ai-review-${Date.now()}`;
    
    try {
        // Clone repository
        execSync(`git clone ${cleanUrl} ${tempDir}`, { stdio: 'pipe' });
        
        // Get diff
        const diffCmd = `cd ${tempDir} && git diff origin/${cleanBase}..origin/${cleanHead}`;
        const diff = execSync(diffCmd, { encoding: 'utf8' });
        
        // Cleanup
        execSync(`rm -rf ${tempDir}`);
        
        if (!diff.trim()) {
            throw new Error('No differences found between branches');
        }
        
        return diff;
        
    } catch (error) {
        // Cleanup on error
        execSync(`rm -rf ${tempDir}`, { stdio: 'ignore' });
        throw new Error(`Failed to get diff: ${error.message}`);
    }
}

// Main function
async function main() {
    try {
        console.log('🚀 Starting AI Code Review...');
        
        // Parse arguments
        const params = parseArgs();
        
        // Check environment variables
        const apiKey = process.env.LLM_API_KEY;
        const endpoint = process.env.LLM_ENDPOINT;
        
        if (!apiKey) {
            throw new Error('LLM_API_KEY environment variable is required');
        }
        
        if (!endpoint) {
            throw new Error('LLM_ENDPOINT environment variable is required');
        }
        
        // Get diff
        const diff = getDiff(params.gitUrl, params.baseBranch, params.headBranch);
        
        // Initialize reviewer
        const reviewer = new CodeReviewer();
        
        // Perform review
        console.log('🤖 Analyzing code with AI...');
        const review = await reviewer.reviewCode(diff, {
            apiKey,
            endpoint
        });
        
        // Write results
        const result = {
            success: true,
            repository: `${params.org}/${params.repo}`,
            pullRequest: params.pr,
            baseBranch: params.baseBranch,
            headBranch: params.headBranch,
            timestamp: new Date().toISOString(),
            review
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
        
        const outputFile = process.argv[8] || 'review-results.json';
        fs.writeFileSync(outputFile, JSON.stringify(errorResult, null, 2));
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };