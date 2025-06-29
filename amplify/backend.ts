import { defineBackend } from '@aws-amplify/backend';
import { storage } from './storage/resource';

/**
 * Backend with S3 storage for campaign images 
 */
export const backend = defineBackend({
  storage
});