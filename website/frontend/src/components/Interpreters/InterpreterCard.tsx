import React from 'react';
import { Star, Clock, Shield, Languages, Calendar } from 'lucide-react';

interface LanguageProficiency {
  language: string;
  level: 'native' | 'fluent' | 'professional' | 'intermediate';
}

interface Interpreter {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'active' | 'inactive' | 'pending_approval' | 'suspended';
  languages: LanguageProficiency[];
  specializations: string[];
  supportedSessionTypes: string[];
  rateStructure: {
    hourlyRate: number;
  };
  currentAvailabilityStatus: 'available' | 'busy' | 'break' | 'offline';
  bio?: string;
  totalSessionsCompleted: number;
  averageRating: number;
  totalRatings: number;
  isVerified: boolean;
  backgroundCheckCompleted: boolean;
}

interface InterpreterCardProps {
  interpreter: Interpreter;
  onViewProfile?: (interpreterId: string) => void;
  onBookSession?: (interpreterId: string) => void;
  showBookButton?: boolean;
  compact?: boolean;
}

export const InterpreterCard: React.FC<InterpreterCardProps> = ({
  interpreter,
  onViewProfile,
  onBookSession,
  showBookButton = true,
  compact = false,
}) => {
  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'busy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'break':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSpecializationColor = (spec: string) => {
    const colors: Record<string, string> = {
      medical: 'bg-red-50 text-red-700 border-red-200',
      legal: 'bg-blue-50 text-blue-700 border-blue-200',
      business: 'bg-green-50 text-green-700 border-green-200',
      technical: 'bg-purple-50 text-purple-700 border-purple-200',
      academic: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      government: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      conference: 'bg-pink-50 text-pink-700 border-pink-200',
      community: 'bg-teal-50 text-teal-700 border-teal-200',
      general: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return colors[spec] || colors.general;
  };

  const formatLanguages = (languages: LanguageProficiency[]) => {
    return languages
      .slice(0, 3)
      .map(lang => lang.language.toUpperCase())
      .join(', ') + (languages.length > 3 ? ` +${languages.length - 3}` : '');
  };

  const formatSessionTypes = (types: string[]) => {
    const typeLabels: Record<string, string> = {
      in_person: 'In-Person',
      phone: 'Phone',
      video: 'Video',
    };
    return types.map(type => typeLabels[type] || type).join(', ');
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {interpreter.user.firstName[0]}{interpreter.user.lastName[0]}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {interpreter.user.firstName} {interpreter.user.lastName}
                {interpreter.isVerified && (
                  <Shield className="inline w-4 h-4 text-blue-500 ml-1" />
                )}
              </h3>
              <p className="text-sm text-gray-500">
                {formatLanguages(interpreter.languages)}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(interpreter.currentAvailabilityStatus)}`}>
            {interpreter.currentAvailabilityStatus}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>{interpreter.averageRating.toFixed(1)}</span>
              <span>({interpreter.totalRatings})</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{interpreter.totalSessionsCompleted} sessions</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              ${interpreter.rateStructure.hourlyRate}/hr
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-xl">
                {interpreter.user.firstName[0]}{interpreter.user.lastName[0]}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                {interpreter.user.firstName} {interpreter.user.lastName}
                {interpreter.isVerified && (
                  <Shield className="w-5 h-5 text-blue-500 ml-2" />
                )}
                {interpreter.backgroundCheckCompleted && (
                  <Shield className="w-5 h-5 text-green-500 ml-1" />
                )}
              </h3>
              <div className="flex items-center space-x-3 mt-1">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">{interpreter.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({interpreter.totalRatings} reviews)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{interpreter.totalSessionsCompleted} sessions completed</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getAvailabilityColor(interpreter.currentAvailabilityStatus)}`}>
              {interpreter.currentAvailabilityStatus}
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${interpreter.rateStructure.hourlyRate}
              <span className="text-sm font-normal text-gray-500">/hour</span>
            </p>
          </div>
        </div>

        {interpreter.bio && (
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            {interpreter.bio.length > 150 ? `${interpreter.bio.substring(0, 150)}...` : interpreter.bio}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Languages */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Languages className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Languages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interpreter.languages.map((lang, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                {lang.language.toUpperCase()}
                <span className="ml-1 text-blue-500">({lang.level})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Specializations */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Specializations</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interpreter.specializations.map((spec, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getSpecializationColor(spec)}`}
              >
                {spec.charAt(0).toUpperCase() + spec.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Session Types */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Available Session Types</span>
          </div>
          <p className="text-sm text-gray-600">{formatSessionTypes(interpreter.supportedSessionTypes)}</p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => onViewProfile?.(interpreter.id)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            View Profile
          </button>
          {showBookButton && interpreter.currentAvailabilityStatus === 'available' && (
            <button
              onClick={() => onBookSession?.(interpreter.id)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Book Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 