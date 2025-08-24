/**
 * Cultural Sensitivity Worker Agent
 * Ensures culturally appropriate and inclusive communication
 * Adapts content for diverse backgrounds and languages
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface CulturalRequest {
  action: string;
  payload: {
    content?: any;
    culture?: string;
    language?: string;
    userId?: string;
    religionConsiderations?: string[];
    customTraditions?: string[];
  };
  agentConfig: any;
}

interface CulturalResponse {
  message: string;
  culturalAdaptations: string[];
  languageConsiderations: string[];
  inclusivityScore: number;
  warnings?: string[];
  alternatives?: string[];
}

// Cultural sensitivity database
const culturalGuidelines = {
  'hispanic': {
    values: ['family', 'faith', 'community', 'respect'],
    considerations: ['Use respectful formal address initially', 'Family involvement is often important'],
    avoidTerms: [],
    preferredApproach: 'warm and personal'
  },
  'asian': {
    values: ['harmony', 'respect', 'education', 'family honor'],
    considerations: ['Indirect communication may be preferred', 'Saving face is important'],
    avoidTerms: ['shame', 'dishonor'],
    preferredApproach: 'respectful and indirect'
  },
  'african-american': {
    values: ['community', 'spirituality', 'resilience', 'authenticity'],
    considerations: ['Acknowledge systemic challenges', 'Respect for lived experiences'],
    avoidTerms: [],
    preferredApproach: 'authentic and empowering'
  },
  'native-american': {
    values: ['tradition', 'nature', 'community', 'spirituality'],
    considerations: ['Holistic healing approaches', 'Respect for traditional practices'],
    avoidTerms: [],
    preferredApproach: 'holistic and respectful'
  },
  'middle-eastern': {
    values: ['family', 'honor', 'faith', 'hospitality'],
    considerations: ['Gender considerations may apply', 'Religious observances important'],
    avoidTerms: [],
    preferredApproach: 'formal and respectful'
  }
};

const languageAdaptations = {
  'spanish': {
    formalAddress: 'usted',
    informalAddress: 'tú',
    respectfulGreeting: 'Buenos días',
    encouragement: 'Ánimo, lo está haciendo muy bien'
  },
  'mandarin': {
    formalAddress: '您',
    informalAddress: '你',
    respectfulGreeting: '您好',
    encouragement: '加油，你做得很好'
  },
  'arabic': {
    formalAddress: 'حضرتك',
    respectfulGreeting: 'السلام عليكم',
    encouragement: 'أحسنت، استمر'
  }
};

/**
 * Lambda handler for cultural sensitivity worker
 */
export const handler = async (
  event: CulturalRequest,
  context: Context
): Promise<CulturalResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth('cultural-sensitivity');
    
    switch (event.action) {
      case 'adapt':
        return await adaptForCulture(event.payload);
      
      case 'checkInclusivity':
        return await checkInclusivity(event.payload);
      
      case 'translateConcepts':
        return await translateCulturalConcepts(event.payload);
      
      case 'validateAppropriateness':
        return await validateCulturalAppropriateness(event.payload);
      
      default:
        return await adaptForCulture(event.payload);
    }
  } catch (error) {
    console.error('Cultural adaptation error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return culturally neutral response
    return {
      message: event.payload.content?.message || 'We are here to support you.',
      culturalAdaptations: ['neutral'],
      languageConsiderations: [],
      inclusivityScore: 0.7
    };
  } finally {
    // Report processing time
    await reportMetric('ProcessingTime', Date.now() - startTime, 'cultural-sensitivity');
  }
};

/**
 * Adapt content for specific cultural background
 */
