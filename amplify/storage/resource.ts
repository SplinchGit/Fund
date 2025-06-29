import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'fund-storage',
  access: (allow) => ({
    'campaign-images/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read'])
    ],
    'raw-campaign-uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
});