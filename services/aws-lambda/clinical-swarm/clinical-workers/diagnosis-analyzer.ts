/**
 * Diagnosis Analyzer Worker - Clinical Decision Support Node
 * Analyzes symptoms, lab results, and medical history for diagnosis
 * Part of Byzantine fault-tolerant clinical swarm
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface DiagnosisRequest {
  action: string;
  payload: {
    symptoms?: string[];
    labResults?: LabResult[];
    vitalSigns?: VitalSigns;
    medicalHistory?: MedicalHistory[];
    patientAge?: number;
    patientGender?: string;
  };
  consensusId: string;
  nodeId: string;
}

interface LabResult {
  test: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  abnormal?: boolean;
}

interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

interface MedicalHistory {
  condition: string;
  diagnosedDate?: string;
  status: 'active' | 'resolved' | 'chronic';
}

interface DiagnosisResponse {
  decision: {
    diagnoses: Diagnosis[];
    differentialDiagnoses: Diagnosis[];
    recommendedTests: string[];
    urgencyLevel: 'routine' | 'urgent' | 'emergency';
  };
  confidence: number;
  reasoning: string;
  evidence: Evidence[];
}

interface Diagnosis {
  code: string; // ICD-10 code
  name: string;
  probability: number;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface Evidence {
  type: string;
  value: any;
  weight: number;
  source: string;
}

// Medical knowledge base (simplified for demo)
const symptomDiseaseMap = {
  'chest pain': ['I20.9', 'J18.9', 'K21.0', 'F41.0'],
  'shortness of breath': ['J44.0', 'I50.9', 'J18.9', 'F41.0'],
  'fever': ['J18.9', 'N39.0', 'A49.9', 'R50.9'],
  'cough': ['J20.9', 'J18.9', 'J44.0', 'J45.9'],
  'headache': ['G43.909', 'G44.1', 'R51', 'G43.009'],
  'fatigue': ['D64.9', 'E03.9', 'F32.9', 'G93.3'],
  'nausea': ['K92.0', 'R11.0', 'K29.7', 'B18.2'],
  'dizziness': ['R42', 'I95.1', 'H81.9', 'E11.65']
};

const icd10Descriptions = {
  'I20.9': 'Angina pectoris, unspecified',
  'J18.9': 'Pneumonia, unspecified organism',
  'K21.0': 'Gastro-esophageal reflux disease with esophagitis',
  'F41.0': 'Panic disorder',
  'J44.0': 'COPD with acute lower respiratory infection',
  'I50.9': 'Heart failure, unspecified',
  'N39.0': 'Urinary tract infection',
  'A49.9': 'Bacterial infection, unspecified',
  'R50.9': 'Fever, unspecified',
  'J20.9': 'Acute bronchitis, unspecified',
  'J45.9': 'Asthma, unspecified',
  'G43.909': 'Migraine, unspecified',
  'G44.1': 'Tension-type headache',
  'R51': 'Headache',
  'D64.9': 'Anemia, unspecified',
  'E03.9': 'Hypothyroidism, unspecified',
  'F32.9': 'Major depressive disorder',
  'G93.3': 'Chronic fatigue syndrome',
  'K92.0': 'Hematemesis',
  'R11.0': 'Nausea',
  'K29.7': 'Gastritis, unspecified',
  'B18.2': 'Chronic viral hepatitis C',
  'R42': 'Dizziness and giddiness',
  'I95.1': 'Orthostatic hypotension',
  'H81.9': 'Disorder of vestibular function',
  'E11.65': 'Type 2 diabetes with hyperglycemia'
};

/**
 * Lambda handler for diagnosis analysis
 */
export const handler = async (
  event: DiagnosisRequest,
  context: Context
): Promise<DiagnosisResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth(event.nodeId);
    
    // Analyze based on action
    switch (event.action) {
      case 'analyzeDiagnosis':
        return await analyzeDiagnosis(event.payload, event.consensusId);
      
      case 'provideClinicalOpinion':
        return await provideClinicalOpinion(event.payload, event.consensusId);
      
      default:
        return await analyzeDiagnosis(event.payload, event.consensusId);
    }
  } catch (error) {
    console.error('Diagnosis analyzer error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return safe default response
    return {
      decision: {
        diagnoses: [],
        differentialDiagnoses: [],
        recommendedTests: ['Complete Blood Count', 'Basic Metabolic Panel'],
        urgencyLevel: 'routine'
      },
      confidence: 0.3,
      reasoning: 'Error in analysis, recommending basic tests',
      evidence: []
    };
  } finally {
    await reportMetric('ProcessingTime', Date.now() - startTime, event.nodeId);
  }
};

/**
 * Main diagnosis analysis function
 */