async function adaptForCulture(
  payload: any
): Promise<CulturalResponse> {
  const { content, culture, language, userId, religionConsiderations } = payload;
  
  let adaptedMessage = content?.message || content || '';
  const culturalAdaptations: string[] = [];
  const languageConsiderations: string[] = [];
  const warnings: string[] = [];
  
  // Apply cultural guidelines
  if (culture && culturalGuidelines[culture.toLowerCase() as keyof typeof culturalGuidelines]) {
    const guidelines = culturalGuidelines[culture.toLowerCase() as keyof typeof culturalGuidelines];
    
    // Adapt communication style
    adaptedMessage = applyCulturalStyle(adaptedMessage, guidelines);
    culturalAdaptations.push(`style:${guidelines.preferredApproach}`);
    
    // Check for terms to avoid
    const problematicTerms = checkProblematicTerms(adaptedMessage, guidelines.avoidTerms);
    if (problematicTerms.length > 0) {
      warnings.push(`Contains potentially sensitive terms: ${problematicTerms.join(', ')}`);
      adaptedMessage = replaceSensitiveTerms(adaptedMessage, problematicTerms);
    }
    
    // Add cultural values emphasis
    adaptedMessage = emphasizeCulturalValues(adaptedMessage, guidelines.values);
    culturalAdaptations.push(`values:${guidelines.values.slice(0, 2).join(',')}`);
  }
  
  // Apply language adaptations
  if (language && language !== 'english') {
    const langAdapt = applyLanguageAdaptations(adaptedMessage, language);
    if (langAdapt.adapted) {
      adaptedMessage = langAdapt.message;
      languageConsiderations.push(...langAdapt.considerations);
    }
  }
  
  // Consider religious aspects
  if (religionConsiderations && religionConsiderations.length > 0) {
    adaptedMessage = applyReligiousConsiderations(adaptedMessage, religionConsiderations);
    culturalAdaptations.push('religion-aware');
  }
  
  // Check overall inclusivity
  const inclusivityScore = calculateInclusivityScore(adaptedMessage, culturalAdaptations);
  
  // Generate alternatives if score is low
  const alternatives = inclusivityScore < 0.7 ? 
    generateCulturalAlternatives(content, culture) : undefined;
  
  // Track cultural adaptation success
  if (userId) {
    await trackCulturalAdaptation(userId, {
      culture,
      language,
      inclusivityScore,
      timestamp: Date.now()
    });
  }
  
  return {
    message: adaptedMessage,
    culturalAdaptations,
    languageConsiderations,
    inclusivityScore,
    warnings: warnings.length > 0 ? warnings : undefined,
    alternatives
  };
}

/**
 * Check content for inclusivity
 */
async function checkInclusivity(
  payload: any
): Promise<CulturalResponse> {
  const { content } = payload;
  const message = content?.message || content || '';
  
  const inclusivityChecks = {
    genderNeutral: checkGenderNeutrality(message),
    accessible: checkAccessibility(message),
    nonDiscriminatory: checkForDiscrimination(message),
    culturallyNeutral: checkCulturalNeutrality(message)
  };
  
  const score = Object.values(inclusivityChecks).filter(v => v).length / 4;
  const issues: string[] = [];
  
  if (!inclusivityChecks.genderNeutral) issues.push('Contains gendered language');
  if (!inclusivityChecks.accessible) issues.push('May not be accessible');
  if (!inclusivityChecks.nonDiscriminatory) issues.push('Potential discriminatory language');
  if (!inclusivityChecks.culturallyNeutral) issues.push('Cultural assumptions detected');
  
  return {
    message: message,
    culturalAdaptations: [],
    languageConsiderations: issues,
    inclusivityScore: score,
    warnings: issues.length > 0 ? issues : undefined
  };
}

/**
 * Translate cultural concepts appropriately
 */
async function translateCulturalConcepts(
  payload: any
): Promise<CulturalResponse> {
  const { content, culture, language } = payload;
  const message = content?.message || content || '';
  
  // Map Western recovery concepts to culturally appropriate equivalents
  const conceptMappings: Record<string, Record<string, string>> = {
    'self-care': {
      'hispanic': 'cuidado personal y familiar',
      'asian': 'maintaining harmony and balance',
      'african-american': 'community care and self-love',
      'native-american': 'healing the whole person',
      'middle-eastern': 'maintaining honor and well-being'
    },
    'recovery': {
      'hispanic': 'renovación',
      'asian': 'restoration of balance',
      'african-american': 'reclaiming your power',
      'native-american': 'walking the healing path',
      'middle-eastern': 'return to wholeness'
    },
    'support group': {
      'hispanic': 'círculo de apoyo',
      'asian': 'harmonious community',
      'african-american': 'village of support',
      'native-american': 'healing circle',
      'middle-eastern': 'community of care'
    }
  };
  
  let translatedMessage = message;
  const adaptations: string[] = [];
  
  // Replace concepts with cultural equivalents
  Object.entries(conceptMappings).forEach(([concept, translations]) => {
    if (message.toLowerCase().includes(concept) && culture) {
      const culturalEquivalent = translations[culture.toLowerCase()];
      if (culturalEquivalent) {
        translatedMessage = translatedMessage.replace(
          new RegExp(concept, 'gi'),
          culturalEquivalent
        );
        adaptations.push(`translated:${concept}`);
      }
    }
  });
  
  return {
    message: translatedMessage,
    culturalAdaptations: adaptations,
    languageConsiderations: [`Concepts adapted for ${culture} context`],
    inclusivityScore: 0.85
  };
}

