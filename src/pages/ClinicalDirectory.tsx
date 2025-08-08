
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertCircle, Heart, Phone, Plus, Users, BarChart } from 'lucide-react';
import { ProviderCard } from '@/components/clinical/ProviderCard';
import { EnhancedProviderCard } from '@/components/providers/EnhancedProviderCard';
import { ProviderSearchFilters } from '@/components/providers/ProviderSearchFilters';
import { ProviderComparisonTool } from '@/components/providers/ProviderComparisonTool';
import { ConnectionRequestManager } from '@/components/providers/ConnectionRequestManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderService } from '@/services/providerService';
import type { Provider, ProviderSearchFilters as FilterType } from '@/types/provider';
import { sampleClinicians } from '@/data/sampleClinicians';

export default function ClinicalDirectory() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(_true);
  const [_filters, setFilters] = useState<FilterType>({
    searchTerm: '',
    state: '',
    specialty: '',
    insurance: '',
    tags: [],
    acceptingNewPatients: _false,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [showFilters, setShowFilters] = useState(_false);
  const [savedProviders, setSavedProviders] = useState<string[]>([]);
  const [comparisonProviders, setComparisonProviders] = useState<Provider[]>([]);
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    loadProviders();
    loadSavedProviders();
  }, [_filters]);

  const loadProviders = async () => {
    try {
      setLoading(_true);
      const data = await ProviderService.searchProviders(_filters);
      setProviders(data);
    } catch (_error) {
      console._error('Failed to load providers:', _error);
      // Fallback to sample data
      setProviders(sampleClinicians as any);
    } finally {
      setLoading(_false);
    }
  };

  const loadSavedProviders = async () => {
    try {
      const saved = await ProviderService.getSavedProviders();
      setSavedProviders(saved.map(p => p.id));
    } catch (_error) {
      // Fallback to localStorage
      const saved = localStorage.getItem('savedClinicians');
      setSavedProviders(saved ? JSON.parse(saved) : []);
    }
  };

  const handleSaveProvider = async (id: string) => {
    try {
      const isSaved = await ProviderService.toggleSavedProvider(id);
      setSavedProviders(prev => 
        isSaved ? [...prev, id] : prev.filter(p => p !== id)
      );
    } catch (_error) {
      // Fallback to localStorage
      setSavedProviders(prev => {
        const updated = prev.includes(id) 
          ? prev.filter(p => p !== id)
          : [...prev, id];
        localStorage.setItem('savedClinicians', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleAddToComparison = (provider: Provider) => {
    if (comparisonProviders.length >= 3) {
      return; // Max 3 providers for comparison
    }
    if (!comparisonProviders.find(p => p.id === provider.id)) {
      setComparisonProviders(prev => [...prev, provider]);
    }
  };

  const handleRemoveFromComparison = (providerId: string) => {
    setComparisonProviders(prev => prev.filter(p => p.id !== providerId));
  };

  const handleClearComparison = () => {
    setComparisonProviders([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Clinical Resources Directory
              </h1>
              <p className="mt-2 text-muted-foreground">
                Connect with specialized professionals who understand your journey
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/support" className="text-primary hover:underline">
                ← Back to Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <p className="text-foreground text-lg">
              You are not alone. These professionals are here to support your healing journey.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Saved ({savedProviders.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Compare ({comparisonProviders.length})
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <ProviderSearchFilters
              _filters={_filters}
              onFiltersChange={setFilters}
              resultsCount={providers.length}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {providers.length > 0 ? (
                  providers.map(provider => (
                    <div key={provider.id} className="relative">
                      <EnhancedProviderCard
                        provider={provider}
                        onSave={handleSaveProvider}
                        isSaved={savedProviders.includes(provider.id)}
                      />
                      {comparisonProviders.length < 3 && !comparisonProviders.find(p => p.id === provider.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddToComparison(provider)}
                          className="absolute top-4 right-4"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Compare
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No providers found matching your criteria. Try adjusting your _filters.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Saved Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedProviders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4" />
                    <p>No saved providers yet.</p>
                    <p className="text-sm">Save providers from the search tab to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {providers.filter(p => savedProviders.includes(p.id)).map(provider => (
                      <EnhancedProviderCard
                        key={provider.id}
                        provider={provider}
                        onSave={handleSaveProvider}
                        isSaved={_true}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <ProviderComparisonTool
              providers={comparisonProviders}
              onRemoveProvider={handleRemoveFromComparison}
              onClearAll={handleClearComparison}
            />
          </TabsContent>

          <TabsContent value="connections" className="space-y-6">
            <ConnectionRequestManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Emergency Resources Footer */}
      <div className="mt-12 mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Need Immediate Help?
              </h3>
              <p className="text-red-800 dark:text-red-200 mb-3">
                If you're experiencing a crisis or emergency, please reach out for immediate support:
              </p>
              <div className="space-y-2">
                <a 
                  href="tel:988" 
                  className="inline-flex items-center gap-2 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium"
                >
                  <Phone className="w-4 h-4" />
                  988 Suicide & Crisis Lifeline
                </a>
                <br />
                <a 
                  href="tel:1-800-662-4357" 
                  className="inline-flex items-center gap-2 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
                >
                  <Phone className="w-4 h-4" />
                  SAMHSA National Helpline: 1-800-662-HELP (4357)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