async function analyzeDiagnosis(
  payload: any,
  consensusId: string
): Promise<DiagnosisResponse> {
  
  const { symptoms, labResults, vitalSigns, medicalHistory } = payload;
  const evidence: Evidence[] = [];
  const possibleDiagnoses = new Map<string, number>();
  
  // Step 1: Analyze symptoms
  if (symptoms && symptoms.length > 0) {
    const symptomAnalysis = analyzeSymptoms(symptoms);
    symptomAnalysis.diagnoses.forEach(d => {
      possibleDiagnoses.set(d.code, d.probability);
    });
    evidence.push(...symptomAnalysis.evidence);
  }
  
  // Step 2: Analyze lab results
  if (labResults && labResults.length > 0) {
    const labAnalysis = analyzeLabResults(labResults);
    labAnalysis.diagnoses.forEach(d => {
      const current = possibleDiagnoses.get(d.code) || 0;
      possibleDiagnoses.set(d.code, Math.min(1, current + d.probability * 0.4));
    });
    evidence.push(...labAnalysis.evidence);
  }
  
  // Step 3: Analyze vital signs
  if (vitalSigns) {
    const vitalAnalysis = analyzeVitalSigns(vitalSigns);
    vitalAnalysis.diagnoses.forEach(d => {
      const current = possibleDiagnoses.get(d.code) || 0;
      possibleDiagnoses.set(d.code, Math.min(1, current + d.probability * 0.3));
    });
    evidence.push(...vitalAnalysis.evidence);
  }
  
  // Step 4: Consider medical history
  if (medicalHistory && medicalHistory.length > 0) {
    adjustForMedicalHistory(possibleDiagnoses, medicalHistory);
  }
  
  // Step 5: Sort and categorize diagnoses
  const sortedDiagnoses = Array.from(possibleDiagnoses.entries())
    .map(([code, probability]) => ({
      code,
      name: icd10Descriptions[code] || 'Unknown condition',
      probability,
      category: categorizeDisease(code),
      severity: calculateSeverity(probability, evidence)
    }))
    .sort((a, b) => b.probability - a.probability);
  
  // Primary diagnoses (>60% probability)
  const primaryDiagnoses = sortedDiagnoses.filter(d => d.probability > 0.6);
  
  // Differential diagnoses (30-60% probability)
  const differentialDiagnoses = sortedDiagnoses.filter(
    d => d.probability > 0.3 && d.probability <= 0.6
  );
  
  // Determine urgency level
  const urgencyLevel = determineUrgency(primaryDiagnoses, evidence, vitalSigns);
  
  // Recommend additional tests
  const recommendedTests = recommendTests(primaryDiagnoses, evidence);
  
  // Calculate overall confidence
  const confidence = calculateConfidence(evidence, primaryDiagnoses);
  
  // Generate reasoning
  const reasoning = generateReasoning(primaryDiagnoses, evidence);
  
  // Store analysis for audit
  await storeAnalysis(consensusId, {
    diagnoses: primaryDiagnoses,
    evidence,
    timestamp: Date.now()
  });
  
  return {
    decision: {
      diagnoses: primaryDiagnoses.slice(0, 3),
      differentialDiagnoses: differentialDiagnoses.slice(0, 5),
      recommendedTests,
      urgencyLevel
    },
    confidence,
    reasoning,
    evidence
  };
}

/**
 * Provide clinical opinion for consensus
 */
async function provideClinicalOpinion(
  payload: any,
  consensusId: string
): Promise<DiagnosisResponse> {
  // Simplified opinion for general consensus requests
  const analysis = await analyzeDiagnosis(payload, consensusId);
  
  return {
    ...analysis,
    reasoning: `Clinical opinion based on ${analysis.evidence.length} evidence points`
  };
}

// Analysis helper functions

function analyzeSymptoms(symptoms: string[]): any {
  const diagnoses: Diagnosis[] = [];
  const evidence: Evidence[] = [];
  const diseaseScores = new Map<string, number>();
  
  symptoms.forEach(symptom => {
    const normalizedSymptom = symptom.toLowerCase();
    const relatedDiseases = symptomDiseaseMap[normalizedSymptom] || [];
    
    relatedDiseases.forEach(code => {
      const current = diseaseScores.get(code) || 0;
      diseaseScores.set(code, current + 1);
    });
    
    evidence.push({
      type: 'symptom',
      value: symptom,
      weight: 0.7,
      source: 'patient_reported'
    });
  });
  
  // Normalize scores to probabilities
  const maxScore = Math.max(...Array.from(diseaseScores.values()));
  
  diseaseScores.forEach((score, code) => {
    diagnoses.push({
      code,
      name: icd10Descriptions[code] || 'Unknown',
      probability: score / maxScore * 0.8,
      category: categorizeDisease(code),
      severity: 'moderate'
    });
  });
  
  return { diagnoses, evidence };
}

