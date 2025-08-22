#!/bin/bash

clear
echo ""
echo "========================================================"
echo "        🎬 SERENITY DEMO RECORDING SYSTEM"
echo "========================================================"
echo ""
echo "📋 CHECKLIST:"
echo "  ☐ Phone positioned in camera frame"
echo "  ☐ SMS app open and visible"
echo "  ☐ Browser ready at localhost:8080"
echo "  ☐ Loom extension installed"
echo "  ☐ Microphone working"
echo "  ☐ Water nearby"
echo ""
read -p "📱 Phone ready and visible to camera? Press ENTER when ready..."
echo ""
echo "🎤 Microphone check..."

# Check OS for text-to-speech
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    say "Testing audio. You got this, Christopher. 33 days clean. Your story matters."
elif command -v espeak &> /dev/null; then
    # Linux with espeak
    espeak "Testing audio. You got this, Christopher."
else
    echo "   (Audio test - imagine encouraging words here)"
fi

echo ""
echo "Starting in..."
for i in 3 2 1; do
    echo "$i..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        afplay /System/Library/Sounds/Ping.aiff 2>/dev/null
    else
        echo -e "\a"
    fi
    sleep 1
done

echo ""
echo "========================================================"
echo "   🔴 START LOOM RECORDING NOW!"
echo "========================================================"
echo ""

# Play alert sound
if [[ "$OSTYPE" == "darwin"* ]]; then
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null
fi

echo "Waiting for you to start Loom..."
sleep 3
echo ""
echo "Demo beginning..."
echo ""

# Check for practice mode
if [ "$1" == "--practice" ]; then
    echo "[PRACTICE MODE - No SMS will be sent]"
    node automated-demo-director.js --practice
else
    echo "[PRODUCTION MODE - Real SMS will be sent]"
    node automated-demo-director.js
fi

echo ""
echo "========================================================"
echo "        ✅ RECORDING COMPLETE!"
echo "========================================================"
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Stop your Loom recording"
echo "  2. Get the share link from Loom"
echo "  3. Check email-campaigns.json for templates"
echo "  4. Send to first 10 providers"
echo ""
read -p "Press ENTER to exit..."