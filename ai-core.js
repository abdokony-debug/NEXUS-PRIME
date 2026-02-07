// ai-core.js - The Intelligent Core
const fs = require('fs');
const path = require('path');

class AICore {
  constructor() {
    this.intelligenceLevel = process.env.AI_INTELLIGENCE_LEVEL || 'high';
    this.learningRate = parseFloat(process.env.AI_LEARNING_RATE) || 0.85;
    this.knowledgeBase = this.loadKnowledgeBase();
    this.decisionMatrix = this.buildDecisionMatrix();
  }

  loadKnowledgeBase() {
    const kbPath = 'data/knowledge_base.json';
    
    if (fs.existsSync(kbPath)) {
      try {
        return JSON.parse(fs.readFileSync(kbPath, 'utf8'));
      } catch {
        return this.createDefaultKnowledgeBase();
      }
    }
    
    return this.createDefaultKnowledgeBase();
  }

  createDefaultKnowledgeBase() {
    return {
      patterns: {
        successful_campaigns: [],
        failed_campaigns: [],
        optimal_timing: {},
        platform_performance: {},
        regional_preferences: {}
      },
      learnings: [],
      optimizations: []
    };
  }

  buildDecisionMatrix() {
    return {
      target_selection: {
        intent_threshold: 70,
        engagement_threshold: 0.05,
        recency_days: 7,
        confidence_required: 0.75
      },
      messaging: {
        max_length: 300,
        min_length: 50,
        personalization_weight: 0.3,
        urgency_weight: 0.2,
        relevance_weight: 0.5
      },
      timing: {
        delay_base: 1500,
        delay_variance: 500,
        optimal_hours: [9, 11, 14, 16, 19, 21]
      }
    };
  }

  async analyzeTarget(target) {
    const analysis = {
      score: 0,
      factors: {},
      recommendations: [],
      confidence: 0
    };

    // Factor 1: Intent Analysis
    analysis.factors.intent = target.intentScore / 100;
    analysis.score += analysis.factors.intent * 40;

    // Factor 2: Engagement Analysis
    analysis.factors.engagement = Math.min(target.engagementRate * 10, 1);
    analysis.score += analysis.factors.engagement * 20;

    // Factor 3: Recency Analysis
    const daysSinceActive = (Date.now() - new Date(target.lastActive).getTime()) / (1000 * 3600 * 24);
    analysis.factors.recency = daysSinceActive < 3 ? 0.9 : daysSinceActive < 7 ? 0.5 : 0.2;
    analysis.score += analysis.factors.recency * 15;

    // Factor 4: Platform Analysis
    analysis.factors.platform = this.getPlatformScore(target.platform);
    analysis.score += analysis.factors.platform * 15;

    // Factor 5: Regional Analysis
    analysis.factors.region = this.getRegionScore(target.region);
    analysis.score += analysis.factors.region * 10;

    // Calculate confidence
    analysis.confidence = this.calculateConfidence(analysis.factors);

    // Generate recommendations
    if (analysis.factors.intent < 0.7) {
      analysis.recommendations.push('Low intent - consider secondary approach');
    }
    if (analysis.factors.recency < 0.5) {
      analysis.recommendations.push('Target inactive - lower priority');
    }

    return analysis;
  }

  getPlatformScore(platform) {
    const platformScores = {
      reddit: 0.9,
      twitter: 0.8,
      linkedin: 0.85,
      instagram: 0.75,
      pinterest: 0.7,
      facebook: 0.65
    };
    return platformScores[platform] || 0.6;
  }

  getRegionScore(region) {
    const regionScores = {
      europe: 0.9,
      usa: 0.95,
      middle_east: 0.8,
      asia: 0.85,
      global: 0.7
    };
    return regionScores[region] || 0.7;
  }

