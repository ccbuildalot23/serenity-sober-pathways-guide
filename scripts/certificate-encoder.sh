#!/bin/bash

# iOS Certificate Encoding Script for GitHub Secrets (macOS/Linux)
# This script helps properly encode iOS certificates and provisioning profiles for GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Default values
CERTIFICATE_PATH=""
PROFILE_PATH=""
INTERACTIVE=false
VALIDATE=false

# Function to display usage
usage() {
    echo -e "${CYAN}================================================================================="
    echo -e "  Serenity iOS Certificate Encoder for GitHub Secrets"
    echo -e "  HIPAA-Compliant Healthcare App Deployment Tool"
    echo -e "=================================================================================${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ${WHITE}./certificate-encoder.sh -c /path/to/cert.p12 -p /path/to/profile.mobileprovision${NC}"
    echo -e "  ${WHITE}./certificate-encoder.sh -i${NC}  (interactive mode)"
    echo -e "  ${WHITE}./certificate-encoder.sh -h${NC}  (help)"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  ${WHITE}-c, --certificate${NC}     Path to iOS distribution certificate (.p12 file)"
    echo -e "  ${WHITE}-p, --profile${NC}         Path to provisioning profile (.mobileprovision file)"
    echo -e "  ${WHITE}-i, --interactive${NC}     Run in interactive mode"
    echo -e "  ${WHITE}-v, --validate${NC}        Validate certificate format"
    echo -e "  ${WHITE}-h, --help${NC}            Show this help message"
    echo ""
}

# Function to check if file exists
check_file() {
    local filepath="$1"
    local description="$2"
    
    if [[ ! -f "$filepath" ]]; then
        echo -e "${RED}❌ ERROR: $description not found at: $filepath${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Found $description at: $filepath${NC}"
    return 0
}

# Function to encode file to base64
encode_file() {
    local filepath="$1"
    local description="$2"
    
    echo -e "${YELLOW}🔧 Encoding $description...${NC}"
    
    if command -v base64 >/dev/null 2>&1; then
        # macOS/Linux base64
        local encoded
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            encoded=$(base64 -i "$filepath")
        else
            # Linux
            encoded=$(base64 -w 0 "$filepath")
        fi
        
        echo -e "${GREEN}✅ Successfully encoded $description${NC}"
        echo -e "${CYAN}📏 Length: ${#encoded} characters${NC}"
        echo "$encoded"
    else
        echo -e "${RED}❌ ERROR: base64 command not found${NC}"
        return 1
    fi
}

# Function to validate certificate
validate_certificate() {
    local base64_content="$1"
    
    echo -e "${YELLOW}🔍 Validating certificate format...${NC}"
    
    # Decode and check basic format
    if echo "$base64_content" | base64 -d >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Certificate base64 format is valid${NC}"
        
        # Additional validation with openssl if available
        if command -v openssl >/dev/null 2>&1; then
            if echo "$base64_content" | base64 -d | openssl pkcs12 -info -noout -passin pass:test 2>/dev/null; then
                echo -e "${GREEN}✅ Certificate appears to be valid PKCS#12 format${NC}"
            else
                echo -e "${YELLOW}⚠️  Note: Certificate validation requires correct password${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}❌ ERROR: Invalid base64 encoding${NC}"
        return 1
    fi
}

# Function to generate secure password
generate_password() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 12 | tr -d "=+/" | cut -c1-16
    else
        # Fallback to /dev/urandom
        LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16
    fi
}

# Function to display secrets configuration
show_secrets_config() {
    local cert_base64="$1"
    local cert_password="$2"
    local profile_base64="$3"
    local keychain_password="$4"
    
    echo ""
    echo -e "${CYAN}================================================================================="
    echo -e "  GitHub Secrets Configuration"
    echo -e "=================================================================================${NC}"
    echo ""
    echo -e "${YELLOW}Configure these secrets in your GitHub repository:${NC}"
    echo -e "${GRAY}Settings > Secrets and variables > Actions > New repository secret${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}IOS_CERTIFICATE${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}${cert_base64:0:50}...${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}IOS_CERTIFICATE_PASSWORD${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}$cert_password${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}IOS_PROVISION_PROFILE${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}${profile_base64:0:50}...${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}KEYCHAIN_PASSWORD${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}$keychain_password${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}APPLE_TEAM_ID${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}XDY458RQ59${NC}"
    echo ""
    
    echo -e "${WHITE}Secret Name: ${CYAN}PROVISIONING_PROFILE_NAME${NC}"
    echo -e "${WHITE}Secret Value: ${GREEN}Serenity App Store Profile${NC}"
    echo ""
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo -e "${CYAN}================================================================================="
    echo -e "  Next Steps"
    echo -e "=================================================================================${NC}"
    echo ""
    echo -e "${YELLOW}1. 🔐 Configure GitHub Secrets:${NC}"
    echo -e "   ${WHITE}- Go to your repository on GitHub${NC}"
    echo -e "   ${WHITE}- Navigate: Settings > Secrets and variables > Actions${NC}"
    echo -e "   ${WHITE}- Add each secret shown above${NC}"
    echo ""
    echo -e "${YELLOW}2. 🍎 Verify Apple Developer Configuration:${NC}"
    echo -e "   ${WHITE}- Team ID: XDY458RQ59${NC}"
    echo -e "   ${WHITE}- Bundle ID: com.serenity.recovery${NC}"
    echo -e "   ${WHITE}- Profile Name: Serenity App Store Profile${NC}"
    echo ""
    echo -e "${YELLOW}3. 🚀 Test Deployment:${NC}"
    echo -e "   ${WHITE}- Run the iOS deployment workflow${NC}"
    echo -e "   ${WHITE}- Monitor build logs for certificate import success${NC}"
    echo ""
    echo -e "${YELLOW}4. 📱 Verify App Store Connect:${NC}"
    echo -e "   ${WHITE}- Check TestFlight for uploaded build${NC}"
    echo -e "   ${WHITE}- Submit for App Store review${NC}"
    echo ""
}