/**
 * Validate cultural appropriateness of content
 */
async function validateCulturalAppropriateness(
  payload: any
): Promise<CulturalResponse> {
  const { content, culture } = payload;
  const message = content?.message || content || '';
  
  const validationResults = {
    appropriate: true,
    concerns: [] as string[],
    suggestions: [] as string[]
  };
  
  // Check for cultural insensitivity
  const insensitivePatterns = [
    /one size fits all/i,
    /normal family/i,
    /standard treatment/i,
    /typical behavior/i
  ];
  
  insensitivePatterns.forEach(pattern => {
    if (pattern.test(message)) {
      validationResults.appropriate = false;
      validationResults.concerns.push(`Pattern "${pattern.source}" may be culturally insensitive`);
      validationResults.suggestions.push('Consider more inclusive language');
    }
  });
  
  // Validate against specific cultural guidelines
  if (culture && culturalGuidelines[culture.toLowerCase() as keyof typeof culturalGuidelines]) {
    const guidelines = culturalGuidelines[culture.toLowerCase() as keyof typeof culturalGuidelines];
    
    guidelines.avoidTerms.forEach(term => {
      if (message.toLowerCase().includes(term)) {
        validationResults.appropriate = false;
        validationResults.concerns.push(`Term "${term}" should be avoided`);
      }
    });
  }
  
  return {
    message: validationResults.appropriate ? message : 'Content needs cultural adaptation',
    culturalAdaptations: validationResults.suggestions,
    languageConsiderations: validationResults.concerns,
    inclusivityScore: validationResults.appropriate ? 0.9 : 0.3,
    warnings: validationResults.concerns.length > 0 ? validationResults.concerns : undefined
  };
}

// Helper functions

function applyCulturalStyle(message: string, guidelines: any): string {
  switch (guidelines.preferredApproach) {
    case 'warm and personal':
      return `Mi amigo/a, ${message}`;
    
    case 'respectful and indirect':
      return message.replace(/you must/gi, 'it might be helpful to')
                   .replace(/you should/gi, 'you might consider');
    
    case 'authentic and empowering':
      return `${message} You've got this!`;
    
    case 'holistic and respectful':
      return `${message} Honor your journey.`;
    
    case 'formal and respectful':
      return `With respect, ${message}`;
    
    default:
      return message;
  }
}

function checkProblematicTerms(message: string, avoidTerms: string[]): string[] {
  const found: string[] = [];
  
  avoidTerms.forEach(term => {
    if (message.toLowerCase().includes(term.toLowerCase())) {
      found.push(term);
    }
  });
  
  return found;
}

function replaceSensitiveTerms(message: string, terms: string[]): string {
  let adapted = message;
  
  const replacements: Record<string, string> = {
    'shame': 'challenge',
    'dishonor': 'difficulty',
    'failure': 'setback',
    'weak': 'struggling'
  };
  
  terms.forEach(term => {
    const replacement = replacements[term.toLowerCase()] || 'situation';
    adapted = adapted.replace(new RegExp(term, 'gi'), replacement);
  });
  
  return adapted;
}

function emphasizeCulturalValues(message: string, values: string[]): string {
  // Add value-based encouragement
  const valueEmphasis: Record<string, string> = {
    'family': ' Your family supports your journey.',
    'faith': ' Draw strength from your beliefs.',
    'community': ' Your community is here for you.',
    'respect': ' We honor your path.',
    'harmony': ' Find your balance.',
    'resilience': ' Your strength shines through.',
    'tradition': ' Your traditions guide you.'
  };
  
  const relevantValue = values.find(v => !message.toLowerCase().includes(v));
  if (relevantValue && valueEmphasis[relevantValue]) {
    return message + valueEmphasis[relevantValue];
  }
  
  return message;
}

