#!/bin/bash

# iOS Certificate Manager with Fastlane Match
# Automated certificate lifecycle management with self-healing capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MATCH_REPO="${MATCH_GIT_URL:-https://github.com/ccbuildalot23/serenity-ios-certificates}"
BUNDLE_ID="com.serenity.recovery"
TEAM_ID="${APPLE_TEAM_ID:-XDY458RQ59}"

echo -e "${CYAN}🔐 iOS Certificate Manager with Self-Healing${NC}"
echo -e "${CYAN}===========================================${NC}\n"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    # Check for Ruby
    if ! command -v ruby &> /dev/null; then
        echo -e "${RED}❌ Ruby not installed${NC}"
        exit 1
    fi
    
    # Check for Fastlane
    if ! command -v fastlane &> /dev/null; then
        echo -e "${YELLOW}⚠️  Fastlane not installed. Installing...${NC}"
        gem install fastlane
    fi
    
    # Check for Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}\n"
}

# Function to initialize Fastlane Match
init_match() {
    echo -e "${BLUE}🚀 Initializing Fastlane Match...${NC}"
    
    cd ios
    
    # Create Matchfile if it doesn't exist
    if [ ! -f "fastlane/Matchfile" ]; then
        cat > fastlane/Matchfile <<EOF
git_url("$MATCH_REPO")
storage_mode("git")
type("appstore")
app_identifier("$BUNDLE_ID")
username(ENV["APPLE_ID"] || "support@serenityrecovery.com")
team_id("$TEAM_ID")
git_branch("main")
clone_branch_directly(true)
verbose(true)
EOF
        echo -e "${GREEN}✅ Matchfile created${NC}"
    fi
    
    # Initialize Match
    echo -e "${BLUE}Initializing Match repository...${NC}"
    fastlane match init --git_url "$MATCH_REPO" 2>/dev/null || true
    
    cd ..
}

