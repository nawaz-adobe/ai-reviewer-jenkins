# 🤫 CodeWhisperer GitHub App Setup Guide

## Step 1: Access GitHub App Creation Page

1. **Navigate to your organization's settings:**
   ```
   https://git.corp.adobe.com/organizations/YOUR_ORG_NAME/settings/apps
   ```
   Replace `YOUR_ORG_NAME` with your actual Adobe organization name.

2. **Click the "New GitHub App" button** (green button in top right)

## Step 2: Fill in Basic Information

**GitHub App name:** `CodeWhisperer`

**Description:**
```
Your friendly AI code reviewer that whispers sweet suggestions 🤫

Automatically analyzes pull requests for security vulnerabilities, code quality issues, and provides intelligent feedback using advanced AI models. Integrates seamlessly with Jenkins CI/CD pipelines.
```

**Homepage URL:**
```
https://git.corp.adobe.com/your-org/ai-reviewer-jenkins
```
*(Replace with your actual repository URL)*

**User authorization callback URL:** *(Leave blank)*

**Setup URL:** *(Leave blank)*

**Webhook URL:** *(Leave blank)*

**Webhook secret:** *(Leave blank)*

## Step 3: Configure Permissions

### Repository Permissions (Required):

- **Contents:** `Read`
  - *Needed to read PR diffs and file contents*

- **Issues:** `Write` 
  - *Needed to post summary comments on PRs*

- **Pull requests:** `Read & Write`
  - *Needed to read PR details and post line-specific comments*

- **Metadata:** `Read`
  - *Basic repository information access*

### Organization Permissions:
- **Leave all as "No access"**

### User Permissions:
- **Leave all as "No access"**

## Step 4: Webhook Configuration

- **✅ UNCHECK "Active"** under "Webhook"
  - *We don't need webhooks since we're using Jenkins polling*

- **SSL verification:** Leave as default

## Step 5: Create the App

1. **Click "Create GitHub App"** at the bottom
2. **You'll be redirected to your new app's settings page**

## Step 6: Generate Private Key

1. **On your app's settings page, scroll down to "Private keys"**
2. **Click "Generate a private key"**
3. **Download the `.pem` file** - save it securely!
4. **Note your App ID** (shown at the top of the page)

## Step 7: Install the App

1. **Click "Install App" in the left sidebar**
2. **Choose your organization**
3. **Select repository access:**
   - **Recommended:** "Selected repositories"
   - **Add repositories:**
     - `ai-reviewer-mock` (for testing)
     - Any other repositories where you want code reviews
4. **Click "Install"**

## Step 8: Get Installation ID

After installation, you'll be redirected to a URL like:
```
https://git.corp.adobe.com/settings/installations/12345678
```

The number `12345678` is your **Installation ID** - save this!

## Step 9: Configure Environment Variables

Create or update your `.env` file:

```bash
# CodeWhisperer GitHub App Authentication
GITHUB_APP_ID=123456                    # From step 6
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...                    # Contents of downloaded .pem file
-----END RSA PRIVATE KEY-----"
GITHUB_INSTALLATION_ID=12345678         # From step 8

# GitHub Configuration
GITHUB_BASE_URL=https://git.corp.adobe.com/api/v3

# OpenAI Configuration
LLM_API_KEY=your_openai_api_key
LLM_ENDPOINT=your_azure_openai_endpoint
```

## Step 10: Test Your Setup

```bash
# Test authentication
./dist/ai-review-job/ai-review --help

# Test full review
./dist/ai-review-job/ai-review nawaz ai-reviewer-mock 1
```

## 🔍 Common Issues & Solutions

### Issue: "App not found" error
- **Solution:** Check that the App ID is correct
- **Check:** Verify the app exists in your organization

### Issue: "Bad credentials" error  
- **Solution:** Verify the private key format includes the full PEM headers
- **Check:** Ensure no extra spaces or characters in the private key

### Issue: "Installation not found" error
- **Solution:** Verify the Installation ID is correct
- **Check:** Ensure the app is installed on the target repository

### Issue: Permission denied errors
- **Solution:** Check repository permissions in the app settings
- **Add:** Ensure "Pull requests: Read & Write" and "Issues: Write" are set

## 🎉 Success!

Once configured, CodeWhisperer will:
- 🤫 **Whisper intelligent suggestions** on your PRs
- 🔍 **Find security vulnerabilities** 
- ✨ **Suggest code improvements**
- 🤖 **Post comments with AI insights**

Your comments will appear as:
```markdown
🤫 **CodeWhisperer:** Consider using const instead of var for better scoping
```

Happy code reviewing! 🚀