function applyLanguageAdaptations(message: string, language: string): any {
  const langAdapt = languageAdaptations[language.toLowerCase() as keyof typeof languageAdaptations];
  
  if (!langAdapt) {
    return { adapted: false, message, considerations: [] };
  }
  
  // Add appropriate greeting if not present
  if (!message.toLowerCase().includes('hello') && !message.toLowerCase().includes('hi')) {
    message = `${langAdapt.respectfulGreeting}! ${message}`;
  }
  
  return {
    adapted: true,
    message,
    considerations: [
      `Consider formal address (${langAdapt.formalAddress})`,
      `Encouragement phrase: ${langAdapt.encouragement}`
    ]
  };
}

function applyReligiousConsiderations(message: string, considerations: string[]): string {
  // Avoid scheduling during prayer times
  if (considerations.includes('prayer_times')) {
    message += ' (Scheduled respectfully around prayer times)';
  }
  
  // Add faith-based encouragement if appropriate
  if (considerations.includes('faith_based')) {
    message += ' May you find strength in your faith.';
  }
  
  // Respect dietary considerations
  if (considerations.includes('dietary') && message.includes('meal')) {
    message = message.replace(/meal/gi, 'appropriate meal');
  }
  
  return message;
}

function calculateInclusivityScore(message: string, adaptations: string[]): number {
  let score = 0.5; // Base score
  
  // Positive indicators
  if (adaptations.length > 0) score += 0.1 * adaptations.length;
  if (!hasExclusiveLanguage(message)) score += 0.2;
  if (isGenderNeutral(message)) score += 0.1;
  if (isAccessible(message)) score += 0.1;
  
  // Negative indicators
  if (hasAssumptions(message)) score -= 0.2;
  if (hasCulturalBias(message)) score -= 0.2;
  
  return Math.max(0, Math.min(1, score));
}

function generateCulturalAlternatives(content: any, culture?: string): string[] {
  const alternatives = [
    'We respect and support your unique journey.',
    'Your path to wellness is valid and important.',
    'We honor your strength and resilience.'
  ];
  
  if (culture) {
    alternatives.push(`We understand the importance of ${culture} values in your recovery.`);
  }
  
  return alternatives;
}

function checkGenderNeutrality(message: string): boolean {
  const genderedTerms = /\b(he|she|his|her|him|man|woman|guy|girl)\b/i;
  return !genderedTerms.test(message);
}

function checkAccessibility(message: string): boolean {
  // Check for complex language or jargon
  const complexTerms = /\b(utilize|commence|terminate|facilitate)\b/i;
  return !complexTerms.test(message);
}

function checkForDiscrimination(message: string): boolean {
  const discriminatoryTerms = /\b(normal|abnormal|crazy|insane|addict|junkie)\b/i;
  return !discriminatoryTerms.test(message);
}

function checkCulturalNeutrality(message: string): boolean {
  const culturalAssumptions = /\b(everyone knows|obviously|standard|typical)\b/i;
  return !culturalAssumptions.test(message);
}

function hasExclusiveLanguage(message: string): boolean {
  return /\b(only|must|always|never|everyone|nobody)\b/i.test(message);
}

function isGenderNeutral(message: string): boolean {
  return checkGenderNeutrality(message);
}

function isAccessible(message: string): boolean {
  return checkAccessibility(message);
}

function hasAssumptions(message: string): boolean {
  return /\b(assume|supposed to|should|normal)\b/i.test(message);
}

function hasCulturalBias(message: string): boolean {
  return /\b(Western|American way|right way|proper)\b/i.test(message);
}

async function trackCulturalAdaptation(userId: string, data: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `cultural-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'cultural_adaptation' },
        data: { S: JSON.stringify(data) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 30).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to track cultural adaptation:', error);
  }
}

async function reportWorkerHealth(workerId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: 'WorkerHealth',
        Value: 1,
        Unit: 'None',
        Dimensions: [{ Name: 'WorkerId', Value: workerId }],
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to report worker health:', error);
  }
}

async function reportError(error: Error, requestId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: 'WorkerErrors',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'ErrorType', Value: error.name },
          { Name: 'RequestId', Value: requestId }
        ],
        Timestamp: new Date()
      }]
    });
  } catch (err) {
    console.error('Failed to report error:', err);
  }
}

async function reportMetric(
  metricName: string, 
  value: number, 
  workerId: string
): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: 'Milliseconds',
        Dimensions: [{ Name: 'WorkerId', Value: workerId }],
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to report metric:', error);
  }
}