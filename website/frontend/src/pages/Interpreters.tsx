import React, { useState, useEffect } from 'react';
import { Search, Filter, Languages } from 'lucide-react';
import { InterpreterCard } from '../components/Interpreters/InterpreterCard';
import { SessionBookingForm } from '../components/Interpreters/SessionBookingForm';

// Mock data - in real app this would come from API
const mockInterpreters = [
  {
    id: '1',
    user: {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      email: 'maria@example.com',
    },
    status: 'active' as const,
    languages: [
      { language: 'en', level: 'native' as const },
      { language: 'es', level: 'native' as const },
      { language: 'fr', level: 'professional' as const },
    ],
    specializations: ['medical', 'legal'],
    supportedSessionTypes: ['in_person', 'video', 'phone'],
    rateStructure: {
      hourlyRate: 85,
    },
    currentAvailabilityStatus: 'available' as const,
    bio: 'Certified medical and legal interpreter with 8 years of experience. Specialized in healthcare settings and legal proceedings.',
    totalSessionsCompleted: 234,
    averageRating: 4.9,
    totalRatings: 187,
    isVerified: true,
    backgroundCheckCompleted: true,
  },
  {
    id: '2',
    user: {
      firstName: 'David',
      lastName: 'Chen',
      email: 'david@example.com',
    },
    status: 'active' as const,
    languages: [
      { language: 'en', level: 'native' as const },
      { language: 'zh', level: 'native' as const },
      { language: 'ja', level: 'fluent' as const },
    ],
    specializations: ['business', 'technical', 'conference'],
    supportedSessionTypes: ['video', 'phone'],
    rateStructure: {
      hourlyRate: 75,
    },
    currentAvailabilityStatus: 'available' as const,
    bio: 'Business and technical interpreter specializing in international commerce and technology sectors.',
    totalSessionsCompleted: 156,
    averageRating: 4.8,
    totalRatings: 124,
    isVerified: true,
    backgroundCheckCompleted: true,
  },
  {
    id: '3',
    user: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@example.com',
    },
    status: 'active' as const,
    languages: [
      { language: 'en', level: 'native' as const },
      { language: 'fr', level: 'native' as const },
      { language: 'ar', level: 'professional' as const },
    ],
    specializations: ['government', 'community', 'general'],
    supportedSessionTypes: ['in_person', 'video', 'phone'],
    rateStructure: {
      hourlyRate: 70,
    },
    currentAvailabilityStatus: 'busy' as const,
    bio: 'Community interpreter with extensive experience in government and social services.',
    totalSessionsCompleted: 89,
    averageRating: 4.7,
    totalRatings: 76,
    isVerified: true,
    backgroundCheckCompleted: true,
  },
];

interface InterpreterFilters {
  search: string;
  languages: string[];
  specializations: string[];
  sessionType: string;
  availabilityStatus: string;
  minRating: number;
  maxRate: number;
  isVerified: boolean;
}

