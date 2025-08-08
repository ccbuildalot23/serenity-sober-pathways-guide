// Test WhatsApp Integration
// Usage: node scripts/test-whatsapp.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createInterface } from 'readline'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testWhatsApp() {
  console.log('🚀 Testing WhatsApp Integration...\n')

  // Test 1: Check webhook is responding
  console.log('1️⃣ Testing Webhook Health...')
  try {
    const webhookUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`
    const response = await fetch(`${webhookUrl}?hub.mode=subscribe&hub.verify_token=serenity_webhook_2025&hub.challenge=test123`)
    const result = await response.text()
    console.log('✅ Webhook verification:', result === 'test123' ? 'PASSED' : 'FAILED')
    console.log('   Response:', result)
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message)
  }

  console.log('\n2️⃣ Testing Send Function...')
  console.log('   Note: This will only work if you have approved message templates')
  
  // Get phone number from user
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  readline.question('\nEnter phone number to test (with country code, e.g., +1234567890): ', async (phoneNumber) => {
    if (!phoneNumber) {
      console.log('❌ No phone number provided')
      readline.close()
      return
    }

    try {
      // Test sending a text message (doesn't require template)
      console.log('\n3️⃣ Sending test text message...')
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: phoneNumber,
          type: 'text',
          message: 'Hello from Serenity! This is a test message from your WhatsApp integration. Reply STOP to opt out.'
        }
      })

      if (error) {
        console.log('❌ Send failed:', error.message)
      } else {
        console.log('✅ Message sent successfully!')
        console.log('   Message ID:', data.messageId)
        console.log('   Sent to:', data.to)
      }

      // Test template message (if templates are approved)
      readline.question('\nDo you have approved message templates? (y/n): ', async (hasTemplates) => {
        if (hasTemplates.toLowerCase() === 'y') {
          console.log('\n4️⃣ Testing template message...')
          const { data: templateData, error: templateError } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: phoneNumber,
              type: 'template',
              template: 'hello_world', // Default Meta template
              parameters: []
            }
          })

          if (templateError) {
            console.log('❌ Template send failed:', templateError.message)
            console.log('   This is normal if you haven\'t created templates yet')
          } else {
            console.log('✅ Template message sent!')
            console.log('   Message ID:', templateData.messageId)
          }
        }

        console.log('\n5️⃣ Testing Opt-In Flow...')
        readline.question('Do you want to test the opt-in flow? (y/n): ', async (testOptIn) => {
          if (testOptIn.toLowerCase() === 'y') {
            // First, sign in (you'll need test credentials)
            console.log('\nYou need to be authenticated for opt-in.')
            readline.question('Enter test email: ', async (email) => {
              readline.question('Enter test password: ', async (password) => {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                  email,
                  password
                })

                if (authError) {
                  console.log('❌ Authentication failed:', authError.message)
                } else {
                  console.log('✅ Authenticated as:', authData.user.email)

                  const { data: optInData, error: optInError } = await supabase.functions.invoke('whatsapp-opt-in', {
                    body: {
                      phoneNumber,
                      consentMethod: 'in_app',
                      consentMessage: 'Testing WhatsApp opt-in'
                    }
                  })

                  if (optInError) {
                    console.log('❌ Opt-in failed:', optInError.message)
                  } else {
                    console.log('✅ Opt-in initiated!')
                    console.log('   Status:', optInData.status)
                    console.log('   Verification Code:', optInData.verificationCode)
                    console.log('   Opt-in ID:', optInData.optInId)
                  }
                }

                console.log('\n✨ WhatsApp Integration Test Complete!')
                console.log('\nNext Steps:')
                console.log('1. Create message templates in Meta Business Manager')
                console.log('2. Wait for template approval (usually 24 hours)')
                console.log('3. Test the full crisis notification flow')
                console.log('4. Monitor webhook logs: npx supabase functions logs whatsapp-webhook --tail')
                
                readline.close()
                process.exit(0)
              })
            })
          } else {
            console.log('\n✨ WhatsApp Integration Test Complete!')
            readline.close()
            process.exit(0)
          }
        })
      })
    } catch (error) {
      console.log('❌ Test failed:', error)
      readline.close()
      process.exit(1)
    }
  })
}

// Run the test
testWhatsApp().catch(console.error)