# Function to generate new certificates
generate_certificates() {
    echo -e "${BLUE}🔑 Generating new certificates...${NC}"
    
    cd ios
    
    # Nuke existing certificates (optional - use with caution)
    if [ "$1" == "--force" ]; then
        echo -e "${YELLOW}⚠️  Force regeneration requested. Nuking existing certificates...${NC}"
        fastlane match nuke distribution --skip_confirmation || true
    fi
    
    # Generate development certificate
    echo -e "${BLUE}Generating development certificate...${NC}"
    fastlane match development --readonly false || {
        echo -e "${YELLOW}⚠️  Development certificate generation failed${NC}"
    }
    
    # Generate distribution certificate
    echo -e "${BLUE}Generating distribution certificate...${NC}"
    fastlane match appstore --readonly false || {
        echo -e "${RED}❌ Distribution certificate generation failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Certificates generated successfully${NC}"
    
    cd ..
}

# Function to sync certificates
sync_certificates() {
    echo -e "${BLUE}🔄 Syncing certificates...${NC}"
    
    cd ios
    
    # Sync in readonly mode for CI/CD
    fastlane match appstore --readonly || {
        echo -e "${RED}❌ Certificate sync failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Certificates synced successfully${NC}"
    
    cd ..
}

# Function to validate certificates
validate_certificates() {
    echo -e "${BLUE}🔍 Validating certificates...${NC}"
    
    # Check keychain for certificates
    if [ "$(uname)" == "Darwin" ]; then
        CERT_COUNT=$(security find-identity -p codesigning | grep -c "valid identities found" || echo "0")
        if [ "$CERT_COUNT" != "0" ]; then
            echo -e "${GREEN}✅ Valid code signing identities found${NC}"
            security find-identity -p codesigning | grep "iPhone Distribution"
        else
            echo -e "${RED}❌ No valid code signing identities${NC}"
            return 1
        fi
    fi
    
    # Check provisioning profiles
    if [ -d ~/Library/MobileDevice/Provisioning\ Profiles ]; then
        PROFILE_COUNT=$(ls ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision 2>/dev/null | wc -l)
        echo -e "${GREEN}✅ Found $PROFILE_COUNT provisioning profile(s)${NC}"
    else
        echo -e "${YELLOW}⚠️  No provisioning profiles directory${NC}"
    fi
}

# Function to export certificates for CI/CD
export_certificates() {
    echo -e "${BLUE}📤 Exporting certificates for CI/CD...${NC}"
    
    cd ios
    
    # Create export directory
    mkdir -p ../ios-certificates
    
    # Export certificates using Match
    echo -e "${BLUE}Exporting certificates and profiles...${NC}"
    
    # Get certificate and profile paths from Match
    CERT_PATH=$(fastlane match appstore --readonly --verbose 2>&1 | grep -o '/.*\.p12' | head -1)
    PROFILE_PATH=$(fastlane match appstore --readonly --verbose 2>&1 | grep -o '/.*\.mobileprovision' | head -1)
    
    if [ -n "$CERT_PATH" ] && [ -f "$CERT_PATH" ]; then
        cp "$CERT_PATH" ../ios-certificates/ios_distribution.p12
        echo -e "${GREEN}✅ Certificate exported${NC}"
    fi
    
    if [ -n "$PROFILE_PATH" ] && [ -f "$PROFILE_PATH" ]; then
        cp "$PROFILE_PATH" ../ios-certificates/Serenity_App_Store_Profile.mobileprovision
        echo -e "${GREEN}✅ Provisioning profile exported${NC}"
    fi
    
    cd ..
    
    # Encode for GitHub Secrets
    echo -e "${BLUE}Encoding for GitHub Secrets...${NC}"
    if [ -f "ios-certificates/ios_distribution.p12" ]; then
        base64 ios-certificates/ios_distribution.p12 > ios-certificates/BUILD_CERTIFICATE_BASE64.txt
        echo -e "${GREEN}✅ Certificate encoded${NC}"
    fi
    
    if [ -f "ios-certificates/Serenity_App_Store_Profile.mobileprovision" ]; then
        base64 ios-certificates/Serenity_App_Store_Profile.mobileprovision > ios-certificates/BUILD_PROVISION_PROFILE_BASE64.txt
        echo -e "${GREEN}✅ Profile encoded${NC}"
    fi
}

# Function to setup GitHub Secrets
setup_github_secrets() {
    echo -e "${BLUE}🔧 Setting up GitHub Secrets...${NC}"
    
    if ! command -v gh &> /dev/null; then
        echo -e "${YELLOW}⚠️  GitHub CLI not installed. Install with: brew install gh${NC}"
        return
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}⚠️  Not authenticated with GitHub. Run: gh auth login${NC}"
        return
    fi
    
    echo -e "${BLUE}Setting GitHub Secrets...${NC}"
    
    # Set certificate
    if [ -f "ios-certificates/BUILD_CERTIFICATE_BASE64.txt" ]; then
        gh secret set BUILD_CERTIFICATE_BASE64 < ios-certificates/BUILD_CERTIFICATE_BASE64.txt
        echo -e "${GREEN}✅ Certificate secret set${NC}"
    fi
    
    # Set provisioning profile
    if [ -f "ios-certificates/BUILD_PROVISION_PROFILE_BASE64.txt" ]; then
        gh secret set BUILD_PROVISION_PROFILE_BASE64 < ios-certificates/BUILD_PROVISION_PROFILE_BASE64.txt
        echo -e "${GREEN}✅ Profile secret set${NC}"
    fi
    
    # Prompt for passwords
    echo -e "${YELLOW}Enter P12 password (or press Enter to skip):${NC}"
    read -s P12_PASSWORD
    if [ -n "$P12_PASSWORD" ]; then
        echo "$P12_PASSWORD" | gh secret set P12_PASSWORD
        echo -e "${GREEN}✅ P12 password set${NC}"
    fi
}

# Function to monitor certificate expiry
monitor_certificates() {
    echo -e "${BLUE}📊 Monitoring certificate expiry...${NC}"
    
    if [ "$(uname)" == "Darwin" ]; then
        echo -e "${BLUE}Certificate expiry dates:${NC}"
        security find-identity -p codesigning -v | while read -r line; do
            if [[ $line == *"iPhone Distribution"* ]]; then
                CERT_HASH=$(echo "$line" | awk '{print $2}')
                security find-certificate -c "iPhone Distribution" -p | openssl x509 -noout -dates 2>/dev/null || true
            fi
        done
    fi
    
    echo -e "${YELLOW}⚠️  Set up automated monitoring to check certificate expiry${NC}"
    echo -e "${YELLOW}   Recommended: Check weekly and alert 30 days before expiry${NC}"
}

# Self-healing function
self_heal() {
    echo -e "${CYAN}🔧 Running self-healing diagnostics...${NC}"
    
    # Check and fix common issues
    echo -e "${BLUE}Checking for common issues...${NC}"
    
    # Issue 1: Missing certificates
    if ! validate_certificates; then
        echo -e "${YELLOW}⚠️  Certificate issues detected. Attempting to sync...${NC}"
        sync_certificates || generate_certificates
    fi
    
    # Issue 2: Expired certificates
    # (Would check expiry dates and regenerate if needed)
    
    # Issue 3: GitHub Secrets out of sync
    echo -e "${BLUE}Checking GitHub Secrets...${NC}"
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        SECRET_COUNT=$(gh secret list | grep -c "BUILD_CERTIFICATE" || echo "0")
        if [ "$SECRET_COUNT" -lt "2" ]; then
            echo -e "${YELLOW}⚠️  GitHub Secrets missing. Setting up...${NC}"
            export_certificates
            setup_github_secrets
        fi
    fi
    
    echo -e "${GREEN}✅ Self-healing complete${NC}"
}

# Main menu
show_menu() {
    echo -e "${CYAN}Select an option:${NC}"
    echo "1) Initialize Fastlane Match"
    echo "2) Generate new certificates"
    echo "3) Sync existing certificates"
    echo "4) Validate certificates"
    echo "5) Export for CI/CD"
    echo "6) Setup GitHub Secrets"
    echo "7) Monitor certificate expiry"
    echo "8) Run self-healing"
    echo "9) Complete setup (all steps)"
    echo "0) Exit"
    
    read -p "Enter choice: " choice
    
    case $choice in
        1) init_match ;;
        2) generate_certificates ;;
        3) sync_certificates ;;
        4) validate_certificates ;;
        5) export_certificates ;;
        6) setup_github_secrets ;;
        7) monitor_certificates ;;
        8) self_heal ;;
        9)
            check_prerequisites
            init_match
            generate_certificates
            validate_certificates
            export_certificates
            setup_github_secrets
            monitor_certificates
            ;;
        0) exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    --init) init_match ;;
    --generate) generate_certificates "$2" ;;
    --sync) sync_certificates ;;
    --validate) validate_certificates ;;
    --export) export_certificates ;;
    --setup-github) setup_github_secrets ;;
    --monitor) monitor_certificates ;;
    --self-heal) self_heal ;;
    --auto)
        check_prerequisites
        self_heal
        ;;
    *)
        check_prerequisites
        show_menu
        ;;
esac

echo -e "\n${GREEN}✨ Certificate management complete!${NC}"