// self-healing.js - Self-Healing System
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SelfHealingSystem {
  constructor() {
    this.healthStatus = {
      system: 'unknown',
      dependencies: 'unknown',
      configuration: 'unknown',
      network: 'unknown',
      storage: 'unknown'
    };
    
    this.repairHistory = [];
    this.maxRepairAttempts = 3;
  }

  async diagnose() {
    console.log('🔍 Running Comprehensive Diagnosis...');
    
    const checks = [
      this.checkSystemFiles(),
      this.checkDependencies(),
      this.checkConfiguration(),
      this.checkNetwork(),
      this.checkStorage(),
      this.checkPermissions()
    ];
    
    const results = await Promise.all(checks);
    
    results.forEach((result, index) => {
      const checkNames = ['System Files', 'Dependencies', 'Configuration', 'Network', 'Storage', 'Permissions'];
      this.healthStatus[checkNames[index].toLowerCase().replace(' ', '_')] = result.healthy ? 'healthy' : 'unhealthy';
      
      if (!result.healthy) {
        console.log(`⚠️  ${checkNames[index]}: ${result.issue}`);
      } else {
        console.log(`✅ ${checkNames[index]}: Healthy`);
      }
    });
    
    return this.healthStatus;
  }

  checkSystemFiles() {
    const requiredFiles = ['index.js', 'package.json', '.env'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    return {
      healthy: missingFiles.length === 0,
      issue: missingFiles.length > 0 ? `Missing files: ${missingFiles.join(', ')}` : null
    };
  }

  checkDependencies() {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredDeps = Object.keys(pkg.dependencies || {});
      
      const missingDeps = requiredDeps.filter(dep => {
        try {
          require.resolve(dep);
          return false;
        } catch {
          return true;
        }
      });
      
      return {
        healthy: missingDeps.length === 0,
        issue: missingDeps.length > 0 ? `Missing dependencies: ${missingDeps.join(', ')}` : null
      };
    } catch {
      return { healthy: false, issue: 'Cannot read package.json' };
    }
  }

  checkConfiguration() {
    const requiredEnvVars = ['CAMPAIGN_MODE', 'BATCH_SIZE', 'TARGET_REGION'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    return {
      healthy: missingVars.length === 0,
      issue: missingVars.length > 0 ? `Missing env vars: ${missingVars.join(', ')}` : null
    };
  }

  checkNetwork() {
    try {
      require.resolve('axios');
      return { healthy: true, issue: null };
    } catch {
      return { healthy: false, issue: 'Network module missing' };
    }
  }

  checkStorage() {
    try {
      const freeSpace = this.getFreeDiskSpace();
      return {
        healthy: freeSpace > 100, // MB
        issue: freeSpace <= 100 ? `Low disk space: ${freeSpace}MB` : null
      };
    } catch {
      return { healthy: false, issue: 'Cannot check storage' };
    }
  }

  checkPermissions() {
    const writeableDirs = ['logs', 'reports', 'data'];
    const unwriteable = writeableDirs.filter(dir => {
      try {
        const testFile = path.join(dir, '.test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return false;
      } catch {
        return true;
      }
    });
    
    return {
      healthy: unwriteable.length === 0,
      issue: unwriteable.length > 0 ? `Cannot write to: ${unwriteable.join(', ')}` : null
    };
  }

  getFreeDiskSpace() {
    try {
      const stats = fs.statSync('.');
      // Simplified calculation
      return 1024; // Mock value
    } catch {
      return 0;
    }
  }

  async repair() {
    console.log('🛠️  Initiating Self-Repair Sequence...');
    
    const issues = Object.entries(this.healthStatus)
      .filter(([_, status]) => status === 'unhealthy')
      .map(([component]) => component);
    
    if (issues.length === 0) {
      console.log('✅ System is healthy - no repairs needed');
      return true;
    }
    
    console.log(`🔧 Repairing ${issues.length} components: ${issues.join(', ')}`);
    
    let success = true;
    
    for (const component of issues) {
      try {
        await this.repairComponent(component);
        console.log(`✅ Repaired: ${component}`);
      } catch (error) {
        console.error(`❌ Failed to repair ${component}:`, error.message);
        success = false;
      }
    }
    
    return success;
  }

  async repairComponent(component) {
    const repairActions = {
      system_files: () => this.repairSystemFiles(),
      dependencies: () => this.repairDependencies(),
      configuration: () => this.repairConfiguration(),
      network: () => this.repairNetwork(),
      storage: () => this.repairStorage(),
      permissions: () => this.repairPermissions()
    };
    
    if (repairActions[component]) {
      await repairActions[component]();
      this.recordRepair(component, 'success');
    } else {
      throw new Error(`Unknown component: ${component}`);
    }
  }

  repairSystemFiles() {
    const requiredFiles = {
      'index.js': `// Auto-generated by Self-Healing System
console.log('System repaired successfully');`,
      '.env': `# Auto-generated configuration
CAMPAIGN_MODE=ai_standard
BATCH_SIZE=15
TARGET_REGION=global
AI_INTELLIGENCE_LEVEL=high`
    };
    
    Object.entries(requiredFiles).forEach(([filename, content]) => {
      if (!fs.existsSync(filename)) {
        fs.writeFileSync(filename, content);
      }
    });
  }

  repairDependencies() {
    try {
      execSync('npm install axios cheerio dotenv googleapis --no-save', { stdio: 'pipe' });
    } catch {
      // If npm fails, create minimal package.json
      if (!fs.existsSync('package.json')) {
        fs.writeFileSync('package.json', JSON.stringify({
          name: 'kony-auto-repair',
          version: '1.0.0',
          dependencies: {
            axios: '^1.6.0',
            dotenv: '^16.3.0'
          }
        }, null, 2));
      }
    }
  }

  repairConfiguration() {
    if (!fs.existsSync('.env')) {
      this.repairSystemFiles();
    }
    
    // Ensure required variables exist
    const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
    const requiredVars = [
      'CAMPAIGN_MODE=ai_standard',
      'BATCH_SIZE=15',
      'TARGET_REGION=global',
      'AI_INTELLIGENCE_LEVEL=high'
    ];
    
    let newEnv = envContent;
    requiredVars.forEach(requiredVar => {
      const [key] = requiredVar.split('=');
      if (!newEnv.includes(`${key}=`)) {
        newEnv += `\n${requiredVar}`;
      }
    });
    
    fs.writeFileSync('.env', newEnv);
  }

  repairNetwork() {
    // Ensure axios is available
    this.repairDependencies();
  }

  repairStorage() {
    // Create necessary directories
    const dirs = ['logs', 'reports', 'data', 'backups'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Clean up old logs if storage is low
    const logsDir = 'logs';
    if (fs.existsSync(logsDir)) {
      const logs = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(logsDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only recent 10 logs
      if (logs.length > 10) {
        logs.slice(10).forEach(log => {
          fs.unlinkSync(path.join(logsDir, log.name));
        });
      }
    }
  }

  repairPermissions() {
    const dirs = ['logs', 'reports', 'data'];
    dirs.forEach(dir => {
      try {
        fs.chmodSync(dir, 0o755);
      } catch {
        // Ignore permission errors
      }
    });
  }

  recordRepair(component, status) {
    this.repairHistory.push({
      timestamp: new Date().toISOString(),
      component,
      status,
      attempt: this.repairHistory.filter(r => r.component === component).length + 1
    });
    
    // Save repair history
    const historyDir = 'data/repair_history';
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(historyDir, 'repair_log.json'),
      JSON.stringify(this.repairHistory, null, 2)
    );
  }

  getHealthReport() {
    const healthyCount = Object.values(this.healthStatus).filter(s => s === 'healthy').length;
    const totalCount = Object.keys(this.healthStatus).length;
    const healthPercentage = (healthyCount / totalCount) * 100;
    
    return {
      overall_health: healthPercentage >= 80 ? 'excellent' : healthPercentage >= 60 ? 'good' : 'needs_attention',
      health_percentage: healthPercentage,
      components: this.healthStatus,
      last_repair: this.repairHistory[this.repairHistory.length - 1] || null,
      suggestions: this.getHealthSuggestions()
    };
  }

  getHealthSuggestions() {
    const suggestions = [];
    
    if (this.healthStatus.dependencies !== 'healthy') {
      suggestions.push('Run: npm install --force');
    }
    
    if (this.healthStatus.configuration !== 'healthy') {
      suggestions.push('Check .env file configuration');
    }
    
    if (this.healthStatus.storage !== 'healthy') {
      suggestions.push('Clean up old logs and reports');
    }
    
    return suggestions;
  }
}

module.exports = SelfHealingSystem;
