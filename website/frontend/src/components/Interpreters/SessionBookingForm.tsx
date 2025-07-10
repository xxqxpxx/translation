import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Phone, Video, User, AlertCircle, DollarSign } from 'lucide-react';

// Types from shared
interface SessionLocation {
  type: 'address' | 'online' | 'phone';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  meetingUrl?: string;
  phoneNumber?: string;
  accessInstructions?: string;
}

interface SessionRequirements {
  subjectMatter: string;
  documents?: string[];
  specialInstructions?: string;
  technicalTerminology?: string[];
  culturalConsiderations?: string;
  dresscode?: 'business' | 'casual' | 'formal';
}

interface CreateSessionRequest {
  interpreterId?: string;
  sessionType: 'in_person' | 'phone' | 'video';
  specialization: string;
  sourceLanguage: string;
  targetLanguage: string;
  scheduledStartTime: Date;
  estimatedDuration: number;
  location: SessionLocation;
  requirements?: SessionRequirements;
  recordingPermitted?: boolean;
}

interface Interpreter {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  specializations: string[];
  supportedSessionTypes: string[];
  rateStructure: {
    hourlyRate: number;
  };
  languages: Array<{
    language: string;
    level: string;
  }>;
}

interface SessionBookingFormProps {
  interpreter?: Interpreter;
  onSubmit: (data: CreateSessionRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  supportedLanguages?: Array<{ code: string; name: string }>;
}

const SESSION_TYPES = [
  {
    id: 'in_person',
    name: 'In-Person',
    description: 'Face-to-face interpretation',
    icon: User,
    baseRate: 1.0,
  },
  {
    id: 'phone',
    name: 'Phone',
    description: 'Audio-only interpretation',
    icon: Phone,
    baseRate: 0.9,
  },
  {
    id: 'video',
    name: 'Video Call',
    description: 'Remote video interpretation',
    icon: Video,
    baseRate: 0.95,
  },
];

const SPECIALIZATIONS = [
  { id: 'general', name: 'General', multiplier: 1.0 },
  { id: 'medical', name: 'Medical', multiplier: 1.5 },
  { id: 'legal', name: 'Legal', multiplier: 1.6 },
  { id: 'business', name: 'Business', multiplier: 1.2 },
  { id: 'technical', name: 'Technical', multiplier: 1.3 },
  { id: 'academic', name: 'Academic', multiplier: 1.2 },
  { id: 'government', name: 'Government', multiplier: 1.4 },
  { id: 'conference', name: 'Conference', multiplier: 1.3 },
  { id: 'community', name: 'Community', multiplier: 1.0 },
];

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
];

