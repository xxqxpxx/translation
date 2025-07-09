import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertCircle, DollarSign } from 'lucide-react';
import { FileDropzone } from '../FileUpload/FileDropzone';

// Types from shared - using string literal types
type TranslationType = 'document' | 'website' | 'legal' | 'medical' | 'technical' | 'marketing' | 'academic' | 'general';
type UrgencyLevel = 'standard' | 'rush' | 'urgent' | 'emergency';

interface CreateTranslationRequest {
  title: string;
  description?: string;
  type: TranslationType;
  urgencyLevel: UrgencyLevel;
  sourceLanguage: string;
  targetLanguage: string;
  specialInstructions?: string;
  requestedDeliveryDate?: Date;
  requiresCertification?: boolean;
  isConfidential?: boolean;
}

interface PricingEstimate {
  estimatedCost: number;
  currency: string;
  deliveryTime: string;
  ratePerWord: number;
}

interface TranslationRequestFormProps {
  onSubmit: (data: CreateTranslationRequest, files: File[]) => void;
  isLoading?: boolean;
  supportedLanguages?: Array<{ code: string; name: string }>;
  onPricingRequest?: (data: Partial<CreateTranslationRequest>) => Promise<PricingEstimate>;
}

const TRANSLATION_TYPES = {
  general: { name: 'General', description: 'General content translation', multiplier: 1.0 },
  document: { name: 'Document', description: 'Official document translation', multiplier: 1.1 },
  website: { name: 'Website', description: 'Website and digital content', multiplier: 1.2 },
  marketing: { name: 'Marketing', description: 'Marketing and advertising content', multiplier: 1.3 },
  technical: { name: 'Technical', description: 'Technical manuals and specifications', multiplier: 1.4 },
  academic: { name: 'Academic', description: 'Academic papers and research', multiplier: 1.3 },
  legal: { name: 'Legal', description: 'Legal documents and contracts', multiplier: 1.6 },
  medical: { name: 'Medical', description: 'Medical and pharmaceutical content', multiplier: 1.8 },
};

const URGENCY_LEVELS = {
  standard: { name: 'Standard', description: '5-7 business days', multiplier: 1.0, icon: Clock },
  rush: { name: 'Rush', description: '2-3 business days', multiplier: 1.5, icon: Clock },
  urgent: { name: 'Urgent', description: '24-48 hours', multiplier: 2.0, icon: AlertCircle },
  emergency: { name: 'Emergency', description: 'Same day delivery', multiplier: 3.0, icon: AlertCircle },
};

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
];

export const TranslationRequestForm: React.FC<TranslationRequestFormProps> = ({
  onSubmit,
  isLoading = false,
  supportedLanguages = DEFAULT_LANGUAGES,
  onPricingRequest,
}) => {
  const [formData, setFormData] = useState<CreateTranslationRequest>({
    title: '',
    description: '',
    type: 'general',
    urgencyLevel: 'standard',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    specialInstructions: '',
    requestedDeliveryDate: undefined,
    requiresCertification: false,
    isConfidential: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [estimatedWordCount, setEstimatedWordCount] = useState<number>(0);
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate pricing estimate when relevant fields change
  useEffect(() => {
    if (onPricingRequest && estimatedWordCount > 0) {
      const debounceTimer = setTimeout(async () => {
        try {
          const estimate = await onPricingRequest({
            ...formData,
            // Use estimated word count for pricing
          });
          setPricingEstimate(estimate);
        } catch (error) {
          console.error('Failed to get pricing estimate:', error);
        }
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.type, formData.urgencyLevel, formData.sourceLanguage, formData.targetLanguage, estimatedWordCount, onPricingRequest]);

  const handleInputChange = (field: keyof CreateTranslationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    
    // Estimate word count from file sizes (rough approximation)
    const totalSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    const estimatedWords = Math.round(totalSize / 6); // Rough estimate: 6 bytes per word
    setEstimatedWordCount(prev => prev + estimatedWords);
  };

  const handleFileRemove = (index: number) => {
    const removedFile = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    // Adjust estimated word count
    const estimatedWords = Math.round(removedFile.size / 6);
    setEstimatedWordCount(prev => Math.max(0, prev - estimatedWords));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.sourceLanguage === formData.targetLanguage) {
      newErrors.targetLanguage = 'Target language must be different from source language';
    }

    if (files.length === 0) {
      newErrors.files = 'At least one file is required';
    }

    if (formData.requestedDeliveryDate && new Date(formData.requestedDeliveryDate) <= new Date()) {
      newErrors.requestedDeliveryDate = 'Delivery date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData, files);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Translation</h2>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Marketing brochure translation"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide additional context about your translation project..."
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Language
            </label>
            <select
              value={formData.sourceLanguage}
              onChange={(e) => handleInputChange('sourceLanguage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

        {/* Translation Type */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Translation Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(TRANSLATION_TYPES).map(([key, type]) => (
              <div
                key={key}
                className={`relative cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.type === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleInputChange('type', key)}
              >
                <div className="flex items-center justify-between">
                  <input
                    type="radio"
                    name="type"
                    value={key}
                    checked={formData.type === key}
                    onChange={() => handleInputChange('type', key)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-xs text-gray-500">+{((type.multiplier - 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">{type.name}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency Level */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Urgency Level
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(URGENCY_LEVELS).map(([key, urgency]) => {
              const IconComponent = urgency.icon;
              return (
                <div
                  key={key}
                  className={`relative cursor-pointer rounded-lg border p-4 focus:outline-none ${
                    formData.urgencyLevel === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleInputChange('urgencyLevel', key)}
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="radio"
                      name="urgencyLevel"
                      value={key}
                      checked={formData.urgencyLevel === key}
                      onChange={() => handleInputChange('urgencyLevel', key)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-xs text-gray-500">+{((urgency.multiplier - 1) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{urgency.name}</p>
                      <p className="text-xs text-gray-500">{urgency.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload Documents *
          </label>
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            disabled={isLoading}
          />
          {errors.files && <p className="mt-2 text-sm text-red-600">{errors.files}</p>}
        </div>

        {/* Additional Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Delivery Date
            </label>
            <input
              type="date"
              value={formData.requestedDeliveryDate ? formData.requestedDeliveryDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('requestedDeliveryDate', e.target.value ? new Date(e.target.value) : undefined)}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.requestedDeliveryDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.requestedDeliveryDate && <p className="mt-1 text-sm text-red-600">{errors.requestedDeliveryDate}</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="certification"
                checked={formData.requiresCertification}
                onChange={(e) => handleInputChange('requiresCertification', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="certification" className="ml-2 flex items-center text-sm text-gray-700">
                <Shield className="w-4 h-4 mr-1" />
                Requires Certification (+$50)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="confidential"
                checked={formData.isConfidential}
                onChange={(e) => handleInputChange('isConfidential', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="confidential" className="ml-2 text-sm text-gray-700">
                Confidential Project
              </label>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions
          </label>
          <textarea
            value={formData.specialInstructions}
            onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any specific requirements, glossary terms, or style preferences..."
          />
        </div>

        {/* Pricing Estimate */}
        {pricingEstimate && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium text-blue-900">Pricing Estimate</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">Estimated Cost</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(pricingEstimate.estimatedCost, pricingEstimate.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Rate per Word</p>
                <p className="text-lg font-semibold text-blue-900">
                  {formatCurrency(pricingEstimate.ratePerWord, pricingEstimate.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Delivery Time</p>
                <p className="text-lg font-semibold text-blue-900">{pricingEstimate.deliveryTime}</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              * This is an estimate. Final pricing will be calculated after document analysis.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </form>
  );
}; 