# Function to show troubleshooting tips
show_troubleshooting() {
    echo ""
    echo -e "${CYAN}================================================================================="
    echo -e "  Troubleshooting Tips"
    echo -e "=================================================================================${NC}"
    echo ""
    echo -e "${YELLOW}If you encounter 'Unable to decode the provided data':${NC}"
    echo -e "${WHITE}• Ensure the .p12 certificate includes the private key${NC}"
    echo -e "${WHITE}• Verify the certificate is exported from Keychain Access${NC}"
    echo -e "${WHITE}• Check that the certificate password is correct${NC}"
    echo -e "${WHITE}• Make sure the certificate is not expired${NC}"
    echo ""
    echo -e "${YELLOW}If you encounter provisioning profile issues:${NC}"
    echo -e "${WHITE}• Verify the profile contains your distribution certificate${NC}"
    echo -e "${WHITE}• Check that the bundle ID matches exactly: com.serenity.recovery${NC}"
    echo -e "${WHITE}• Ensure the profile is for App Store distribution${NC}"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--certificate)
            CERTIFICATE_PATH="$2"
            shift 2
            ;;
        -p|--profile)
            PROFILE_PATH="$2"
            shift 2
            ;;
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -v|--validate)
            VALIDATE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Display header
echo -e "${CYAN}================================================================================="
echo -e "  Serenity iOS Certificate Encoder for GitHub Secrets"
echo -e "  HIPAA-Compliant Healthcare App Deployment Tool"
echo -e "=================================================================================${NC}"
echo ""

# Interactive mode
if [[ "$INTERACTIVE" == true ]]; then
    echo -e "${YELLOW}📝 Interactive Mode - Please provide file paths${NC}"
    echo ""
    
    read -p "Enter path to iOS distribution certificate (.p12 file): " CERTIFICATE_PATH
    read -p "Enter path to provisioning profile (.mobileprovision file): " PROFILE_PATH
fi

# Validate required parameters
if [[ -z "$CERTIFICATE_PATH" ]] || [[ -z "$PROFILE_PATH" ]]; then
    echo -e "${RED}❌ ERROR: Certificate path and profile path are required${NC}"
    echo ""
    usage
    show_troubleshooting
    exit 1
fi

# Check if files exist
if ! check_file "$CERTIFICATE_PATH" "iOS Certificate"; then
    exit 1
fi

if ! check_file "$PROFILE_PATH" "Provisioning Profile"; then
    exit 1
fi

# Encode files
echo ""
echo -e "${YELLOW}🔄 Starting encoding process...${NC}"

cert_base64=$(encode_file "$CERTIFICATE_PATH" "iOS Distribution Certificate")
if [[ $? -ne 0 ]]; then
    exit 1
fi

profile_base64=$(encode_file "$PROFILE_PATH" "Provisioning Profile")
if [[ $? -ne 0 ]]; then
    exit 1
fi

# Validation
if [[ "$VALIDATE" == true ]]; then
    echo ""
    if ! validate_certificate "$cert_base64"; then
        echo -e "${RED}❌ Certificate validation failed${NC}"
        exit 1
    fi
fi

# Get certificate password
echo ""
read -s -p "Enter the password for the iOS certificate (.p12 file): " cert_password
echo ""

# Generate keychain password
keychain_password=$(generate_password)

# Display results
show_secrets_config "$cert_base64" "$cert_password" "$profile_base64" "$keychain_password"
show_next_steps

# Save configuration reference
output_file="certificate-config-reference.txt"
cat > "$output_file" << EOF
iOS Certificate Configuration Reference
Generated: $(date)

Required GitHub Secrets:
- IOS_CERTIFICATE: [Base64 encoded certificate - ${#cert_base64} chars]
- IOS_CERTIFICATE_PASSWORD: [Certificate password provided]
- IOS_PROVISION_PROFILE: [Base64 encoded profile - ${#profile_base64} chars]
- KEYCHAIN_PASSWORD: [Generated secure password]
- APPLE_TEAM_ID: XDY458RQ59
- PROVISIONING_PROFILE_NAME: Serenity App Store Profile

Bundle Configuration:
- Bundle ID: com.serenity.recovery
- Team ID: XDY458RQ59
- Profile Name: Serenity App Store Profile

Files Processed:
- Certificate: $CERTIFICATE_PATH
- Profile: $PROFILE_PATH

Next Steps:
1. Add secrets to GitHub repository
2. Test iOS deployment workflow
3. Monitor TestFlight for uploaded build
EOF

echo -e "${GREEN}📄 Configuration reference saved to: $output_file${NC}"

echo ""
echo -e "${GREEN}🎉 Certificate encoding completed successfully!${NC}"
echo -e "${CYAN}🔐 Ready for GitHub Actions deployment${NC}"