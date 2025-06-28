
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertCircle, Heart, Phone } from 'lucide-react';
import { ProviderCard } from '@/components/clinical/ProviderCard';
import { sampleClinicians } from '@/data/sampleClinicians';

export default function ClinicalDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savedProviders, setSavedProviders] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedClinicians');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filters
  const states = [...new Set(sampleClinicians.map(c => c.location.state))].sort();
  const specialties = [...new Set(sampleClinicians.flatMap(c => c.specialties))].sort();
  const allTags = ['telehealth', 'in-person', 'sliding-scale', 'trauma-informed', 'lgbtq-friendly'];

  // Filter clinicians based on search and filters
  const filteredClinicians = useMemo(() => {
    return sampleClinicians.filter(clinician => {
      const matchesSearch = searchTerm === '' || 
        clinician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinician.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        clinician.bio?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesState = selectedState === '' || clinician.location.state === selectedState;
      const matchesSpecialty = selectedSpecialty === '' || 
        clinician.specialties.includes(selectedSpecialty);
      const matchesTags = selectedTags.length === 0 || 
        (clinician.tags && selectedTags.every(tag => clinician.tags?.includes(tag as any)));

      return matchesSearch && matchesState && matchesSpecialty && matchesTags;
    });
  }, [searchTerm, selectedState, selectedSpecialty, selectedTags]);

  const handleSaveProvider = (id: string) => {
    setSavedProviders(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id];
      localStorage.setItem('savedClinicians', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedState('');
    setSelectedSpecialty('');
    setSelectedTags([]);
    setSearchTerm('');
  };

  const activeFiltersCount = 
    (selectedState ? 1 : 0) + 
    (selectedSpecialty ? 1 : 0) + 
    selectedTags.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Clinical Resources Directory
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Connect with specialized professionals who understand your journey
              </p>
            </div>
            <Link
              to="/support"
              className="text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Support
            </Link>
          </div>
        </div>
      </div>

      {/* Motivational Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              You are not alone. These professionals are here to support your healing journey.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, specialty, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-700 text-white border-blue-700' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white text-blue-700 rounded-full text-xs font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm animate-slide-up">
              <div className="grid md:grid-cols-3 gap-6">
                {/* State Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State/Location
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* Specialty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specialty
                  </label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Specialties</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>

                {/* Tags Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Services & Features
                  </label>
                  <div className="space-y-2">
                    {allTags.map(tag => (
                      <label key={tag} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {tag.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredClinicians.length} of {sampleClinicians.length} providers
          {savedProviders.length > 0 && (
            <span className="ml-3">
              • <Heart className="inline w-4 h-4 fill-current text-emerald-600" /> {savedProviders.length} saved
            </span>
          )}
        </div>

        {/* Provider Cards */}
        <div className="mt-6 space-y-4">
          {filteredClinicians.length > 0 ? (
            filteredClinicians.map(clinician => (
              <ProviderCard
                key={clinician.id}
                clinician={clinician}
                onSave={handleSaveProvider}
                isSaved={savedProviders.includes(clinician.id)}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                No providers found matching your criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
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
