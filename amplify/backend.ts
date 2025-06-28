import { defineBackend } from '@aws-amplify/backend';

/**
 * Minimal backend - just enough for Amplify to deploy frontend
 * Uses existing backend infrastructure
 */
export const backend = defineBackend({
  // Empty - we don't want Amplify managing our existing resources
});