// amplify/storage/resource.ts

import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'fund-storage', // Keep your storage name consistent
  access: (allow) => ({
    'public/*': [ // This rule is essential for public uploads
      allow.guest.to(['read']), // Allows anyone (authenticated or not) to read files in 'public/'
      allow.authenticated.to(['read', 'write', 'delete']) // Authenticated users can manage files in 'public/'
    ]
    // Crucially, remove any other specific paths like 'campaign-images/*' or 'raw-campaign-uploads/*'
    // All campaign images will now be stored and accessed via the 'public/campaign-images/' path.
  })
});