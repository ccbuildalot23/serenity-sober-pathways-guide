/**
 * Provider MVP Extension for Serenity
 * Adds therapist features to existing TRUE MVP
 * Maintains zero-dependency philosophy
 */

// Provider data storage (in-memory for MVP)
const providers = {
  'provider@example.com': { 
    password: 'ProviderPass123!',
    name: 'Dr. Smith',
    tier: 'professional',
    patients: []
  }
};

// Mock patient data linked to provider
const providerPatients = [
  { 
    id: 1, 
    name: 'Test Patient', 
    email: 'user@example.com',
    lastCheckin: new Date().toISOString(),
    checkinCount: 7,
    avgMood: 6.5,
    retentionRisk: 'low'
  }
];

// Billing tracking for ROI
const billingData = {
  minutesTracked: {
    CCM: 45,  // Chronic Care Management
    BHI: 30   // Behavioral Health Integration
  },
  suggestedCodes: []
};

// CPT Code definitions with reimbursement rates
const CPT_CODES = {
  '99490': { minutes: 20, rate: 42.84, description: 'CCM initial 20 min' },
  '99439': { minutes: 20, rate: 42.84, description: 'CCM additional 20 min' },
  '99484': { minutes: 20, rate: 47.53, description: 'BHI initial 20 min' },
  '99492': { minutes: 70, rate: 93.00, description: 'Initial psychiatric care' }
};

// Provider-specific route handlers
function handleProviderRoutes(url, method, body, res) {
  // Provider login
  if (url === '/api/provider/login' && method === 'POST') {
    try {
      const { email, password } = JSON.parse(body);
      const provider = providers[email];
      
      if (provider && provider.password === password) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          token: 'provider-token-' + Date.now(),
          provider: { email, name: provider.name, tier: provider.tier }
        }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid provider credentials' }));
      }
    } catch (err) {
      res.writeHead(400);
      res.end('Bad request');
    }
    return true;
  }
  
  // Get provider's patients
  if (url === '/api/provider/patients' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(providerPatients));
    return true;
  }
  
  // Get patient check-ins (for provider view)
  if (url.startsWith('/api/provider/patient/') && url.includes('/checkins')) {
    const patientId = url.split('/')[4];
    // Return patient's check-ins from main data store
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      patientId,
      checkins: [] // Would pull from main data.checkins filtered by patient
    }));
    return true;
  }
  
  // ROI Calculator
  if (url === '/api/provider/roi' && method === 'GET') {
    const activePatients = providerPatients.filter(p => p.retentionRisk !== 'high').length;
    const totalPatients = providerPatients.length;
    const retentionRate = (activePatients / totalPatients) * 100;
    
    // Calculate financial impact
    const avgPatientValue = 45000; // Conservative $45k/year
    const retainedPatients = Math.floor(activePatients * 0.2); // 20% improvement
    const annualROI = retainedPatients * avgPatientValue;
    
    // Calculate billing opportunity
    const monthlyBilling = calculateMonthlyBilling();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      metrics: {
        totalPatients,
        activePatients,
        retentionRate: retentionRate.toFixed(1) + '%',
        atRiskPatients: totalPatients - activePatients
      },
      financialImpact: {
        retainedPatients,
        annualValueRetained: annualROI,
        monthlyValueRetained: Math.floor(annualROI / 12),
        referralLossPrevented: retainedPatients * 135000 // High-end SUD value
      },
      billing: {
        currentMonth: monthlyBilling,
        projectedAnnual: monthlyBilling * 12,
        uncapturedOpportunity: calculateUncapturedBilling()
      }
    }));
    return true;
  }
  
  // Billing codes suggestion
  if (url === '/api/provider/billing' && method === 'GET') {
    const suggestions = generateBillingSuggestions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      trackedMinutes: billingData.minutesTracked,
      suggestedCodes: suggestions,
      estimatedReimbursement: calculateReimbursement(suggestions)
    }));
    return true;
  }
  
  // Crisis alerts for provider
  if (url === '/api/provider/alerts' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      alerts: [],
      message: 'No active crisis alerts'
    }));
    return true;
  }
  
  return false;
}

// Helper functions
function calculateMonthlyBilling() {
  let total = 0;
  
  // CCM billing (minimum 20 minutes)
  if (billingData.minutesTracked.CCM >= 20) {
    total += CPT_CODES['99490'].rate;
    const additionalCCM = Math.floor((billingData.minutesTracked.CCM - 20) / 20);
    total += additionalCCM * CPT_CODES['99439'].rate;
  }
  
  // BHI billing
  if (billingData.minutesTracked.BHI >= 20) {
    total += CPT_CODES['99484'].rate;
  }
  
  return total * providerPatients.length; // Per patient
}

function calculateUncapturedBilling() {
  // Estimate potential billing not captured
  const potentialMinutes = providerPatients.length * 60; // 60 min/patient/month potential
  const capturedMinutes = billingData.minutesTracked.CCM + billingData.minutesTracked.BHI;
  const uncapturedMinutes = Math.max(0, potentialMinutes - capturedMinutes);
  
  return Math.floor(uncapturedMinutes / 20) * CPT_CODES['99490'].rate;
}

function generateBillingSuggestions() {
  const suggestions = [];
  
  if (billingData.minutesTracked.CCM >= 20) {
    suggestions.push({
      code: '99490',
      description: CPT_CODES['99490'].description,
      qualified: true,
      reimbursement: CPT_CODES['99490'].rate
    });
  }
  
  if (billingData.minutesTracked.BHI >= 20) {
    suggestions.push({
      code: '99484',
      description: CPT_CODES['99484'].description,
      qualified: true,
      reimbursement: CPT_CODES['99484'].rate
    });
  }
  
  return suggestions;
}

function calculateReimbursement(suggestions) {
  return suggestions.reduce((total, s) => total + s.reimbursement, 0) * providerPatients.length;
}

// Export for use in main server
module.exports = {
  handleProviderRoutes,
  providers,
  providerPatients,
  billingData
};