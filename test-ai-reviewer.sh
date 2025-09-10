#!/bin/bash

# AI Reviewer Test Script
# Tests the AI reviewer against the comprehensive test case PR

echo "🧪 CodeWhisperer Test Script"
echo "============================"

# Check if CodeWhisperer GitHub App credentials are set
if [ -z "$GITHUB_APP_ID" ]; then
    echo "❌ Error: CodeWhisperer GitHub App authentication not configured"
    echo ""
    echo "CodeWhisperer GitHub App (required):"
    echo "  export GITHUB_APP_ID='123456'"
    echo "  export GITHUB_APP_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----...'"
    echo "  export GITHUB_INSTALLATION_ID='12345678'"
    echo ""
    echo "Setup guide: https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app"
    exit 1
fi

echo "🤖 Using GitHub App authentication"
if [ -z "$GITHUB_APP_PRIVATE_KEY" ] || [ -z "$GITHUB_INSTALLATION_ID" ]; then
    echo "❌ Error: GitHub App requires GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_INSTALLATION_ID"
    exit 1
fi

if [ -z "$LLM_API_KEY" ]; then
    echo "❌ Error: LLM_API_KEY not set"
    echo "Please run: export LLM_API_KEY='sk_your_openai_key'"
    exit 1
fi

if [ -z "$LLM_ENDPOINT" ]; then
    echo "❌ Error: LLM_ENDPOINT not set"
    echo "Please run: export LLM_ENDPOINT='https://api.openai.com/v1/chat/completions'"
    exit 1
fi

# Set defaults for Adobe corporate GitHub
export GITHUB_BASE_URL="${GITHUB_BASE_URL:-https://git.corp.adobe.com/api/v3}"

echo "✅ Credentials verified"
echo "📍 GitHub: $GITHUB_BASE_URL"
echo "📍 Repository: nawaz/ai-reviewer-mock"
echo "📍 PR: ${1:-1}"
echo ""

# Build the latest version
echo "🏗️ Building AI reviewer..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Test the AI reviewer
echo "🚀 Running AI code review..."
echo "📝 Output file: ai-review-results.json"
echo ""

./dist/ai-review-job/ai-review \
    nawaz \
    ai-reviewer-mock \
    ${1:-1} \
    ai-review-results.json

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AI review completed successfully!"
    echo "📄 Results saved to: ai-review-results.json"
    echo ""
    echo "🔍 Quick summary:"
    if [ -f "ai-review-results.json" ]; then
        echo "Repository: $(jq -r '.repository' ai-review-results.json 2>/dev/null || echo 'N/A')"
        echo "PR: $(jq -r '.pullRequest' ai-review-results.json 2>/dev/null || echo 'N/A')"
        echo "Success: $(jq -r '.success' ai-review-results.json 2>/dev/null || echo 'N/A')"
        echo ""
        echo "📋 Review summary:"
        jq -r '.summary // "Summary not available"' ai-review-results.json 2>/dev/null || echo "Summary not available"
    fi
else
    echo ""
    echo "❌ AI review failed"
    if [ -f "ai-review-results.json" ]; then
        echo "Error details:"
        jq -r '.error // "No error details available"' ai-review-results.json 2>/dev/null || cat ai-review-results.json
    fi
    exit 1
fi
