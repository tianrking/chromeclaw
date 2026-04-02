import { GenericStrategy } from './generic.js';
import { GitHubStrategy } from './github.js';
import { GoogleStrategy } from './google.js';
import { YouTubeStrategy } from './youtube.js';

const strategies = [
  new YouTubeStrategy(),
  new GoogleStrategy(),
  new GitHubStrategy(),
  new GenericStrategy()
];

export function resolveStrategy(url) {
  for (const strategy of strategies) {
    if (strategy.matches(url)) return strategy;
  }
  return strategies[strategies.length - 1];
}

export function strategyContext(strategy, context = {}) {
  return {
    name: strategy.name,
    description: strategy.describe(),
    hints: strategy.getHints(context),
    selectorPresets: strategy.getSelectorPresets(context),
    workflowPresets: strategy.getWorkflowPresets(context)
  };
}
