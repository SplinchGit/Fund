// src/services/ContentModerationService.ts

export interface ModerationResult {
  isClean: boolean;
  filteredText: string;
  flaggedWords: string[];
  severity: 'none' | 'mild' | 'severe';
  hasChanges: boolean;
}

export interface ModerationConfig {
  strictMode: boolean;
  customBadWords: string[];
  whitelistWords: string[];
  replaceCharacter: string;
}

export interface PreviewResult {
  originalText: string;
  previewText: string;
  hasChanges: boolean;
  shouldBlock: boolean;
  severity: 'none' | 'mild' | 'severe';
}

class ContentModerationService {
  private static instance: ContentModerationService;
  private config: ModerationConfig;
  private badWords: Set<string>;
  private whitelistWords: Set<string>;

  private constructor() {
    this.config = {
      strictMode: false, // Changed to false for better UX
      customBadWords: [],
      whitelistWords: [],
      replaceCharacter: '*'
    };
    
    this.initializeWordLists();
  }

  public static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  private initializeWordLists(): void {
    try {
      // Core profanity and harmful words (keeping list minimal and focused)
      const coreBadWords = [
        // Extreme profanity
        'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap',
        // Hate speech
        'nazi', 'fascist', 'terrorist',
        // Crypto scams
        'scam', 'ponzi', 'pyramid', 'rugpull', 'guaranteed returns'
      ];

      // Comprehensive whitelist to solve Scunthorpe problem
      const comprehensiveWhitelist = [
        // Geographic locations - UK
        'scunthorpe', 'essex', 'sussex', 'middlesex', 'wessex', 'penistone', 'cockburn',
        'clitheroe', 'lightwater', 'shitterton', 'hell', 'boring', 'french lick',
        
        // Common legitimate words with potential false positives
        'classic', 'classification', 'classy', 'classroom', 'clause',
        'assistance', 'assistant', 'associate', 'assumption', 'assess', 'assessment',
        'assignment', 'assemble', 'assembly', 'asset', 'assets',
        'grass', 'class', 'pass', 'bass', 'mass', 'compass', 'glasses',
        'harassment', 'embarrass', 'embarrassment',
        'analysis', 'analyst', 'therapist', 'specialist',
        'assassin', 'assassinate', 'assassination',
        
        // Business and fundraising terms
        'crypto', 'cryptocurrency', 'donation', 'fund', 'funding', 'invest', 'investment',
        'blockchain', 'bitcoin', 'ethereum', 'defi', 'nft', 'token', 'wallet',
        'campaign', 'crowdfunding', 'fundraiser', 'charity', 'nonprofit',
        'business', 'entrepreneur', 'startup', 'venture', 'capital',
        'financial', 'finance', 'economics', 'economic', 'fiscal',
        'grant', 'scholarship', 'sponsorship', 'patron', 'backer',
        
        // Technical terms
        'password', 'passphrase', 'bypass', 'compass', 'encompass',
        'expression', 'impression', 'compression', 'suppression', 'depression',
        'regression', 'progression', 'aggression', 'possession', 'obsession',
        'discussion', 'concussion', 'percussion',
        
        // Common words that might contain flagged substrings
        'button', 'butter', 'gutter', 'mutter', 'stutter', 'utter', 'flutter',
        'matter', 'pattern', 'scatter', 'chatter', 'flatter', 'latter',
        'hassle', 'tassel', 'vessel', 'russell',
        'assist', 'artist', 'forest', 'honest', 'modest', 'largest',
        'harvest', 'fastest', 'contest', 'protest', 'manifest',
        
        // Scientific and academic terms
        'organism', 'analysis', 'synthesis', 'hypothesis', 'thesis',
        'research', 'assessment', 'experiment', 'laboratory',
        'statistics', 'mathematics', 'economics', 'linguistics',
        
        // Medical terms
        'therapy', 'therapist', 'diagnosis', 'prognosis', 'analysis'
      ];

      this.badWords = new Set(coreBadWords.map(word => word.toLowerCase()));
      this.whitelistWords = new Set(comprehensiveWhitelist.map(word => word.toLowerCase()));
      
      console.log('[ContentModerationService] Word lists initialized with', this.badWords.size, 'bad words and', this.whitelistWords.size, 'whitelisted words');
    } catch (error) {
      console.error('[ContentModerationService] Error initializing word lists:', error);
      this.badWords = new Set();
      this.whitelistWords = new Set();
    }
  }

  public moderateText(text: string): ModerationResult {
    if (!text || text.trim().length === 0) {
      return {
        isClean: true,
        filteredText: text,
        flaggedWords: [],
        severity: 'none',
        hasChanges: false
      };
    }

    try {
      const originalText = text.trim();
      const result = this.filterTextWithWordBoundaries(originalText);
      
      return {
        isClean: result.flaggedWords.length === 0,
        filteredText: result.filteredText,
        flaggedWords: result.flaggedWords,
        severity: this.calculateSeverity(result.flaggedWords),
        hasChanges: result.hasChanges
      };
    } catch (error) {
      console.error('[ContentModerationService] Error moderating text:', error);
      // Fail safe - if moderation fails, allow the text but log the error
      return {
        isClean: true,
        filteredText: text,
        flaggedWords: [],
        severity: 'none',
        hasChanges: false
      };
    }
  }

