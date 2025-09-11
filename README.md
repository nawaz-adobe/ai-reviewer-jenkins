# AI Code Reviewer - Jenkins Integration

> **Automate intelligent code reviews in your Jenkins CI/CD pipeline using OpenAI**

## ✨ Features

- 🤖 **AI-Powered Reviews** - OpenAI analyzes your code changes
- 💬 **GitHub Integration** - Posts comments directly to PRs  
- 🔒 **Security Focused** - Input validation and safe API calls  
- ⚡ **Ultra Fast** - Uses GitHub API directly, no repository cloning
- 🔧 **Easy Integration** - Just 3 arguments: org, repo, PR number

## 🚀 Quick Start

### Prerequisites
- Node.js 18+, npm, Git

### Build & Deploy
```bash
npm install
npm run build                    # Generates dist/ai-review-job/
```

### Usage

#### Direct Usage:
```bash
./ai-review myorg myrepo 123
```

#### Jenkins Pipeline
```groovy
pipeline {
    agent any
    environment {
        LLM_API_KEY = credentials('llm-api-key')
        LLM_ENDPOINT = credentials('llm-endpoint')
        GITHUB_APP_ID = credentials('github-app-id')
        GITHUB_APP_PRIVATE_KEY = credentials('github-app-private-key')
        GITHUB_INSTALLATION_ID = credentials('github-app-installation-id')
        GITHUB_BASE_URL = credentials('github-base-url')
        POST_COMMENTS = 'true'
    }
    stages {
        stage('AI Code Review') {
            steps {
                sh '''
                    /path/to/ai-review-job/ai-review \
                        "${ORG_NAME}" "${REPO_NAME}" "${PR_NUMBER}"
                '''
                archiveArtifacts artifacts: 'review-results.json'
            }
        }
    }
}
```

## 💬 GitHub Integration

Posts AI review feedback as PR comments and summary. Set `POST_COMMENTS=false` to only generate JSON output.

## 🔐 Authentication Setup

### GitHub App (Required)
1. Create GitHub App in your organization settings
2. **Permissions:** Pull requests (Read & Write), Issues (Write), Contents (Read)
3. Install on target repositories
4. Configure Jenkins credentials:
   - `github-app-id` - Your GitHub App ID
   - `github-app-private-key` - Private key (PEM format)
   - `github-app-installation-id` - Installation ID
   - `github-base-url` - API endpoint (enterprise GitHub)

### OpenAI Setup
- `llm-api-key` - Your OpenAI API key
- `llm-endpoint` - `https://api.openai.com/v1/chat/completions`

> **📖 Detailed Setup:** See [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md)

## 🔧 Node.js Setup

Install Node.js 18+ on Jenkins nodes:

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL/CentOS  
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

## 🧪 Testing

```bash
npm test                        # Run all tests
npm run test:unit              # Unit tests only (no credentials needed)
npm run test:integration       # Integration tests (requires credentials)
```

### Test Environment Variables
```bash
# Required for integration tests
export GITHUB_APP_ID="123456"
export GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
export GITHUB_INSTALLATION_ID="12345678"
export LLM_API_KEY="sk-your_key"
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
export GITHUB_BASE_URL="https://git.corp.adobe.com/api/v3"

# Optional: Test specific repo (defaults to nawaz/ai-reviewer-mock PR #1)
export TEST_GITHUB_ORG="your-org"
export TEST_GITHUB_REPO="your-repo"
export TEST_GITHUB_PR="1"
```

## 🏗️ Development

```bash
npm install                     # Setup
npm test                        # Run tests
npm run build                   # Build Jenkins job package
```

## 📄 License

Apache-2.0