const Interpreters: React.FC = () => {
  const [filteredInterpreters, setFilteredInterpreters] = useState(mockInterpreters);
  const [filters, setFilters] = useState<InterpreterFilters>({
    search: '',
    languages: [],
    specializations: [],
    sessionType: '',
    availabilityStatus: '',
    minRating: 0,
    maxRate: 200,
    isVerified: false,
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInterpreter, setSelectedInterpreter] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Available filter options
  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' },
  ];

  const specializationOptions = [
    'medical', 'legal', 'business', 'technical', 'academic',
    'government', 'conference', 'community', 'general'
  ];

  const sessionTypeOptions = [
    { value: 'in_person', label: 'In-Person' },
    { value: 'video', label: 'Video Call' },
    { value: 'phone', label: 'Phone' },
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available' },
    { value: 'busy', label: 'Busy' },
    { value: 'break', label: 'On Break' },
    { value: 'offline', label: 'Offline' },
  ];

  // Apply filters
  useEffect(() => {
    let filtered = [...mockInterpreters];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(interpreter =>
        `${interpreter.user.firstName} ${interpreter.user.lastName}`.toLowerCase().includes(searchLower) ||
        interpreter.bio?.toLowerCase().includes(searchLower) ||
        interpreter.languages.some(lang => lang.language.toLowerCase().includes(searchLower)) ||
        interpreter.specializations.some(spec => spec.toLowerCase().includes(searchLower))
      );
    }

    // Language filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter(interpreter =>
        filters.languages.some(lang =>
          interpreter.languages.some(interpreterLang => interpreterLang.language === lang)
        )
      );
    }

    // Specialization filter
    if (filters.specializations.length > 0) {
      filtered = filtered.filter(interpreter =>
        filters.specializations.some(spec => interpreter.specializations.includes(spec))
      );
    }

    // Session type filter
    if (filters.sessionType) {
      filtered = filtered.filter(interpreter =>
        interpreter.supportedSessionTypes.includes(filters.sessionType)
      );
    }

    // Availability filter
    if (filters.availabilityStatus) {
      filtered = filtered.filter(interpreter =>
        interpreter.currentAvailabilityStatus === filters.availabilityStatus
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(interpreter =>
        interpreter.averageRating >= filters.minRating
      );
    }

    // Rate filter
    if (filters.maxRate < 200) {
      filtered = filtered.filter(interpreter =>
        interpreter.rateStructure.hourlyRate <= filters.maxRate
      );
    }

    // Verified filter
    if (filters.isVerified) {
      filtered = filtered.filter(interpreter => interpreter.isVerified);
    }

    // Sort by availability and rating
    filtered.sort((a, b) => {
      // Available interpreters first
      if (a.currentAvailabilityStatus === 'available' && b.currentAvailabilityStatus !== 'available') {
        return -1;
      }
      if (b.currentAvailabilityStatus === 'available' && a.currentAvailabilityStatus !== 'available') {
        return 1;
      }
      // Then by rating
      return b.averageRating - a.averageRating;
    });

    setFilteredInterpreters(filtered);
  }, [filters]);

  const handleFilterChange = (key: keyof InterpreterFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterChange = (key: 'languages' | 'specializations', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      languages: [],
      specializations: [],
      sessionType: '',
      availabilityStatus: '',
      minRating: 0,
      maxRate: 200,
      isVerified: false,
    });
  };

  const handleViewProfile = (interpreterId: string) => {
    const interpreter = mockInterpreters.find(i => i.id === interpreterId);
    if (interpreter) {
      setSelectedInterpreter(interpreter);
      // In real app, this would navigate to interpreter profile page
      console.log('View profile for:', interpreter.user.firstName, interpreter.user.lastName);
    }
  };

  const handleBookSession = (interpreterId: string) => {
    const interpreter = mockInterpreters.find(i => i.id === interpreterId);
    if (interpreter) {
      setSelectedInterpreter(interpreter);
      setShowBookingForm(true);
    }
  };

  const handleSessionBooking = async (sessionData: any) => {
    setIsLoading(true);
    try {
      // In real app, this would call API to create session
      console.log('Creating session:', sessionData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Session booked successfully!');
      setShowBookingForm(false);
      setSelectedInterpreter(null);
    } catch (error) {
      alert('Failed to book session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = () => {
    setShowBookingForm(false);
    setSelectedInterpreter(null);
  };

  if (showBookingForm && selectedInterpreter) {
    return (
      <SessionBookingForm
        interpreter={selectedInterpreter}
        onSubmit={handleSessionBooking}
        onCancel={handleCancelBooking}
        isLoading={isLoading}
        supportedLanguages={languageOptions}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Interpreters</h1>
          <p className="text-gray-600 mt-1">
            Browse our network of professional interpreters
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredInterpreters.length} of {mockInterpreters.length} interpreters
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Search Bar */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search interpreters by name, language, or specialization..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-md transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {languageOptions.map(lang => (
                    <label key={lang.code} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.languages.includes(lang.code)}
                        onChange={() => handleArrayFilterChange('languages', lang.code)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{lang.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specializations
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {specializationOptions.map(spec => (
                    <label key={spec} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.specializations.includes(spec)}
                        onChange={() => handleArrayFilterChange('specializations', spec)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type
                </label>
                <select
                  value={filters.sessionType}
                  onChange={(e) => handleFilterChange('sessionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Types</option>
                  {sessionTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability
                </label>
                <select
                  value={filters.availabilityStatus}
                  onChange={(e) => handleFilterChange('availabilityStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Status</option>
                  {availabilityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Hourly Rate ($)
                </label>
                <select
                  value={filters.maxRate}
                  onChange={(e) => handleFilterChange('maxRate', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={200}>No Limit</option>
                  <option value={100}>Under $100</option>
                  <option value={80}>Under $80</option>
                  <option value={60}>Under $60</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isVerified}
                    onChange={(e) => handleFilterChange('isVerified', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified Only</span>
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInterpreters.map(interpreter => (
          <InterpreterCard
            key={interpreter.id}
            interpreter={interpreter}
            onViewProfile={handleViewProfile}
            onBookSession={handleBookSession}
            showBookButton={true}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredInterpreters.length === 0 && (
        <div className="text-center py-12">
          <Languages className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No interpreters found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search criteria
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Interpreters; 