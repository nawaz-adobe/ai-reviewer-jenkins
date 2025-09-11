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

### GitHub App Setup (Required)

#### 1. Create GitHub App
Navigate to your organization settings:
```
https://git.corp.adobe.com/organizations/YOUR_ORG/settings/apps
```

Click "New GitHub App" and configure:
- **Name:** `CodeWhisperer` (or any name you prefer)
- **Description:** AI code reviewer for automated PR analysis
- **Homepage URL:** Your repository URL
- **Webhook:** Uncheck "Active" (not needed for Jenkins polling)

#### 2. Set Permissions
**Repository Permissions:**
- **Contents:** Read (to access PR diffs)
- **Issues:** Write (to post PR comments)
- **Pull requests:** Read & Write (to read PRs and post comments)
- **Metadata:** Read (basic repository access)

**Organization/User Permissions:** Leave as "No access"

#### 3. Generate Private Key
1. After creating the app, go to "Private keys" section
2. Click "Generate a private key" 
3. Download the `.pem` file and save it securely
4. Note your **App ID** (displayed at top of app settings page)

#### 4. Install App
1. Click "Install App" in left sidebar
2. Choose your organization
3. Select "Selected repositories" and add:
   - Target repositories for code review
   - Test repository (e.g., `ai-reviewer-mock`)
4. Click "Install"

#### 5. Get Installation ID
After installation, you'll see a URL like:
```
https://git.corp.adobe.com/settings/installations/12345678
```
The number `12345678` is your **Installation ID**.

#### 6. Configure Jenkins Credentials
Add these credentials in Jenkins (Manage → Credentials):
- `github-app-id` - Your GitHub App ID
- `github-app-private-key` - Contents of the `.pem` file
- `github-app-installation-id` - Installation ID from step 5
- `github-base-url` - `https://git.corp.adobe.com/api/v3` (enterprise) or `https://api.github.com` (public)

### OpenAI Setup
- `llm-api-key` - Your OpenAI API key
- `llm-endpoint` - `https://api.openai.com/v1/chat/completions`

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