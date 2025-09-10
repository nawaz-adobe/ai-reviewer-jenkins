// Mock implementation of ai-reviewer-core for unit tests

const mockCodeReviewer = {
    reviewChanges: jest.fn().mockResolvedValue({
        summary: 'Mock AI review summary: This code looks good with minor suggestions.',
        comments: [
            {
                file: 'test.js',
                line: 5,
                message: 'Consider adding error handling here.',
                severity: 'warning'
            },
            {
                file: 'test.js', 
                line: 10,
                message: 'Good use of const for immutable values.',
                severity: 'info'
            }
        ],
        hunks: [
            {
                filename: 'test.js',
                changes: [
                    { type: 'add', line: '+  console.log("test");' }
                ]
            }
        ],
        metadata: {
            totalHunks: 1,
            totalComments: 2,
            processingTime: '1.2s',
            llmModel: 'gpt-3.5-turbo'
        }
    }),
    
    reviewHunk: jest.fn().mockResolvedValue({
        comments: [],
        score: 0.8
    }),
    
    generateSummary: jest.fn().mockResolvedValue('Mock summary'),
    
    filterComments: jest.fn().mockImplementation((comments) => comments),
    
    formatResults: jest.fn().mockImplementation((results, format) => {
        if (format === 'json') {
            return JSON.stringify(results, null, 2);
        }
        return results.summary || 'Mock formatted results';
    })
};

const CodeReviewer = jest.fn().mockImplementation(() => mockCodeReviewer);

module.exports = { CodeReviewer };
