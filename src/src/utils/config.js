module.exports = {
  // إعدادات البحث
  MAX_TARGETS_PER_PRODUCT: parseInt(process.env.KONY_MAX_TARGETS_PER_PRODUCT) || 50,
  MIN_INTENT_SCORE: parseInt(process.env.KONY_MIN_INTENT_SCORE) || 70,
  DELAY_BETWEEN_MESSAGES: parseInt(process.env.KONY_DELAY_BETWEEN_MESSAGES) || 2000,
  
  // إعدادات المنصات
  PLATFORMS: {
    reddit: {
      enabled: true,
      searchUrl: 'https://www.reddit.com/search/?q=',
      intentKeywords: ['looking to buy', 'where to buy', 'need to purchase']
    },
    twitter: {
      enabled: true,
      searchUrl: 'https://twitter.com/search?q=',
      intentKeywords: ['looking for', 'need recommendations', 'where to buy']
    },
    linkedin: {
      enabled: true,
      searchUrl: 'https://www.linkedin.com/search/results/content/?keywords=',
      intentKeywords: ['recommendations for', 'looking for']
    },
    instagram: {
      enabled: true,
      searchUrl: 'https://www.instagram.com/explore/tags/',
      intentKeywords: ['shopping', 'buy', 'purchase']
    },
    pinterest: {
      enabled: true,
      searchUrl: 'https://www.pinterest.com/search/pins/?q=',
      intentKeywords: ['buy', 'shop', 'purchase']
    }
  },
  
  // قوالب الرسائل
  MESSAGE_TEMPLATES: {
    reddit: `Hey {username}! 👋

I noticed you were looking for {product_type}. I think you might love this {product_name}: {PRODUCT_URL}

It's getting great feedback from the community! Let me know what you think.`,
    
    twitter: `Hi {username}! 

Saw your tweet about {topic}. Check out this {product_name} - might be exactly what you're looking for: {PRODUCT_URL}`,
    
    linkedin: `Hello {name},

Given your interest in {interest}, this {product_name} could be a great fit: {PRODUCT_URL}`,
    
    default: `Hi there!

Noticed your interest in {keyword}. Thought you'd appreciate this {product_name}: {PRODUCT_URL}`
  },
  
  // تخطيط الشيت
  SHEET_LAYOUT: {
    PRODUCT_COLUMNS: ['A', 'B', 'C', 'D'],
    TARGET_COLUMNS: ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'],
    STATS_COLUMNS: ['T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  }
};
