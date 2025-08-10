#!/bin/bash

# Password Reset E2E Testing Script
# This script runs comprehensive E2E tests for the password reset functionality

set -e

echo "🚀 Starting Password Reset E2E Testing Suite"
echo "=============================================="
echo ""

# Configuration
TEST_FILE="tests/e2e/password-reset-e2e-comprehensive.spec.ts"
REPORT_DIR="test-results/password-reset-e2e"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create report directory
mkdir -p "$REPORT_DIR"

echo "📋 Test Configuration:"
echo "  Test File: $TEST_FILE"
echo "  Report Directory: $REPORT_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright not found. Installing..."
    npm install -D @playwright/test
fi

# Install browsers if needed
echo "🔧 Ensuring Playwright browsers are installed..."
npx playwright install --with-deps chromium

echo ""
echo "🧪 Running Password Reset E2E Tests..."
echo "======================================"

# Run the comprehensive test suite
npx playwright test "$TEST_FILE" \
    --reporter=list \
    --reporter=json:"$REPORT_DIR/results_$TIMESTAMP.json" \
    --reporter=html:"$REPORT_DIR/html_$TIMESTAMP" \
    --project=chromium \
    --timeout=30000 \
    --retries=1

echo ""
echo "📊 Test Results Summary"
echo "======================="

# Parse and display results
if [ -f "$REPORT_DIR/results_$TIMESTAMP.json" ]; then
    echo "✅ Test execution completed"
    echo "📁 Results saved to: $REPORT_DIR/results_$TIMESTAMP.json"
    echo "🌐 HTML report: $REPORT_DIR/html_$TIMESTAMP/index.html"
    
    # Extract test statistics
    TOTAL_TESTS=$(jq '.stats.total' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "0")
    PASSED_TESTS=$(jq '.stats.passed' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "0")
    FAILED_TESTS=$(jq '.stats.failed' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "0")
    
    echo ""
    echo "📈 Test Statistics:"
    echo "  Total Tests: $TOTAL_TESTS"
    echo "  Passed: $PASSED_TESTS"
    echo "  Failed: $FAILED_TESTS"
    
    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo ""
        echo "❌ Failed Tests:"
        jq -r '.results[] | select(.status == "failed") | .spec.title' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "  Unable to parse failed tests"
    fi
    
    # Calculate success rate
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo ""
        echo "📊 Success Rate: $SUCCESS_RATE%"
        
        if [ "$SUCCESS_RATE" -ge 90 ]; then
            echo "🎉 Excellent! Password reset system is working well."
        elif [ "$SUCCESS_RATE" -ge 80 ]; then
            echo "✅ Good! Most tests are passing."
        elif [ "$SUCCESS_RATE" -ge 70 ]; then
            echo "⚠️  Fair. Some issues need attention."
        else
            echo "❌ Poor. Significant issues detected."
        fi
    fi
else
    echo "❌ Test execution failed or results file not found"
    exit 1
fi

echo ""
echo "🔍 Detailed Test Breakdown"
echo "=========================="

# Show detailed results for each test category
echo ""
echo "✅ Positive Scenarios:"
jq -r '.results[] | select(.spec.title | contains("Positive")) | "  " + .spec.title + ": " + .status' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "  Unable to parse positive scenarios"

echo ""
echo "❌ Negative Scenarios:"
jq -r '.results[] | select(.spec.title | contains("Negative")) | "  " + .spec.title + ": " + .status' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "  Unable to parse negative scenarios"

echo ""
echo "🔒 Security Scenarios:"
jq -r '.results[] | select(.spec.title | contains("Security")) | "  " + .spec.title + ": " + .status' "$REPORT_DIR/results_$TIMESTAMP.json" 2>/dev/null || echo "  Unable to parse security scenarios"

echo ""
echo "📝 Recommendations"
echo "=================="

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo "🎉 All tests passed! The password reset system is working correctly."
    echo "✅ Ready for production deployment."
else
    echo "⚠️  Some tests failed. Review the detailed results above."
    echo "🔧 Check the HTML report for detailed error information."
    echo "📧 Verify email configuration and Supabase settings."
fi

echo ""
echo "🔗 Useful Links:"
echo "  HTML Report: file://$(pwd)/$REPORT_DIR/html_$TIMESTAMP/index.html"
echo "  JSON Results: $REPORT_DIR/results_$TIMESTAMP.json"
echo "  Test File: $TEST_FILE"

echo ""
echo "🏁 Password Reset E2E Testing Complete!"
echo "======================================="
