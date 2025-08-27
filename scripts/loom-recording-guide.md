# 🎥 LOOM RECORDING GUIDE - Crisis Demo Video

## Pre-Recording Setup (5 minutes)

### 1. Environment Preparation
```bash
# Terminal 1 - Demo Trigger
cd serenity-sober-pathways-guide/scripts
node trigger-demo-crisis.js

# Terminal 2 - Live App
cd serenity-sober-pathways-guide
npm run dev
# Open http://localhost:8080/provider/demo

# Terminal 3 - MCP Server (optional)
cd serenity-crisis-mcp
npm run build && npm start
```

### 2. Phone Setup
- Place phone in frame (use phone stand if available)
- Clear all notifications
- Set to Do Not Disturb EXCEPT for Twilio number
- Have SMS app open and visible
- Brightness at maximum

### 3. Browser Setup
- Open demo page: http://localhost:8080/provider/demo
- Clear browser notifications
- Zoom to 110% for better visibility
- Have Supabase dashboard open in tab (optional)

### 4. Loom Setup
- Install Loom Chrome extension
- Set recording to "Screen and Camera"
- Position camera bubble in bottom right
- Test audio levels
- Use "HD" quality setting

## Recording Script (2-3 minutes max)

### Opening (10 seconds)
"Hi [Provider Name], Christopher here from Serenity Health. 
I wanted to show you exactly how our crisis response system works in real-time.
This is what your patients experience when they need immediate help."

### Demo Crisis Alert (30 seconds)
1. **Show the trigger**
   - "Watch what happens when a patient triggers a crisis alert"
   - Click trigger button in terminal
   - "The system instantly notifies their support network"

2. **Show SMS arrival**
   - Point to phone as SMS arrives
   - "There it is - under 3 seconds"
   - Show the message content
   - "GPS location, patient info, one-tap response"

3. **Show cascade**
   - "If Tier 1 doesn't respond in 30 seconds..."
   - Show Tier 2 notification
   - "Automatic escalation ensures someone always responds"

### Show Provider Benefits (45 seconds)
1. **Documentation Automation**
   - "While that crisis is being handled..."
   - Show voice-to-note feature
   - "Speak your session notes, get compliant documentation in 60 seconds"

2. **CPT Code Generation**
   - Click CPT demo button
   - "Never miss billable services again"
   - "99490 alone is $42/month per patient you're probably missing"

3. **ROI Calculator**
   - Show the math on screen
   - "With 50 patients, that's $2,800/month in additional revenue"
   - "The platform pays for itself 31 times over"

### Integration & Setup (30 seconds)
- "This integrates with SimplePractice in 15 minutes"
- "Your existing workflow stays the same"
- "We just add the features SimplePractice doesn't have"
- Show integration screenshot

### Call to Action (15 seconds)
"We're only taking 5 Virginia practices for our free pilot.
3 spots are already claimed.
Let's do a quick 15-minute setup call - when works for you?
My calendar link is below, or text me at 240-419-9375."

### Closing (10 seconds)
"I'm 34 days into recovery myself.
Therapists saved my life.
Now I want to give you your nights and weekends back.
Talk soon!"

## Post-Recording Checklist

### Loom Editing
- [ ] Trim any dead space
- [ ] Add title: "Serenity Crisis Response - Live Demo for [Practice Name]"
- [ ] Set thumbnail to SMS arrival moment
- [ ] Enable viewer insights
- [ ] Get shareable link

### Video Settings
- [ ] Allow comments
- [ ] Enable CTA button: "Book Your Demo"
- [ ] Add calendar link in description
- [ ] Set to unlisted (not public)

### Quality Check
- [ ] SMS clearly visible on phone
- [ ] Audio is clear
- [ ] Demo runs smoothly
- [ ] Under 3 minutes total
- [ ] CTA is clear and compelling

## Personalization Tips

### For SimplePractice Users
- Emphasize: "You're already using SimplePractice, this adds what they can't do"
- Show SimplePractice webhook setup

### For Addiction Specialists  
- Emphasize: "Your patients in early recovery need 24/7 support"
- Mention: "Built by someone in recovery who gets it"

### For Teletherapy Providers
- Emphasize: "Bridge the gap between virtual sessions"
- Show mobile app demo

### For High-Volume Practices
- Emphasize: "Scales to hundreds of patients without adding staff"
- Show analytics dashboard

## Email Integration

After recording, your video URL will be:
`https://www.loom.com/share/[VIDEO_ID]`

Replace in email template:
```javascript
// In send-provider-emails.js
const LOOM_VIDEO_ID = 'YOUR_VIDEO_ID_HERE';
```

## Tracking Success

### Loom Analytics to Monitor
- Views within 2 hours = Hot lead (call immediately)
- Watched >75% = Interested (schedule demo)
- Commented = Ready to buy (close today)
- No view in 24 hours = Send text reminder

### Follow-Up Timeline
- **Hour 1**: Check views
- **Hour 2**: Text non-viewers
- **Hour 4**: LinkedIn to viewers
- **Day 1**: Call all viewers
- **Day 2**: New angle email to non-viewers

## Troubleshooting

### If SMS doesn't arrive
- Keep recording! Say: "Let me show you on the dashboard"
- Switch to Twilio console showing message sent
- Emphasize reliability: "99.9% delivery rate"

### If demo crashes
- Have backup video ready
- Say: "I have another example here"
- Focus on benefits not technical details

### If recording is too long
- Cut the cascade demo
- Skip the integration details
- Focus on SMS arrival and ROI only

## Sample Loom Titles (A/B Test)

1. "[Practice Name]: See How You Save 10 Hours/Week"
2. "Live Demo: Crisis Alerts in 3 Seconds"
3. "$2,800/Month You're Missing - Here's How"
4. "Your Patients Need This (2-min demo)"
5. "Stop Taking 2 AM Crisis Calls - Watch This"

## Success Metrics

✅ **Great Video**:
- SMS arrives within 5 seconds on camera
- Clear view of phone screen
- Enthusiastic but professional tone
- Under 3 minutes
- Clear CTA at end

❌ **Avoid**:
- Technical jargon
- Showing any errors
- Going over 3 minutes
- Weak or missing CTA
- Poor audio quality

---

## Quick Recording Checklist

Before hitting record:
- [ ] Phone charged and positioned
- [ ] Twilio credentials working
- [ ] Demo trigger script ready
- [ ] Browser tabs prepared
- [ ] Loom extension ready
- [ ] Script printed or visible
- [ ] Water nearby (stay hydrated!)
- [ ] Do Not Disturb on (except Twilio)
- [ ] Smile - enthusiasm sells!

**Remember**: Providers buy from people they trust. Be yourself, show genuine excitement, and remember you're helping them help more people.

Good luck! 🚀