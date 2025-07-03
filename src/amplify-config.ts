// src/amplify-config.ts
import { Amplify } from '@aws-amplify/core';
import { generateClient } from '@aws-amplify/api';

// Amplify Gen 1 configuration with proper storage setup
const amplifyConfig = {
  aws_project_region: 'eu-west-2',
  aws_cognito_region: 'eu-west-2',
  aws_user_pools_id: 'eu-west-2_placeholder',
  aws_user_pools_web_client_id: 'placeholder',
  aws_cognito_identity_pool_id: 'placeholder',
  aws_user_files_s3_bucket: 'fundbucketimages0017bb3c-dev',
  aws_user_files_s3_bucket_region: 'eu-west-2',
  Storage: {
    AWSS3: {
      bucket: 'fundbucketimages0017bb3c-dev',
      region: 'eu-west-2'
    }
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