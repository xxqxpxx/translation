import { Injectable } from '@nestjs/common';
import { TranslationType, UrgencyLevel } from './entities/translation.entity';

export interface PricingRequest {
  wordCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  urgencyLevel: UrgencyLevel;
  type: TranslationType;
  requiresCertification?: boolean;
}

export interface PricingResult {
  baseRatePerWord: number;
  ratePerWord: number;
  wordCount: number;
  subtotal: number;
  urgencyMultiplier: number;
  typeMultiplier: number;
  certificationFee: number;
  totalCost: number;
  currency: string;
  breakdown: PricingBreakdown;
}

export interface PricingBreakdown {
  baseTranslation: number;
  urgencyFee: number;
  specialtyFee: number;
  certificationFee: number;
  total: number;
}

@Injectable()
export class PricingService {
  // Base rates per word in USD
  private readonly baseRates = {
    // Common language pairs (lower rates)
    common: 0.12,
    // Specialized language pairs (medium rates)  
    specialized: 0.18,
    // Rare language pairs (higher rates)
    rare: 0.25,
  };

  // Language tier classification
  private readonly languageTiers = {
    common: [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja',
    ],
    specialized: [
      'ko', 'ar', 'hi', 'th', 'vi', 'tr', 'nl', 'sv', 'da',
      'no', 'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'el',
    ],
    rare: [
      'he', 'fa', 'ur', 'bn', 'ta', 'te', 'ml', 'kn', 'gu',
      'mr', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw',
      'zu', 'af', 'sq', 'eu', 'be', 'bs', 'ca', 'cy', 'eo',
    ],
  };

  // Urgency multipliers
  private readonly urgencyMultipliers = {
    [UrgencyLevel.STANDARD]: 1.0,    // No additional charge
    [UrgencyLevel.RUSH]: 1.5,        // 50% surcharge
    [UrgencyLevel.URGENT]: 2.0,      // 100% surcharge
    [UrgencyLevel.EMERGENCY]: 3.0,   // 200% surcharge
  };

  // Translation type multipliers
  private readonly typeMultipliers = {
    [TranslationType.GENERAL]: 1.0,
    [TranslationType.DOCUMENT]: 1.1,
    [TranslationType.WEBSITE]: 1.2,
    [TranslationType.MARKETING]: 1.3,
    [TranslationType.TECHNICAL]: 1.4,
    [TranslationType.LEGAL]: 1.6,
    [TranslationType.MEDICAL]: 1.8,
    [TranslationType.ACADEMIC]: 1.3,
  };

  // Fixed fees
  private readonly certificationFee = 50.00; // USD
  private readonly minimumProjectFee = 25.00; // USD

  async calculatePrice(request: PricingRequest): Promise<PricingResult> {
    const {
      wordCount,
      sourceLanguage,
      targetLanguage,
      urgencyLevel,
      type,
      requiresCertification = false,
    } = request;

    // Determine base rate based on language pair complexity
    const baseRatePerWord = this.getBaseRate(sourceLanguage, targetLanguage);

    // Apply multipliers
    const urgencyMultiplier = this.urgencyMultipliers[urgencyLevel];
    const typeMultiplier = this.typeMultipliers[type];

    // Calculate rate per word with multipliers
    const ratePerWord = baseRatePerWord * urgencyMultiplier * typeMultiplier;

    // Calculate costs
    const baseTranslation = wordCount * baseRatePerWord;
    const urgencyFee = baseTranslation * (urgencyMultiplier - 1);
    const specialtyFee = baseTranslation * (typeMultiplier - 1);
    const certificationFeeAmount = requiresCertification ? this.certificationFee : 0;

    const subtotal = wordCount * ratePerWord;
    const totalBeforeMinimum = subtotal + certificationFeeAmount;
    
    // Apply minimum project fee
    const totalCost = Math.max(totalBeforeMinimum, this.minimumProjectFee);

    const breakdown: PricingBreakdown = {
      baseTranslation,
      urgencyFee,
      specialtyFee,
      certificationFee: certificationFeeAmount,
      total: totalCost,
    };

    return {
      baseRatePerWord,
      ratePerWord,
      wordCount,
      subtotal,
      urgencyMultiplier,
      typeMultiplier,
      certificationFee: certificationFeeAmount,
      totalCost,
      currency: 'USD',
      breakdown,
    };
  }

  async getQuote(request: PricingRequest): Promise<PricingResult> {
    return this.calculatePrice(request);
  }

  async getBulkPricing(requests: PricingRequest[]): Promise<PricingResult[]> {
    return Promise.all(requests.map(request => this.calculatePrice(request)));
  }

