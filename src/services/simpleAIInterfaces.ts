/**
 * Simple AI Interfaces for Gradual Re-enablement
 *
 * Simplified versions of complex AI interfaces to enable gradual restoration
 */

// Simple learning momentum tracking
export interface LearningMomentum {
  score: number; // 0-1 scale
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: number;
}

// Basic cognitive load detection
export interface CognitiveLoad {
  level: 'low' | 'moderate' | 'high' | 'overload';
  confidence: number; // 0-1 scale
  indicators: string[];
}

// Simple motivation profile
export interface MotivationProfile {
  level: number; // 0-1 scale
  type: 'intrinsic' | 'extrinsic' | 'mixed';
  factors: string[];
}

// Basic learning personality classification
export interface LearningPersonality {
  type: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  confidence: number;
  preferences: string[];
}

// Simple learning coach insight
export interface LearningCoachInsight {
  type: 'difficulty_adjustment' | 'mode_suggestion' | 'pacing_recommendation' | 'motivation_boost';
  priority: 'low' | 'medium' | 'high';
  message: string;
  actionable: boolean;
  reasoning: string[];
}

// Simplified AI Learning Coach interface
export interface SimpleAILearningCoach {
  analyzeLearningMomentum(sessionData: any[]): Promise<LearningMomentum>;
  detectCognitiveLoad(responseData: any[]): Promise<CognitiveLoad>;
  assessMotivation(userData: any): Promise<MotivationProfile>;
  generateInsight(context: any): Promise<LearningCoachInsight>;
}

// Basic implementation for gradual re-enablement
export class BasicAILearningCoach implements SimpleAILearningCoach {
  async analyzeLearningMomentum(sessionData: any[]): Promise<LearningMomentum> {
    // Simple momentum calculation based on recent performance
    const recentScores = sessionData.slice(-5).map(d => d.score || 0);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length || 0;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentScores.length >= 3) {
      const first = recentScores[0];
      const last = recentScores[recentScores.length - 1];
      if (last > first + 0.1) trend = 'increasing';
      else if (last < first - 0.1) trend = 'decreasing';
    }

    return {
      score: avgScore,
      trend,
      lastUpdated: Date.now(),
    };
  }

  async detectCognitiveLoad(responseData: any[]): Promise<CognitiveLoad> {
    // Simple load detection based on response times and error rates
    const avgResponseTime =
      responseData.reduce((sum, d) => sum + (d.responseTime || 1000), 0) / responseData.length;
    const errorRate = responseData.filter(d => !d.correct).length / responseData.length;

    let level: 'low' | 'moderate' | 'high' | 'overload' = 'moderate';
    let indicators: string[] = [];

    if (avgResponseTime > 5000 || errorRate > 0.7) {
      level = 'overload';
      indicators.push('High response time', 'High error rate');
    } else if (avgResponseTime > 3000 || errorRate > 0.4) {
      level = 'high';
      indicators.push('Elevated response time', 'Moderate errors');
    } else if (avgResponseTime < 1000 && errorRate < 0.1) {
      level = 'low';
      indicators.push('Fast responses', 'Low error rate');
    }

    return {
      level,
      confidence: 0.7, // Moderate confidence for simple algorithm
      indicators,
    };
  }

  async assessMotivation(userData: any): Promise<MotivationProfile> {
    // Simple motivation assessment
    const streakLength = userData.currentStreak || 0;
    const sessionFrequency = userData.sessionsThisWeek || 0;

    let level = 0.5; // Default moderate motivation
    if (streakLength > 7) level += 0.3;
    if (sessionFrequency > 5) level += 0.2;
    level = Math.min(1, level);

    return {
      level,
      type: 'mixed',
      factors: ['streak_length', 'session_frequency'],
    };
  }

  async generateInsight(context: any): Promise<LearningCoachInsight> {
    // Simple insight generation
    const cognitiveLoad = await this.detectCognitiveLoad(context.recentResponses || []);

    if (cognitiveLoad.level === 'overload') {
      return {
        type: 'difficulty_adjustment',
        priority: 'high',
        message: 'Consider switching to multiple choice mode to reduce cognitive load',
        actionable: true,
        reasoning: ['High cognitive load detected', 'Multiple choice can help maintain momentum'],
      };
    }

    if (cognitiveLoad.level === 'low') {
      return {
        type: 'difficulty_adjustment',
        priority: 'medium',
        message: "You're doing great! Ready for more challenging words?",
        actionable: true,
        reasoning: ['Low cognitive load', 'High performance indicates readiness for challenge'],
      };
    }

    return {
      type: 'pacing_recommendation',
      priority: 'low',
      message: "You're making steady progress! Keep up the good work.",
      actionable: false,
      reasoning: ['Moderate performance', 'Steady learning pace'],
    };
  }
}

// Export singleton instance
export const simpleAILearningCoach = new BasicAILearningCoach();
