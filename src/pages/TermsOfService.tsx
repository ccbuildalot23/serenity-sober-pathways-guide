import React from 'react';
import { FileText, AlertTriangle, Heart, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            <p>Effective Date: August 6, 2024</p>
            <p>Last Updated: August 6, 2024</p>
          </div>

          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important Medical Disclaimer:</strong> Serenity is not a substitute for professional medical advice, diagnosis, or treatment. 
              Always seek the advice of your physician or qualified healthcare provider with any questions regarding a medical condition. 
              If you are experiencing a medical emergency, call 911 immediately.
            </AlertDescription>
          </Alert>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing or using Serenity ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, please do not use our Service. These Terms apply to all users, 
                including patients, healthcare providers, and support members.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">Serenity provides:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Mental health and substance abuse recovery support tools</li>
                <li>Crisis intervention resources and emergency contact features</li>
                <li>Evidence-based therapy tools including CBT exercises</li>
                <li>Peer support community features</li>
                <li>Healthcare provider dashboards and patient management tools</li>
                <li>Progress tracking and recovery planning resources</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Medical Disclaimer and Limitations</h2>
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold text-red-900">Not Emergency Medical Services</p>
                    <ul className="text-red-800 text-sm mt-2 space-y-1">
                      <li>• Serenity is NOT a crisis hotline or emergency service</li>
                      <li>• For emergencies, call 911 or go to your nearest emergency room</li>
                      <li>• For crisis support, call 988 (Suicide & Crisis Lifeline)</li>
                      <li>• Our crisis features are support tools, not replacements for emergency services</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <div className="mt-4 space-y-3 text-gray-700">
                <p><strong>The Service does not provide:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Medical diagnoses or treatment recommendations</li>
                  <li>Prescription medications or medication management</li>
                  <li>Licensed therapy or counseling sessions</li>
                  <li>Emergency medical intervention</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. User Accounts and Responsibilities</h2>
              
              <h3 className="text-lg font-semibold mb-2">Account Registration</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must be at least 13 years old to use the Service</li>
                <li>Users under 18 require parental consent</li>
                <li>Healthcare providers must provide valid credentials</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">Your Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Use the Service only for lawful purposes</li>
                <li>Not share your account credentials</li>
                <li>Not attempt to harm or exploit other users</li>
                <li>Provide honest information about your condition</li>
                <li>Respect the privacy and dignity of other users</li>
                <li>Report any security vulnerabilities immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Privacy and Data Protection</h2>
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900">HIPAA Compliance</p>
                    <p className="text-blue-800 text-sm mt-1">
                      We handle your health information in compliance with HIPAA and all applicable privacy laws. 
                      Please review our Privacy Policy for detailed information about data handling.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
              <p className="text-gray-700 mb-4">You may not use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate healthcare providers or other users</li>
                <li>Share false or misleading health information</li>
                <li>Attempt to access other users' accounts or data</li>
                <li>Use automated systems or bots</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Promote harmful substances or behaviors</li>
                <li>Share content that could trigger or harm vulnerable users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Peer Support Guidelines</h2>
              <p className="text-gray-700 mb-4">When using peer support features:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Remember that peers are not professional counselors</li>
                <li>Share experiences supportively and respectfully</li>
                <li>Do not provide medical advice or diagnoses</li>
                <li>Report concerning behavior immediately</li>
                <li>Maintain confidentiality of other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Healthcare Provider Terms</h2>
              <p className="text-gray-700 mb-4">Additional terms for healthcare providers:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Must maintain valid professional licenses</li>
                <li>Must comply with professional standards and ethics</li>
                <li>Are responsible for their clinical decisions</li>
                <li>Must maintain appropriate malpractice insurance</li>
                <li>Must sign Business Associate Agreement for HIPAA compliance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
              <p className="text-gray-700">
                All content, features, and functionality of the Service are owned by Serenity and are protected by copyright, 
                trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SERENITY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <p className="text-gray-700">
                Our total liability shall not exceed the amount paid by you for the Service in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless Serenity, its officers, directors, employees, and agents from any claims, 
                damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">We may terminate or suspend your account:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>For violations of these Terms</li>
                <li>For conduct harmful to other users</li>
                <li>For fraudulent or illegal activities</li>
                <li>At our discretion with notice</li>
              </ul>
              <p className="text-gray-700 mt-3">
                You may terminate your account at any time through account settings or by contacting support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these Terms periodically. We will notify you of material changes via email or in-app notification. 
                Continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
              <p className="text-gray-700">
                These Terms are governed by the laws of the United States and the State of [Your State], 
                without regard to conflict of law principles. Any disputes shall be resolved in the courts of [Your State].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
              <Card className="p-4 bg-gray-50">
                <p className="text-gray-700">For questions about these Terms, please contact us:</p>
                <div className="mt-3 space-y-1">
                  <p className="text-gray-700"><strong>Email:</strong> legal@serenityrecovery.app</p>
                  <p className="text-gray-700"><strong>Phone:</strong> 1-800-SERENITY</p>
                  <p className="text-gray-700"><strong>Mail:</strong> Serenity Recovery, Legal Department, [Address]</p>
                </div>
              </Card>
            </section>

            <section className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                By using Serenity, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;