  getLanguagePairInfo(sourceLanguage: string, targetLanguage: string): {
    tier: string;
    baseRate: number;
    complexity: string;
  } {
    const tier = this.getLanguageTier(sourceLanguage, targetLanguage);
    const baseRate = this.baseRates[tier];
    
    let complexity: string;
    switch (tier) {
      case 'common':
        complexity = 'Standard';
        break;
      case 'specialized':
        complexity = 'Moderate';
        break;
      case 'rare':
        complexity = 'Complex';
        break;
      default:
        complexity = 'Standard';
    }

    return {
      tier,
      baseRate,
      complexity,
    };
  }

  getUrgencyInfo(urgencyLevel: UrgencyLevel): {
    multiplier: number;
    deliveryDays: number;
    description: string;
  } {
    const multiplier = this.urgencyMultipliers[urgencyLevel];
    
    let deliveryDays: number;
    let description: string;

    switch (urgencyLevel) {
      case UrgencyLevel.STANDARD:
        deliveryDays = 7;
        description = '5-7 business days';
        break;
      case UrgencyLevel.RUSH:
        deliveryDays = 3;
        description = '2-3 business days';
        break;
      case UrgencyLevel.URGENT:
        deliveryDays = 2;
        description = '24-48 hours';
        break;
      case UrgencyLevel.EMERGENCY:
        deliveryDays = 1;
        description = 'Same day delivery';
        break;
    }

    return {
      multiplier,
      deliveryDays,
      description,
    };
  }

  getTypeInfo(type: TranslationType): {
    multiplier: number;
    description: string;
    requirements: string[];
  } {
    const multiplier = this.typeMultipliers[type];
    
    const typeInfo = {
      [TranslationType.GENERAL]: {
        description: 'General content translation',
        requirements: ['Native fluency', 'Cultural awareness'],
      },
      [TranslationType.DOCUMENT]: {
        description: 'Official document translation',
        requirements: ['Document formatting', 'Accuracy verification'],
      },
      [TranslationType.WEBSITE]: {
        description: 'Website and digital content',
        requirements: ['SEO awareness', 'Cultural localization'],
      },
      [TranslationType.MARKETING]: {
        description: 'Marketing and advertising content',
        requirements: ['Creative adaptation', 'Brand consistency'],
      },
      [TranslationType.TECHNICAL]: {
        description: 'Technical manuals and specifications',
        requirements: ['Technical expertise', 'Terminology consistency'],
      },
      [TranslationType.LEGAL]: {
        description: 'Legal documents and contracts',
        requirements: ['Legal expertise', 'Certified translator', 'Accuracy guarantee'],
      },
      [TranslationType.MEDICAL]: {
        description: 'Medical and pharmaceutical content',
        requirements: ['Medical expertise', 'Certified translator', 'Confidentiality'],
      },
      [TranslationType.ACADEMIC]: {
        description: 'Academic papers and research',
        requirements: ['Subject matter expertise', 'Academic formatting'],
      },
    };

    return {
      multiplier,
      description: typeInfo[type].description,
      requirements: typeInfo[type].requirements,
    };
  }

  private getBaseRate(sourceLanguage: string, targetLanguage: string): number {
    const tier = this.getLanguageTier(sourceLanguage, targetLanguage);
    return this.baseRates[tier];
  }

  private getLanguageTier(sourceLanguage: string, targetLanguage: string): 'common' | 'specialized' | 'rare' {
    const languages = [sourceLanguage, targetLanguage];
    
    // If both languages are common, use common rate
    if (languages.every(lang => this.languageTiers.common.includes(lang))) {
      return 'common';
    }
    
    // If any language is rare, use rare rate
    if (languages.some(lang => this.languageTiers.rare.includes(lang))) {
      return 'rare';
    }
    
    // Otherwise use specialized rate
    return 'specialized';
  }

  // Admin configuration methods
  async updateBaseRates(rates: Partial<typeof this.baseRates>): Promise<void> {
    Object.assign(this.baseRates, rates);
    // In a real implementation, this would save to database
  }

  async updateUrgencyMultipliers(multipliers: Partial<typeof this.urgencyMultipliers>): Promise<void> {
    Object.assign(this.urgencyMultipliers, multipliers);
    // In a real implementation, this would save to database
  }

  async updateTypeMultipliers(multipliers: Partial<typeof this.typeMultipliers>): Promise<void> {
    Object.assign(this.typeMultipliers, multipliers);
    // In a real implementation, this would save to database
  }

  async updateFixedFees(fees: { certificationFee?: number; minimumProjectFee?: number }): Promise<void> {
    if (fees.certificationFee !== undefined) {
      Object.assign(this, { certificationFee: fees.certificationFee });
    }
    if (fees.minimumProjectFee !== undefined) {
      Object.assign(this, { minimumProjectFee: fees.minimumProjectFee });
    }
    // In a real implementation, this would save to database
  }
} 