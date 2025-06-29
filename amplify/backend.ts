import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

/**
 * Backend with auth and S3 storage for campaign images 
 */
export const backend = defineBackend({
  auth,
  storage
});