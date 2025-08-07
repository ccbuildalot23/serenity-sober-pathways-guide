#!/bin/bash

# Test WhatsApp API directly with curl
echo "Testing WhatsApp send function..."

curl -X POST \
  'https://tqyiqstpvwztvofrxpuf.supabase.co/functions/v1/send-whatsapp' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3RwdndqdHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTgxODAsImV4cCI6MjA3MzIzNDE4MH0.yJ1dNBMTRaLrVDvOZ0MYOqTnKEe5z1VLCrO-G-vH-wY" \
  -d '{
    "to": "+12404199375",
    "type": "text",
    "message": "Test message from Serenity Recovery"
  }' \
  -v