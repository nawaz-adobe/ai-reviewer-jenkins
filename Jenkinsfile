pipeline {
    agent any
    
    environment {
        // AI Reviewer Configuration
        LLM_API_KEY = credentials('llm-api-key')
        LLM_ENDPOINT = credentials('llm-endpoint')
        POST_COMMENTS = 'true'
        
        // GitHub App Authentication
        GITHUB_APP_ID = credentials('github-app-id')
        GITHUB_APP_PRIVATE_KEY = credentials('github-app-private-key')
        GITHUB_INSTALLATION_ID = credentials('github-app-installation-id')
    }
    
    parameters {
        string(
            name: 'ORG_NAME',
            defaultValue: '',
            description: 'GitHub organization/owner name'
        )
        string(
            name: 'REPO_NAME', 
            defaultValue: '',
            description: 'Repository name'
        )
        string(
            name: 'PR_NUMBER',
            defaultValue: '',
            description: 'Pull request number to review'
        )
        booleanParam(
            name: 'DRY_RUN',
            defaultValue: false,
            description: 'Perform review without posting to GitHub (dry run)'
        )
        booleanParam(
            name: 'SKIP_COMMENTS',
            defaultValue: false,
            description: 'Skip posting comments to PR (generate review only)'
        )
        string(
            name: 'CUSTOM_OUTPUT_FILE',
            defaultValue: '',
            description: 'Custom output file name (optional)'
        )
    }
    
    stages {
        stage('Setup Environment') {
            steps {
                script {
                    // Set GitHub base URL with default value
                    env.GITHUB_BASE_URL = env.GITHUB_BASE_URL ?: 'https://git.corp.adobe.com/api/v3'
                    echo "GitHub Base URL: ${env.GITHUB_BASE_URL}"
                }
            }
        }
        
        stage('Validate Parameters') {
            steps {
                script {
                    if (!params.ORG_NAME || !params.REPO_NAME || !params.PR_NUMBER) {
                        error('Missing required parameters: ORG_NAME, REPO_NAME, and PR_NUMBER must be provided')
                    }
                    
                    // Validate PR number is numeric
                    if (!params.PR_NUMBER.isNumber()) {
                        error('PR_NUMBER must be a valid number')
                    }
                }
                echo "Parameters validated successfully"
                echo "Organization: ${params.ORG_NAME}"
                echo "Repository: ${params.REPO_NAME}"
                echo "PR Number: ${params.PR_NUMBER}"
                echo "Dry Run: ${params.DRY_RUN}"
                echo "Skip Comments: ${params.SKIP_COMMENTS}"
            }
        }
        
        stage('Check AI Reviewer Installation') {
            steps {
                script {
                    def aiReviewerPath = '/opt/ai-reviewer/ai-review-job'
                    def aiReviewerExists = fileExists("${aiReviewerPath}/ai-review")
                    if (!aiReviewerExists) {
                        error("AI Reviewer not found at ${aiReviewerPath}/ai-review. Please ensure it's installed.")
                    }
                    
                    // Check if executable
                    sh "test -x ${aiReviewerPath}/ai-review"
                    echo "AI Reviewer found and executable"
                }
            }
        }
        
        stage('AI Code Review') {
            steps {
                script {
                    def aiReviewerPath = '/opt/ai-reviewer/ai-review-job'
                    def outputFile = params.CUSTOM_OUTPUT_FILE ?: 'review-results.json'
                    def dryRunFlag = params.DRY_RUN ? '--dry-run' : ''
                    def noCommentsFlag = params.SKIP_COMMENTS ? '--no-comments' : ''
                    
                    echo "Starting AI Code Review..."
                    echo "Target: ${params.ORG_NAME}/${params.REPO_NAME} PR #${params.PR_NUMBER}"
                    echo "Output: ${outputFile}"
                    
                    try {
                        sh """
                            ${aiReviewerPath}/ai-review \\
                                "${params.ORG_NAME}" \\
                                "${params.REPO_NAME}" \\
                                "${params.PR_NUMBER}" \\
                                --output "${outputFile}" \\
                                ${dryRunFlag} \\
                                ${noCommentsFlag}
                        """
                        
                        echo "AI Code Review completed successfully"
                        
                    } catch (Exception e) {
                        echo "❌ AI Code Review failed: ${e.getMessage()}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Process Review Results') {
            steps {
                script {
                    def outputFile = params.CUSTOM_OUTPUT_FILE ?: 'review-results.json'
                    
                    if (fileExists(outputFile)) {
                        echo "📊 Processing review results..."
                        
                        // Parse and display summary
                        def reviewData = readJSON file: outputFile
                        
                        if (reviewData.success) {
                            echo "✅ Review Status: SUCCESS"
                            echo "Summary: ${reviewData.summary ?: 'No summary available'}"
                            echo "Comments: ${reviewData.comments?.size() ?: 0}"
                            echo "Hunks: ${reviewData.hunks?.size() ?: 0}"
                            echo "Timestamp: ${reviewData.timestamp}"
                        } else {
                            echo "❌ Review Status: FAILED"
                            echo "Error: ${reviewData.error}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    } else {
                        echo "⚠️ Review results file not found: ${outputFile}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Archive Results') {
            steps {
                script {
                    def outputFile = params.CUSTOM_OUTPUT_FILE ?: 'review-results.json'
                    
                    if (fileExists(outputFile)) {
                        archiveArtifacts artifacts: outputFile, allowEmptyArchive: true
                        echo "Review results archived: ${outputFile}"
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo "AI Code Review pipeline completed"
        }
        
        success {
            echo "✅ Pipeline completed successfully"
        }
        
        unstable {
            echo "⚠️ Pipeline completed with warnings"
        }
        
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