  calculateConfidence(factors) {
    const weights = {
      intent: 0.4,
      engagement: 0.2,
      recency: 0.2,
      platform: 0.1,
      region: 0.1
    };

    let confidence = 0;
    Object.keys(weights).forEach(factor => {
      confidence += (factors[factor] || 0) * weights[factor];
    });

    return Math.min(Math.max(confidence, 0), 1);
  }

  async makeDecision(context, options) {
    const decision = {
      action: null,
      confidence: 0,
      reasoning: [],
      alternatives: []
    };

    // AI decision logic
    if (context.type === 'target_contact') {
      const analysis = await this.analyzeTarget(context.target);
      
      if (analysis.confidence >= this.decisionMatrix.target_selection.confidence_required) {
        decision.action = 'contact';
        decision.confidence = analysis.confidence;
        decision.reasoning = analysis.recommendations;
      } else {
        decision.action = 'skip';
        decision.confidence = 1 - analysis.confidence;
        decision.reasoning = ['Low AI confidence score'];
      }
    } else if (context.type === 'message_strategy') {
      decision.action = this.selectMessageStrategy(context);
      decision.confidence = 0.85;
    }

    return decision;
  }

  selectMessageStrategy(context) {
    const strategies = {
      direct: { weight: 0.3 },
      value_first: { weight: 0.4 },
      question_based: { weight: 0.2 },
      social_proof: { weight: 0.1 }
    };

    // AI selects strategy based on context
    if (context.platform === 'linkedin') return 'value_first';
    if (context.platform === 'reddit') return 'question_based';
    if (context.intent > 85) return 'direct';
    
    return 'value_first';
  }

  learnFromResult(result) {
    const learning = {
      timestamp: new Date().toISOString(),
      result: result.success,
      context: result.context,
      confidence_before: result.confidence_before,
      confidence_after: result.confidence_after,
      insights: []
    };

    // Extract insights
    if (result.success) {
      learning.insights.push('Strategy successful');
      this.adjustWeights('positive', result.context);
    } else {
      learning.insights.push('Strategy needs adjustment');
      this.adjustWeights('negative', result.context);
    }

    // Store learning
    this.knowledgeBase.learnings.push(learning);
    this.saveKnowledgeBase();
  }

  adjustWeights(outcome, context) {
    const adjustment = outcome === 'positive' ? 0.05 : -0.03;
    
    // Adjust decision matrix based on outcome
    if (context.platform) {
      if (!this.knowledgeBase.patterns.platform_performance[context.platform]) {
        this.knowledgeBase.patterns.platform_performance[context.platform] = { successes: 0, failures: 0 };
      }
      
      if (outcome === 'positive') {
        this.knowledgeBase.patterns.platform_performance[context.platform].successes++;
      } else {
        this.knowledgeBase.patterns.platform_performance[context.platform].failures++;
      }
    }

    this.saveKnowledgeBase();
  }

  saveKnowledgeBase() {
    const kbDir = 'data';
    if (!fs.existsSync(kbDir)) {
      fs.mkdirSync(kbDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(kbDir, 'knowledge_base.json'),
      JSON.stringify(this.knowledgeBase, null, 2)
    );
  }

  getOptimizationSuggestions() {
    const suggestions = [];
    
    // Analyze patterns
    const totalLearnings = this.knowledgeBase.learnings.length;
    if (totalLearnings > 10) {
      const successRate = this.knowledgeBase.learnings.filter(l => l.result).length / totalLearnings;
      
      if (successRate < 0.5) {
        suggestions.push('Consider increasing intent threshold');
      }
      
      if (successRate > 0.8) {
        suggestions.push('Consider expanding target criteria');
      }
    }

    // Platform optimization
    Object.entries(this.knowledgeBase.patterns.platform_performance).forEach(([platform, stats]) => {
      const platformSuccessRate = stats.successes / (stats.successes + stats.failures);
      if (platformSuccessRate < 0.4) {
        suggestions.push(`Review ${platform} strategy`);
      }
    });

    return suggestions;
  }
}

module.exports = AICore;