export const SessionBookingForm: React.FC<SessionBookingFormProps> = ({
  interpreter,
  onSubmit,
  onCancel,
  isLoading = false,
  supportedLanguages = DEFAULT_LANGUAGES,
}) => {
  const [formData, setFormData] = useState<CreateSessionRequest>({
    interpreterId: interpreter?.id,
    sessionType: 'video',
    specialization: 'general',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    scheduledStartTime: new Date(),
    estimatedDuration: 60,
    location: {
      type: 'online',
    },
    requirements: {
      subjectMatter: '',
      specialInstructions: '',
      dresscode: 'business',
    },
    recordingPermitted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // Calculate estimated cost
  useEffect(() => {
    if (interpreter) {
      const sessionType = SESSION_TYPES.find(t => t.id === formData.sessionType);
      const specialization = SPECIALIZATIONS.find(s => s.id === formData.specialization);
      
      const baseRate = interpreter.rateStructure.hourlyRate;
      const sessionMultiplier = sessionType?.baseRate || 1.0;
      const specializationMultiplier = specialization?.multiplier || 1.0;
      const duration = formData.estimatedDuration / 60; // Convert minutes to hours
      
      const cost = baseRate * sessionMultiplier * specializationMultiplier * duration;
      setEstimatedCost(cost);
    }
  }, [interpreter, formData.sessionType, formData.specialization, formData.estimatedDuration]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CreateSessionRequest] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear field error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduledStartTime || new Date(formData.scheduledStartTime) <= new Date()) {
      newErrors.scheduledStartTime = 'Session must be scheduled for the future';
    }

    if (formData.estimatedDuration < 30) {
      newErrors.estimatedDuration = 'Minimum session duration is 30 minutes';
    }

    if (formData.sourceLanguage === formData.targetLanguage) {
      newErrors.targetLanguage = 'Source and target languages must be different';
    }

    if (!formData.requirements?.subjectMatter?.trim()) {
      newErrors.subjectMatter = 'Subject matter is required';
    }

    // Location-specific validation
    if (formData.sessionType === 'in_person') {
      if (!formData.location.address?.trim()) {
        newErrors.address = 'Address is required for in-person sessions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Minimum 1 hour advance notice
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Book Interpretation Session</h2>
        {interpreter && (
          <p className="text-gray-600 mt-1">
            with {interpreter.user.firstName} {interpreter.user.lastName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Session Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Session Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SESSION_TYPES.filter(type => 
              !interpreter || interpreter.supportedSessionTypes.includes(type.id)
            ).map((type) => {
              const IconComponent = type.icon;
              return (
                <div
                  key={type.id}
                  className={`relative cursor-pointer rounded-lg border p-4 focus:outline-none ${
                    formData.sessionType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleInputChange('sessionType', type.id)}
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="radio"
                      name="sessionType"
                      value={type.id}
                      checked={formData.sessionType === type.id}
                      onChange={() => handleInputChange('sessionType', type.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-xs text-gray-500">
                      {type.baseRate !== 1.0 && `${type.baseRate > 1 ? '+' : ''}${((type.baseRate - 1) * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center space-x-3">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{type.name}</p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Language
            </label>
            <select
              value={formData.sourceLanguage}
              onChange={(e) => handleInputChange('sourceLanguage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Language
            </label>
            <select
              value={formData.targetLanguage}
              onChange={(e) => handleInputChange('targetLanguage', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.targetLanguage ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            {errors.targetLanguage && <p className="mt-1 text-sm text-red-600">{errors.targetLanguage}</p>}
          </div>
        </div>

        {/* Specialization */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Specialization
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {SPECIALIZATIONS.filter(spec => 
              !interpreter || interpreter.specializations.includes(spec.id)
            ).map((spec) => (
              <div
                key={spec.id}
                className={`relative cursor-pointer rounded-lg border p-3 focus:outline-none ${
                  formData.specialization === spec.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleInputChange('specialization', spec.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="specialization"
                    value={spec.id}
                    checked={formData.specialization === spec.id}
                    onChange={() => handleInputChange('specialization', spec.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  {spec.multiplier !== 1.0 && (
                    <span className="text-xs text-gray-500">
                      +{((spec.multiplier - 1) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">{spec.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledStartTime.toISOString().slice(0, 16)}
              onChange={(e) => handleInputChange('scheduledStartTime', new Date(e.target.value))}
              min={getMinDateTime()}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.scheduledStartTime ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.scheduledStartTime && <p className="mt-1 text-sm text-red-600">{errors.scheduledStartTime}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={formData.estimatedDuration}
              onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
            {errors.estimatedDuration && <p className="mt-1 text-sm text-red-600">{errors.estimatedDuration}</p>}
          </div>
        </div>

        {/* Location */}
        {formData.sessionType === 'in_person' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Street Address"
                value={formData.location.address || ''}
                onChange={(e) => handleInputChange('location.address', e.target.value)}
                className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <input
                type="text"
                placeholder="City"
                value={formData.location.city || ''}
                onChange={(e) => handleInputChange('location.city', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
          </div>
        )}

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Matter *
          </label>
          <input
            type="text"
            placeholder="e.g., Medical consultation, Legal deposition, Business meeting"
            value={formData.requirements?.subjectMatter || ''}
            onChange={(e) => handleInputChange('requirements.subjectMatter', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.subjectMatter ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.subjectMatter && <p className="mt-1 text-sm text-red-600">{errors.subjectMatter}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Any specific requirements, terminology, or context the interpreter should know..."
            value={formData.requirements?.specialInstructions || ''}
            onChange={(e) => handleInputChange('requirements.specialInstructions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="recordingPermitted"
              checked={formData.recordingPermitted || false}
              onChange={(e) => handleInputChange('recordingPermitted', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="recordingPermitted" className="ml-2 text-sm text-gray-700">
              Recording permitted (if supported)
            </label>
          </div>
        </div>

        {/* Cost Estimate */}
        {interpreter && estimatedCost > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Estimated Cost</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">Total Cost</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(estimatedCost)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Hourly Rate</p>
                <p className="text-lg font-semibold text-blue-900">{formatCurrency(interpreter.rateStructure.hourlyRate)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Duration</p>
                <p className="text-lg font-semibold text-blue-900">{formData.estimatedDuration} minutes</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Booking...' : 'Book Session'}
          </button>
        </div>
      </form>
    </div>
  );
}; 