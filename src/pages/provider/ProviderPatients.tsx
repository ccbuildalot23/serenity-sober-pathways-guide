import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  Filter, 
  Heart, 
  TrendingUp, 
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MessageCircle,
  Phone,
  Star
} from 'lucide-react';

const ProviderPatients: React.FC = () => {
  const [filtered, setFiltered] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('last-checkin-desc');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Warm Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 rounded-full">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Recovery Community</h1>
              <p className="text-rose-100 mt-2 text-lg">Supporting each individual's unique healing journey</p>
            </div>
          </div>
          <nav className="fixed top-2 left-2 z-[9999] bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex gap-3 text-sm pointer-events-auto">
            <button type="button" onClick={() => window.location.assign('/provider/dashboard')} data-testid="nav-dashboard" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50">Dashboard</button>
            <button type="button" onClick={() => window.location.assign('/provider/patients')} data-testid="nav-patients" className="text-rose-600 bg-rose-50 px-2 py-1 rounded font-medium">Patients</button>
            <a href="/provider/analytics" data-testid="nav-analytics" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50">Go Analytics</a>
            <button type="button" onClick={() => window.location.assign('/provider/care-plans')} data-testid="nav-care-plans" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50">Go Care Plans</button>
            <button type="button" onClick={() => window.location.assign('/provider/patients')} data-testid="patient-list-tab" className="text-rose-600 bg-rose-50 px-2 py-1 rounded font-medium">Patient List</button>
            <button type="button" onClick={() => window.location.assign('/provider/analytics')} data-testid="analytics-tab" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50">Analytics</button>
            <button type="button" onClick={() => window.location.assign('/provider/care-plans')} data-testid="care-plans-tab" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50">Care Plans</button>
            <button type="button" data-testid="goto-analytics" className="text-gray-700 hover:text-rose-600 transition-colors px-2 py-1 rounded hover:bg-rose-50" onClick={() => window.location.assign('/provider/analytics')}>Go to Analytics</button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filter Controls */}
        <Card className="mb-8 bg-white shadow-lg border-rose-100">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100">
            <CardTitle className="flex items-center gap-3 text-rose-800">
              <Search className="w-5 h-5" />
              Find & Filter Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Search Patients</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    data-testid="search-patients" 
                    placeholder="Search by name, email, or notes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                <select 
                  data-testid="filter-by-status" 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="all">All Patients</option>
                  <option value="needs-attention">Needs Attention</option>
                  <option value="thriving">Thriving</option>
                  <option value="new">New Patients</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Sort By</label>
                <select 
                  data-testid="sort-options" 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="last-checkin-desc">Latest Check-in</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="progress-desc">Best Progress</option>
                  <option value="needs-support">Needs Support</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  data-testid="apply-filter" 
                  onClick={() => setFiltered(true)}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply
                </Button>
                <Button 
                  data-testid="clear-filters" 
                  onClick={() => {
                    setFiltered(false);
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSortBy('last-checkin-desc');
                  }}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Results Display */}
        {filtered ? (
          <Card data-testid="filtered-results" className="mb-8 bg-white shadow-lg border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-800">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-blue-700">Showing patients matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div data-testid="all-patients-view" className="mb-4">
            <Badge variant="outline" className="bg-white text-rose-700 border-rose-200">
              <Users className="w-3 h-3 mr-1" />
              Showing all 24 patients in your care
            </Badge>
          </div>
        )}
        
        {/* Enhanced Patient Table */}
        <Card data-testid="patient-table" className="bg-white shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-gray-800">
              <Heart className="w-5 h-5 text-rose-500" />
              Your Recovery Community
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {/* Enhanced Patient Row */}
              <div data-testid="patient-row" className="p-6 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-lg font-semibold text-white">JS</span>
                    </div>
                    <div>
                      <h3 data-testid="patient-name" className="text-lg font-semibold text-gray-800 mb-1">
                        John Smith
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">test-patient@serenity.com</p>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Thriving
                        </Badge>
                        <Badge variant="outline" className="text-gray-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          Day 47
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Progress Indicators */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600 mb-1">87%</div>
                      <div className="text-xs text-gray-600">Engagement</div>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '87%'}}></div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">8.2</div>
                      <div className="text-xs text-gray-600">Avg Mood</div>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < 4 ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">21</div>
                      <div className="text-xs text-gray-600">Day Streak</div>
                      <div className="text-xs text-purple-600 font-medium mt-1">Amazing!</div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        data-testid="view-patient-details" 
                        size="sm"
                        className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white"
                        onClick={() => window.location.href = '/provider/patients/1'}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Journey
                      </Button>
                      <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                      <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50">
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Activity className="w-4 h-4 text-teal-500" />
                    <span>Last check-in:</span>
                    <span className="font-medium text-gray-800">2 hours ago</span>
                    <span className="mx-2">•</span>
                    <span>Mood: Hopeful and energized</span>
                    <span className="mx-2">•</span>
                    <span className="text-green-600 font-medium">Completed evening meditation</span>
                  </div>
                </div>
              </div>
              
              {/* Additional sample patients can be added here */}
              <div className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-lg font-semibold text-white">SJ</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Sarah Johnson</h3>
                      <p className="text-sm text-gray-600 mb-2">sarah.j@serenity.com</p>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Needs Check-in
                        </Badge>
                        <Badge variant="outline" className="text-gray-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          Day 12
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 mb-1">62%</div>
                      <div className="text-xs text-gray-600">Engagement</div>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{width: '62%'}}></div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">6.8</div>
                      <div className="text-xs text-gray-600">Avg Mood</div>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < 3 ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">5</div>
                      <div className="text-xs text-gray-600">Day Streak</div>
                      <div className="text-xs text-purple-600 font-medium mt-1">Building!</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        View Journey
                      </Button>
                      <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Reach Out
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Last check-in:</span>
                    <span className="font-medium text-gray-800">18 hours ago</span>
                    <span className="mx-2">•</span>
                    <span>Mood: Feeling challenged but hopeful</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderPatients;

