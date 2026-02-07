const axios = require('axios');
const cheerio = require('cheerio');

class Searcher {
  constructor(config) {
    this.config = config;
    this.platforms = this.getPlatforms(config.platforms);
  }

  getPlatforms(selected) {
    const allPlatforms = {
      reddit: this.searchReddit.bind(this),
      twitter: this.searchTwitter.bind(this),
      linkedin: this.searchLinkedIn.bind(this),
      instagram: this.searchInstagram.bind(this),
      pinterest: this.searchPinterest.bind(this)
    };

    if (selected === 'all') {
      return allPlatforms;
    }

    return {
      [selected]: allPlatforms[selected]
    };
  }

  async findTargets(product) {
    const targets = [];
    const maxPerPlatform = Math.floor(this.config.batchSize / Object.keys(this.platforms).length);

    for (const [platform, searchFn] of Object.entries(this.platforms)) {
      try {
        const platformTargets = await searchFn(product, maxPerPlatform);
        targets.push(...platformTargets);
        
        if (targets.length >= this.config.batchSize) {
          break;
        }
        
      } catch (error) {
        console.error(`Search error on ${platform}:`, error.message);
      }
    }

    return this.filterTargets(targets);
  }

  async searchReddit(product, limit) {
    const searchQuery = this.buildSearchQuery(product.keywords, 'reddit');
    const response = await axios.get(`https://www.reddit.com/search.json?q=${encodeURIComponent(searchQuery)}&limit=${limit}`);
    
    return response.data.data.children.map(post => ({
      id: `R-${post.data.id}`,
      platform: 'reddit',
      username: post.data.author,
      profileUrl: `https://reddit.com/u/${post.data.author}`,
      content: post.data.title + ' ' + post.data.selftext,
      intentScore: this.calculateIntentScore(post.data.title + ' ' + post.data.selftext),
      contactMethod: 'DM',
      contactInfo: post.data.author
    }));
  }

  async searchTwitter(product, limit) {
    const searchQuery = this.buildSearchQuery(product.keywords, 'twitter');
    // Using Twitter search API or web scraping
    return [];
  }

  async searchLinkedIn(product, limit) {
    // LinkedIn search implementation
    return [];
  }

  buildSearchQuery(keywords, platform) {
    const intentWords = {
      reddit: ['looking to buy', 'where to buy', 'need to purchase', 'recommendations'],
      twitter: ['looking for', 'need recommendations', 'where can I find'],
      linkedin: ['looking for', 'recommendations', 'best place to buy']
    };

    const baseQuery = keywords.join(' OR ');
    const intentQuery = intentWords[platform].map(word => `"${word}"`).join(' OR ');
    
    return `(${baseQuery}) AND (${intentQuery})`;
  }

  calculateIntentScore(content) {
    const lowerContent = content.toLowerCase();
    let score = 50;

    const boosters = [
      { words: ['buy', 'purchase', 'order'], weight: 20 },
      { words: ['where to get', 'looking for', 'need'], weight: 15 },
      { words: ['price', 'cost', 'discount'], weight: 10 },
      { words: ['recommend', 'suggest', 'advice'], weight: 5 }
    ];

    boosters.forEach(booster => {
      if (booster.words.some(word => lowerContent.includes(word))) {
        score += booster.weight;
      }
    });

    return Math.min(score, 100);
  }

  filterTargets(targets) {
    return targets
      .filter(t => t.intentScore >= 70)
      .filter(t => t.username && t.username.length > 0)
      .slice(0, this.config.batchSize);
  }
}

module.exports = Searcher;
