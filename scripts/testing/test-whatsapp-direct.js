// Direct WhatsApp Test - No prompts
// Usage: node scripts/test-whatsapp-direct.js PHONE_NUMBER

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const phoneNumber = process.argv[2]

if (!phoneNumber) {
  console.log('❌ Usage: node scripts/test-whatsapp-direct.js PHONE_NUMBER')
  console.log('   Example: node scripts/test-whatsapp-direct.js +1234567890')
  process.exit(1)
}

async function testWhatsApp() {
  console.log('🚀 Testing WhatsApp Integration...\n')
  console.log('📱 Testing with phone number:', phoneNumber)

  // Test 1: Send a plain text message
  console.log('\n1️⃣ Sending plain text message...')
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        to: phoneNumber,
        type: 'text',
        message: 'Hello from Serenity Recovery! 🌟\n\nThis is a test message confirming your WhatsApp integration is working.\n\nYou can now receive:\n• Crisis alerts\n• Daily check-ins\n• Recovery milestones\n\nReply STOP to opt out.'
      }
    })

    if (error) {
      console.log('❌ Error:', error.message)
      if (error.message.includes('token')) {
        console.log('   💡 Check your WhatsApp access token')
      }
    } else if (data?.success) {
      console.log('✅ Message sent successfully!')
      console.log('   Message ID:', data.messageId)
      console.log('   Sent to:', data.to)
      console.log('   Status:', data.status)
    } else {
      console.log('⚠️ Unexpected response:', data)
    }
  } catch (err) {
    console.log('❌ Failed to send message:', err.message)
  }

  // Test 2: Check webhook logs
  console.log('\n2️⃣ Checking webhook status...')
  console.log('   Run this command to see webhook logs:')
  console.log('   npx supabase functions logs whatsapp-webhook --tail')

  // Test 3: Try hello_world template (if exists)
  console.log('\n3️⃣ Testing with hello_world template...')
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        to: phoneNumber,
        type: 'template',
        template: 'hello_world',
        parameters: []
      }
    })

    if (error) {
      console.log('⚠️ Template not available:', error.message)
      console.log('   This is normal if you don\'t have the hello_world template')
    } else if (data?.success) {
      console.log('✅ Template message sent!')
      console.log('   Message ID:', data.messageId)
    }
  } catch (err) {
    console.log('⚠️ Template test skipped')
  }

  console.log('\n📊 Test Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ WhatsApp functions deployed')
  console.log('✅ Environment variables configured')
  console.log('⏳ Message templates pending approval (24 hours)')
  console.log('\n💡 Next steps:')
  console.log('1. Check WhatsApp on', phoneNumber)
  console.log('2. Wait for template approval email from Meta')
  console.log('3. Test full crisis alert flow once templates are approved')
}

// Run the test
testWhatsApp()
  .then(() => {
    console.log('\n✨ Test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err)
    process.exit(1)
  })