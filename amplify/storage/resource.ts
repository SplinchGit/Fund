import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'worldfund-storage',
  access: (allow) => ({
    'raw-campaign-uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'processed-images/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
    ],
    'campaign-images/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write']),
    ],
  }),
});