  private filterTextWithWordBoundaries(text: string): {
    filteredText: string;
    flaggedWords: string[];
    hasChanges: boolean;
  } {
    let filteredText = text;
    const flaggedWords: string[] = [];
    let hasChanges = false;

    // Split text into words while preserving spaces and punctuation
    const words = text.split(/(\s+|[.,!?;:"'()[\]{}])/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      
      if (cleanWord.length === 0) continue; // Skip spaces and punctuation
      
      // Check if the whole word is whitelisted (solves Scunthorpe problem)
      if (this.whitelistWords.has(cleanWord)) {
        continue; // Skip filtering for whitelisted words
      }

      // Check if the whole word is a bad word
      if (this.badWords.has(cleanWord)) {
        flaggedWords.push(cleanWord);
        words[i] = this.replaceWithAsterisks(word);
        hasChanges = true;
        continue;
      }

      // Check for bad words as substrings, but only if not whitelisted
      for (const badWord of this.badWords) {
        if (cleanWord.includes(badWord) && badWord.length > 2) { // Only check longer bad words for substrings
          // Double-check that the containing word isn't whitelisted
          if (!this.whitelistWords.has(cleanWord)) {
            flaggedWords.push(badWord);
            // Replace the bad substring with asterisks
            const regex = new RegExp(badWord, 'gi');
            words[i] = word.replace(regex, this.replaceWithAsterisks(badWord));
            hasChanges = true;
          }
        }
      }
    }

    return {
      filteredText: words.join(''),
      flaggedWords: [...new Set(flaggedWords)], // Remove duplicates
      hasChanges
    };
  }

  private replaceWithAsterisks(word: string): string {
    // Keep first letter, replace middle with asterisks, keep last letter for longer words
    if (word.length <= 2) {
      return this.config.replaceCharacter.repeat(word.length);
    } else if (word.length <= 4) {
      return word[0] + this.config.replaceCharacter.repeat(word.length - 1);
    } else {
      return word[0] + this.config.replaceCharacter.repeat(word.length - 2) + word[word.length - 1];
    }
  }

  private calculateSeverity(flaggedWords: string[]): 'none' | 'mild' | 'severe' {
    if (flaggedWords.length === 0) return 'none';
    
    // Check for extreme content that should be blocked
    const extremeWords = ['nazi', 'fascist', 'terrorist'];
    const hasExtremeContent = flaggedWords.some(word => extremeWords.includes(word.toLowerCase()));
    
    if (hasExtremeContent) return 'severe';
    if (flaggedWords.length >= 3) return 'severe';
    return 'mild';
  }

  // New preview system for better UX
  public getContentPreview(text: string): PreviewResult {
    const result = this.moderateText(text);
    
    return {
      originalText: text,
      previewText: result.filteredText,
      hasChanges: result.hasChanges,
      shouldBlock: result.severity === 'severe' && this.config.strictMode,
      severity: result.severity
    };
  }

  public moderateCampaignData(title: string, description: string): {
    title: ModerationResult;
    description: ModerationResult;
    overallClean: boolean;
    titlePreview: PreviewResult;
    descriptionPreview: PreviewResult;
  } {
    const titleResult = this.moderateText(title);
    const descriptionResult = this.moderateText(description);
    const titlePreview = this.getContentPreview(title);
    const descriptionPreview = this.getContentPreview(description);
    
    return {
      title: titleResult,
      description: descriptionResult,
      overallClean: titleResult.isClean && descriptionResult.isClean,
      titlePreview,
      descriptionPreview
    };
  }

  public moderateComment(text: string): ModerationResult {
    return this.moderateText(text);
  }

  public updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.customBadWords) {
      this.badWords = new Set([...this.badWords, ...newConfig.customBadWords.map(w => w.toLowerCase())]);
    }
    
    if (newConfig.whitelistWords) {
      this.whitelistWords = new Set([...this.whitelistWords, ...newConfig.whitelistWords.map(w => w.toLowerCase())]);
    }
    
    console.log('[ContentModerationService] Configuration updated');
  }

  public getConfig(): ModerationConfig {
    return { ...this.config };
  }

  // New preview-based warning system
  public getPreviewMessage(preview: PreviewResult): string | null {
    if (!preview.hasChanges) return null;
    
    if (preview.shouldBlock) {
      return 'Your content contains inappropriate language that cannot be submitted. Please revise your text.';
    }
    
    switch (preview.severity) {
      case 'mild':
        return `Your message contains words that will be censored. Preview: "${preview.previewText}" - Submit as-is or edit?`;
      case 'severe':
        return `Your content contains multiple inappropriate words. Preview: "${preview.previewText}" - Please consider revising.`;
      default:
        return null;
    }
  }

  // Simplified blocking - only for extreme content
  public shouldBlockContent(result: ModerationResult): boolean {
    return result.severity === 'severe' && this.config.strictMode;
  }

  // For backwards compatibility
  public getModerationWarning(result: ModerationResult): string | null {
    if (result.isClean || !result.hasChanges) return null;
    
    const preview = this.getContentPreview(''); // We don't have original text here
    return this.getPreviewMessage({
      originalText: '',
      previewText: result.filteredText,
      hasChanges: result.hasChanges,
      shouldBlock: this.shouldBlockContent(result),
      severity: result.severity
    });
  }
}

export const contentModerationService = ContentModerationService.getInstance();