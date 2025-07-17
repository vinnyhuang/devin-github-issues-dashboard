# Testing the Devin GitHub Issues Dashboard

This guide explains how to test the application with mock Devin API functionality while waiting for your actual API key.

## 🎭 Mock Mode Setup

The application is configured to use mock Devin responses by default in development mode.

### Environment Configuration

Your `.env` file should have:
```env
# Devin API (Mock Mode)
DEVIN_API_KEY="mock-key-for-development"
USE_MOCK_DEVIN="true"

# GitHub API (Required - get from GitHub Settings > Developer settings > Personal access tokens)
GITHUB_TOKEN="your-actual-github-token"

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/devin-github-issues-dashboard"
```

## 🚀 Running the Application

1. **Start the database** (if using PostgreSQL):
   ```bash
   # Make sure PostgreSQL is running
   # Or use the included script:
   ./start-database.sh
   ```

2. **Set up the database schema**:
   ```bash
   pnpm db:push
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

4. **Open your browser** to `http://localhost:3000`

## 🧪 Testing the Mock Workflow

### 1. Connect to a Repository

**Option A: Use the Demo Button**
- Click the "Demo" button to automatically connect to Facebook's React repository
- This provides a good set of real GitHub issues to test with

**Option B: Manual Repository Connection**
- Enter any public GitHub repository URL (e.g., `https://github.com/vinnyhuang-devin-test/typio-kart`)
- Click "Connect"

### 2. Test Issue Analysis

1. **Select an Issue**: Click on any issue from the list to expand its details
2. **Start Analysis**: Click the "Analyze" button
3. **Monitor Progress**: Watch the SessionProgress component show real-time updates
4. **View Results**: After 5-15 seconds, see the mock analysis results with:
   - Issue type classification (bug/feature/documentation/enhancement/question)
   - Complexity rating (low/medium/high)
   - Confidence score (0-100)
   - Time estimate
   - Resolution strategy

### 3. Mock Analysis Behavior

The mock client provides realistic responses by:

- **Analyzing issue content** to determine type (looks for keywords like "bug", "feature", "add", etc.)
- **Varying processing times** (5-15 seconds for analysis, 20-60 seconds for resolution)
- **Realistic confidence scores** based on issue complexity
- **Contextual strategies** tailored to the issue type
- **Random variations** to simulate real-world unpredictability

### 4. Test Different Issue Types

Try analyzing different types of issues to see varied responses:

- **Bug Reports**: Look for issues with "bug", "error", "broken" in the title
- **Feature Requests**: Issues with "feature", "add", "implement"  
- **Documentation**: Issues mentioning "docs", "readme", "documentation"
- **Questions**: Issues asking "how to" or "why"

## 🎯 Expected Mock Behaviors

### Analysis Results
- **High Confidence (80-95%)**: Documentation and simple bug fixes
- **Medium Confidence (60-80%)**: Feature requests and enhancements  
- **Low Confidence (25-60%)**: Complex features or unclear requirements

### Processing Times
- **Analysis**: 5-15 seconds (simulated)
- **Resolution**: 20-60 seconds (simulated)
- **API Delays**: 0.2-1 second per request (realistic)

### Error Scenarios
- The mock client occasionally simulates blocked/failed sessions for testing error handling
- Network-style delays and timeouts can be tested

## 🔄 Switching to Real Devin API

When your Devin API key is ready:

1. Update your `.env` file:
   ```env
   DEVIN_API_KEY="your-actual-devin-api-key"
   USE_MOCK_DEVIN="false"  # or remove this line
   ```

2. Restart the development server
3. The application will automatically use the real Devin API

## 🐛 Troubleshooting

### Common Issues

**"Session not found" errors**
- This is normal in mock mode - sessions are stored in memory and reset on server restart
- Refresh the page to clear stale session references

**GitHub API rate limiting**
- Use a GitHub Personal Access Token with appropriate permissions
- The free tier allows 5,000 requests per hour

**Database connection errors**
- Ensure PostgreSQL is running
- Check your DATABASE_URL is correct
- Run `pnpm db:push` to create/update the schema

### Mock Mode Indicators

Look for these signs that mock mode is active:
- 🎭 "Demo Mode Active" banner at the top
- Console message: "🎭 Using mock Devin client for development"
- "Demo" button appears next to the Connect button
- Analysis completes in 5-15 seconds consistently

## 📊 Demo Script

For presentations, follow this demo flow:

1. **Show the dashboard** with mock mode banner
2. **Click "Demo"** to connect to React repository
3. **Select a bug issue** from the list
4. **Click "Analyze"** and show real-time progress
5. **Explain the results** - confidence score, complexity, strategy
6. **Show different issue types** to demonstrate varied responses
7. **Highlight the session tracking** and polling behavior

This provides a complete demonstration of the Devin integration workflow without requiring actual API access.