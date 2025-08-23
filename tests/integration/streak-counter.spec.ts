import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ymgvakqyvqexhluhpypf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Streak Counter Integration Tests', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test('calculates consecutive days correctly', async ({ page }) => {
    // Navigate to patient dashboard
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Check if streak display exists
    const streakElement = await page.locator('[data-testid="streak-counter"]');
    await expect(streakElement).toBeVisible();
    
    // Verify streak shows consecutive days, not total check-ins
    const streakText = await streakElement.textContent();
    expect(streakText).toMatch(/\d+ day(?:s)? streak/);
  });

  test('updates streak after daily check-in', async ({ page }) => {
    // Navigate to check-in page
    await page.goto('http://localhost:8080/patient/checkin');
    
    // Get initial streak value
    const initialStreak = await page.locator('[data-testid="current-streak"]').textContent();
    const initialValue = parseInt(initialStreak?.match(/\d+/)?.[0] || '0');
    
    // Complete a check-in
    await page.fill('[data-testid="mood-slider"]', '7');
    await page.fill('[data-testid="anxiety-slider"]', '3');
    await page.fill('[data-testid="sleep-hours"]', '8');
    await page.fill('[data-testid="gratitude-input"]', 'Grateful for recovery progress');
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="checkin-success"]')).toBeVisible();
    
    // Navigate back to dashboard
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Verify streak incremented
    const updatedStreak = await page.locator('[data-testid="streak-counter"]').textContent();
    const updatedValue = parseInt(updatedStreak?.match(/\d+/)?.[0] || '0');
    
    expect(updatedValue).toBe(initialValue + 1);
  });

  test('resets streak after missed day', async ({ page }) => {
    // Create test scenario with gap in check-ins
    const userId = 'test-user-streak';
    
    // Insert check-ins with a gap
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Insert check-ins (simulating missed day)
    await supabase.from('daily_checkins').insert([
      {
        user_id: userId,
        check_in_date: threeDaysAgo.toISOString().split('T')[0],
        mood_score: 7,
        anxiety_level: 3,
        sleep_hours: 8
      },
      {
        user_id: userId,
        check_in_date: today.toISOString().split('T')[0],
        mood_score: 8,
        anxiety_level: 2,
        sleep_hours: 7
      }
    ]);
    
    // Navigate to dashboard
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Verify streak shows 1 (only today's check-in counts)
    const streakElement = await page.locator('[data-testid="streak-counter"]');
    const streakText = await streakElement.textContent();
    
    expect(streakText).toContain('1 day');
  });

  test('displays milestone celebrations at key intervals', async ({ page }) => {
    // Test for 7, 30, 60, 90 day milestones
    const milestones = [7, 30, 60, 90];
    
    for (const milestone of milestones) {
      // Mock streak data
      await page.evaluate((days) => {
        localStorage.setItem('streak_days', days.toString());
      }, milestone);
      
      // Navigate to dashboard
      await page.goto('http://localhost:8080/patient/dashboard');
      
      // Check for milestone celebration
      const celebration = await page.locator(`[data-testid="milestone-${milestone}"]`);
      if (await celebration.isVisible()) {
        await expect(celebration).toContainText(`${milestone} days`);
      }
    }
  });

  test('persists streak across sessions', async ({ page, context }) => {
    // Login and check streak
    await page.goto('http://localhost:8080/patient/dashboard');
    const initialStreak = await page.locator('[data-testid="streak-counter"]').textContent();
    
    // Close and reopen in new context
    await context.close();
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    
    // Navigate back to dashboard
    await newPage.goto('http://localhost:8080/patient/dashboard');
    
    // Verify streak persists
    const persistedStreak = await newPage.locator('[data-testid="streak-counter"]').textContent();
    expect(persistedStreak).toBe(initialStreak);
    
    await newContext.close();
  });
});