// src/amplify-config.ts
import { Amplify } from '@aws-amplify/core';
import { generateClient } from '@aws-amplify/api';

// Fallback configuration using your specific S3 bucket
const amplifyConfig = {
  aws_project_region: 'eu-west-2',
  auth: {
    aws_region: 'eu-west-2',
    user_pool_id: 'eu-west-2_placeholder',
    user_pool_web_client_id: 'placeholder'
  },
  storage: {
    aws_region: 'eu-west-2',
    bucket_name: 'fundbucketimages0017bb3c-dev'
  }
};

// Configure Amplify
Amplify.configure(amplifyConfig);

// Create API client (if needed)
export const client = generateClient();

console.log('[amplify-config] Amplify configured with fallback config:', {
  auth: !!amplifyConfig.auth,
  storage: !!amplifyConfig.storage,
  region: amplifyConfig.aws_project_region,
  bucket: amplifyConfig.storage.bucket_name
});

export default amplifyConfig;