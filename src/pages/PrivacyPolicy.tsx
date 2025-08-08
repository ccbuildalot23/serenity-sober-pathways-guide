import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            <p>Effective Date: August 6, 2025</p>
            <p>Last Updated: August 6, 2025</p>
          </div>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Commitment to Your Privacy</h2>
              <p className="text-gray-700">
                Serenity ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal health information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mental health and recovery support platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">HIPAA Compliance</h2>
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900">We are HIPAA Compliant</p>
                    <p className="text-blue-800 text-sm mt-1">
                      As a healthcare technology platform, we comply with the Health Insurance Portability and Accountability Act (HIPAA) 
                      and treat your health information as Protected Health Information (PHI).
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Name and contact information (email, phone number)</li>
                <li>Date of birth and demographic information</li>
                <li>Account credentials (username, password)</li>
                <li>Emergency contact information</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">Health Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Mental health assessments and screening results</li>
                <li>Substance use history and recovery progress</li>
                <li>Treatment plans and therapy notes</li>
                <li>Daily check-ins and mood tracking data</li>
                <li>Crisis intervention records</li>
                <li>Medication information (if provided)</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>App usage patterns and feature interactions</li>
                <li>Device information and IP addresses</li>
                <li>Location data (only when you grant permission)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">Mobile App Permissions</h3>
              <p className="text-gray-700 mb-2">Our mobile app may request the following permissions:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Camera:</strong> For profile photos and video therapy sessions (optional)</li>
                <li><strong>Location:</strong> To find nearby support groups and emergency services (optional)</li>
                <li><strong>Notifications:</strong> For medication reminders and crisis alerts (optional)</li>
                <li><strong>Storage:</strong> To save recovery resources offline (optional)</li>
                <li><strong>Phone:</strong> To enable one-tap crisis hotline calling (optional)</li>
              </ul>
              <p className="text-gray-700 mt-2 text-sm">All permissions are optional and can be managed in your device settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Treatment:</strong> To provide mental health and recovery support services</li>
                <li><strong>Crisis Response:</strong> To connect you with emergency services when needed</li>
                <li><strong>Care Coordination:</strong> To facilitate communication with your healthcare providers (with your consent)</li>
                <li><strong>Platform Improvement:</strong> To enhance our services and develop new features</li>
                <li><strong>Security:</strong> To maintain the safety and integrity of our platform</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information Sharing and Disclosure</h2>
              
              <h3 className="text-lg font-semibold mb-2">We may share your information with:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Healthcare Providers:</strong> With your explicit consent</li>
                <li><strong>Emergency Services:</strong> In crisis situations to protect your safety</li>
                <li><strong>Legal Authorities:</strong> When required by law or court order</li>
                <li><strong>Business Associates:</strong> HIPAA-compliant service providers who assist our operations</li>
              </ul>

              <Card className="p-4 bg-red-50 border-red-200 mt-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold text-red-900">We Never Sell Your Data</p>
                    <p className="text-red-800 text-sm mt-1">
                      We will never sell, rent, or share your personal health information for marketing purposes.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">We implement industry-standard security measures including:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>End-to-end encryption for all data transmission</li>
                <li>Encrypted storage of all personal health information</li>
                <li>Multi-factor authentication options</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Strict access controls and audit logging</li>
                <li>Business Associate Agreements with all third-party providers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">Under HIPAA and applicable privacy laws, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Access and receive copies of your health records</li>
                <li>Request corrections to your health information</li>
                <li>Request restrictions on uses and disclosures</li>
                <li>Choose how we communicate with you</li>
                <li>Receive a list of disclosures of your health information</li>
                <li>Request deletion of your account and associated data</li>
                <li>File a complaint if you believe your privacy rights have been violated</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal health information for as long as necessary to provide our services and comply with legal obligations. 
                Medical records are retained for a minimum of 7 years in accordance with HIPAA requirements. 
                You may request deletion of your account at any time, subject to legal retention requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
              <p className="text-gray-700">
                Our services are intended for individuals 13 years and older. For users under 18, we require parental consent 
                and provide additional privacy protections in accordance with COPPA and applicable state laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">International Users</h2>
              <p className="text-gray-700">
                Our services are currently available only in the United States. All data is processed and stored within the United States 
                in compliance with U.S. healthcare privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">California Privacy Rights (CCPA)</h2>
              <p className="text-gray-700 mb-4">California residents have additional rights under the California Consumer Privacy Act (CCPA):</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Right to know what personal information we collect, use, and share</li>
                <li>Right to delete personal information (subject to healthcare record retention requirements)</li>
                <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Analytics and Crash Reporting</h2>
              <p className="text-gray-700">
                We use privacy-focused analytics to improve app performance and user experience. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
                <li>Anonymous usage statistics (no personal data)</li>
                <li>Crash reports to fix bugs and improve stability</li>
                <li>Performance metrics to optimize app speed</li>
              </ul>
              <p className="text-gray-700 mt-2">You can opt-out of analytics in the app settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically. We will notify you of any material changes via email or in-app notification. 
                Your continued use of our services after such modifications constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <Card className="p-4 bg-gray-50">
                <p className="text-gray-700">For privacy-related questions or concerns, please contact us:</p>
                <div className="mt-3 space-y-1">
                  <p className="text-gray-700"><strong>Email:</strong> privacy@serenityrecovery.app</p>
                  <p className="text-gray-700"><strong>Phone:</strong> 1-800-SERENITY</p>
                  <p className="text-gray-700"><strong>Mail:</strong> Serenity Recovery, Privacy Officer, [Address]</p>
                </div>
              </Card>
            </section>

            <section className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <p>This privacy policy is compliant with HIPAA, CCPA, and other applicable privacy regulations.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;