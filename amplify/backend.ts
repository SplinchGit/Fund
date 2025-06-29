import { defineBackend } from '@aws-amplify/backend';
import { defineStorage } from '@aws-amplify/backend';

// Define storage for campaign image uploads
const storage = defineStorage({
  name: 'fund-image-uploads',
  access: (allow) => ({
    'campaign-uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read'])
    ],
    'raw-campaign-uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
});

/**
 * Backend with S3 storage for campaign images
 */
export const backend = defineBackend({
  storage
});