function analyzeLabResults(labResults: LabResult[]): any {
  const diagnoses: Diagnosis[] = [];
  const evidence: Evidence[] = [];
  
  labResults.forEach(lab => {
    if (lab.abnormal) {
      evidence.push({
        type: 'lab_result',
        value: `${lab.test}: ${lab.value} ${lab.unit}`,
        weight: 0.9,
        source: 'laboratory'
      });
      
      // Simplified lab interpretation
      if (lab.test.toLowerCase().includes('glucose') && 
          typeof lab.value === 'number' && lab.value > 126) {
        diagnoses.push({
          code: 'E11.65',
          name: icd10Descriptions['E11.65'],
          probability: 0.8,
          category: 'endocrine',
          severity: 'moderate'
        });
      }
      
      if (lab.test.toLowerCase().includes('wbc') && 
          typeof lab.value === 'number' && lab.value > 11000) {
        diagnoses.push({
          code: 'A49.9',
          name: icd10Descriptions['A49.9'],
          probability: 0.7,
          category: 'infectious',
          severity: 'moderate'
        });
      }
    }
  });
  
  return { diagnoses, evidence };
}

function analyzeVitalSigns(vitalSigns: VitalSigns): any {
  const diagnoses: Diagnosis[] = [];
  const evidence: Evidence[] = [];
  
  // Check for fever
  if (vitalSigns.temperature && vitalSigns.temperature > 38) {
    evidence.push({
      type: 'vital_sign',
      value: `Temperature: ${vitalSigns.temperature}°C`,
      weight: 0.8,
      source: 'clinical_measurement'
    });
    
    diagnoses.push({
      code: 'R50.9',
      name: icd10Descriptions['R50.9'],
      probability: 0.9,
      category: 'symptom',
      severity: 'mild'
    });
  }
  
  // Check for hypertension
  if (vitalSigns.bloodPressure) {
    const [systolic, diastolic] = vitalSigns.bloodPressure.split('/').map(Number);
    if (systolic > 140 || diastolic > 90) {
      evidence.push({
        type: 'vital_sign',
        value: `BP: ${vitalSigns.bloodPressure}`,
        weight: 0.8,
        source: 'clinical_measurement'
      });
    }
  }
  
  // Check for tachycardia
  if (vitalSigns.heartRate && vitalSigns.heartRate > 100) {
    evidence.push({
      type: 'vital_sign',
      value: `HR: ${vitalSigns.heartRate} bpm`,
      weight: 0.7,
      source: 'clinical_measurement'
    });
  }
  
  // Check for hypoxia
  if (vitalSigns.oxygenSaturation && vitalSigns.oxygenSaturation < 95) {
    evidence.push({
      type: 'vital_sign',
      value: `SpO2: ${vitalSigns.oxygenSaturation}%`,
      weight: 0.9,
      source: 'clinical_measurement'
    });
    
    diagnoses.push({
      code: 'J18.9',
      name: icd10Descriptions['J18.9'],
      probability: 0.6,
      category: 'respiratory',
      severity: 'moderate'
    });
  }
  
  return { diagnoses, evidence };
}

function adjustForMedicalHistory(
  diagnoses: Map<string, number>,
  history: MedicalHistory[]
): void {
  history.forEach(h => {
    if (h.status === 'active' || h.status === 'chronic') {
      // Increase probability of related conditions
      if (h.condition.toLowerCase().includes('diabetes')) {
        const current = diagnoses.get('E11.65') || 0;
        diagnoses.set('E11.65', Math.min(1, current * 1.3));
      }
      
      if (h.condition.toLowerCase().includes('heart')) {
        const current = diagnoses.get('I50.9') || 0;
        diagnoses.set('I50.9', Math.min(1, current * 1.2));
      }
    }
  });
}

function categorizeDisease(icd10Code: string): string {
  const prefix = icd10Code.charAt(0);
  const categories = {
    'A': 'infectious', 'B': 'infectious',
    'C': 'neoplasm', 'D': 'blood',
    'E': 'endocrine', 'F': 'mental',
    'G': 'nervous', 'H': 'sensory',
    'I': 'circulatory', 'J': 'respiratory',
    'K': 'digestive', 'L': 'skin',
    'M': 'musculoskeletal', 'N': 'genitourinary',
    'O': 'pregnancy', 'P': 'perinatal',
    'Q': 'congenital', 'R': 'symptom',
    'S': 'injury', 'T': 'injury'
  };
  
  return categories[prefix] || 'other';
}

