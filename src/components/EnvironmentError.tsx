import { AlertCircle, Settings, ExternalLink } from 'lucide-react';

export function EnvironmentError() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
          Configuration Required
        </h1>
        
        <p className="text-center text-gray-600 mb-8">
          The application needs to be configured with database credentials to function properly.
        </p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>For site administrators:</strong> Please set the required environment variables in your Vercel dashboard.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Required Environment Variables:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">VITE_SUPABASE_URL</code></li>
            <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How to fix this:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
            <li>Go to your Vercel dashboard</li>
            <li>Navigate to Project Settings → Environment Variables</li>
            <li>Add the required Supabase credentials</li>
            <li>Redeploy the application</li>
          </ol>
        </div>
        
        <div className="mt-6 flex justify-center">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Vercel Dashboard
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          If you need assistance, please contact your system administrator.
        </div>
      </div>
    </div>
  );
}