function calculateSeverity(
  probability: number,
  evidence: Evidence[]
): 'mild' | 'moderate' | 'severe' {
  const avgWeight = evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length;
  
  if (probability > 0.8 && avgWeight > 0.8) return 'severe';
  if (probability > 0.5 || avgWeight > 0.6) return 'moderate';
  return 'mild';
}

function determineUrgency(
  diagnoses: Diagnosis[],
  evidence: Evidence[],
  vitalSigns?: VitalSigns
): 'routine' | 'urgent' | 'emergency' {
  
  // Check for emergency conditions
  const emergencyCodes = ['I20.9', 'I21.9', 'J18.9', 'G40.9'];
  if (diagnoses.some(d => emergencyCodes.includes(d.code) && d.probability > 0.7)) {
    return 'emergency';
  }
  
  // Check vital signs for urgency
  if (vitalSigns) {
    if (vitalSigns.oxygenSaturation && vitalSigns.oxygenSaturation < 90) return 'emergency';
    if (vitalSigns.heartRate && (vitalSigns.heartRate > 150 || vitalSigns.heartRate < 40)) return 'urgent';
    if (vitalSigns.temperature && vitalSigns.temperature > 40) return 'urgent';
  }
  
  // Check for urgent conditions
  if (diagnoses.some(d => d.severity === 'severe')) return 'urgent';
  
  return 'routine';
}

function recommendTests(
  diagnoses: Diagnosis[],
  evidence: Evidence[]
): string[] {
  const tests = new Set<string>();
  
  // Always recommend basic tests if no lab results
  if (!evidence.some(e => e.type === 'lab_result')) {
    tests.add('Complete Blood Count');
    tests.add('Basic Metabolic Panel');
  }
  
  // Condition-specific tests
  diagnoses.forEach(d => {
    const category = d.category;
    
    if (category === 'cardiac' || category === 'circulatory') {
      tests.add('Electrocardiogram');
      tests.add('Troponin');
      tests.add('BNP');
    }
    
    if (category === 'respiratory') {
      tests.add('Chest X-Ray');
      tests.add('Arterial Blood Gas');
    }
    
    if (category === 'infectious') {
      tests.add('Blood Culture');
      tests.add('Urinalysis');
    }
    
    if (category === 'endocrine') {
      tests.add('Hemoglobin A1C');
      tests.add('Thyroid Function Tests');
    }
  });
  
  return Array.from(tests).slice(0, 5);
}

function calculateConfidence(
  evidence: Evidence[],
  diagnoses: Diagnosis[]
): number {
  if (evidence.length === 0) return 0.3;
  
  const avgEvidence = evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length;
  const topDiagnosisProb = diagnoses[0]?.probability || 0;
  
  return Math.min(0.95, (avgEvidence + topDiagnosisProb) / 2);
}

function generateReasoning(
  diagnoses: Diagnosis[],
  evidence: Evidence[]
): string {
  const symptomEvidence = evidence.filter(e => e.type === 'symptom');
  const labEvidence = evidence.filter(e => e.type === 'lab_result');
  const vitalEvidence = evidence.filter(e => e.type === 'vital_sign');
  
  let reasoning = `Analysis based on ${evidence.length} clinical findings: `;
  
  if (symptomEvidence.length > 0) {
    reasoning += `${symptomEvidence.length} symptoms, `;
  }
  
  if (labEvidence.length > 0) {
    reasoning += `${labEvidence.length} abnormal lab results, `;
  }
  
  if (vitalEvidence.length > 0) {
    reasoning += `${vitalEvidence.length} vital sign abnormalities. `;
  }
  
  if (diagnoses.length > 0) {
    reasoning += `Primary consideration: ${diagnoses[0].name} (${Math.round(diagnoses[0].probability * 100)}% probability).`;
  }
  
  return reasoning;
}

async function storeAnalysis(consensusId: string, data: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.CONSENSUS_TABLE!,
      Item: {
        consensusId: { S: consensusId },
        nodeId: { S: `diagnosis-analyzer-${Date.now()}` },
        analysis: { S: JSON.stringify(data) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 7).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to store analysis:', error);
  }
}

async function reportWorkerHealth(nodeId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/Clinical',
      MetricData: [{
        MetricName: 'WorkerHealth',
        Value: 1,
        Unit: 'None',
        Dimensions: [
          { Name: 'WorkerType', Value: 'diagnosis-analyzer' },
          { Name: 'NodeId', Value: nodeId }
        ],
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
      Namespace: 'Serenity/Clinical',
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
  nodeId: string
): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/Clinical',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'WorkerType', Value: 'diagnosis-analyzer' },
          { Name: 'NodeId', Value: nodeId }
        ],
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to report metric:', error);
  }
}