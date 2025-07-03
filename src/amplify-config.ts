// src/amplify-config.ts
import { Amplify } from '@aws-amplify/core';
import { generateClient } from '@aws-amplify/api';

// Amplify Gen 1 configuration with REAL values from aws-exports.js
const amplifyConfig = {
  aws_project_region: 'eu-west-2',
  aws_cognito_region: 'eu-west-2',
  aws_user_pools_id: 'eu-west-2_EZv70F47u',
  aws_user_pools_web_client_id: '57lvledp56fqp7sohrb1l8djai',
  aws_cognito_identity_pool_id: 'eu-west-2:4c836def-a749-4f5f-b228-51dc33474129',
  aws_user_files_s3_bucket: 'fundbucketimages0017bb3c-dev',
  aws_user_files_s3_bucket_region: 'eu-west-2',
  aws_cognito_username_attributes: [],
  aws_cognito_social_providers: [],
  aws_cognito_signup_attributes: ['EMAIL'],
  aws_cognito_mfa_configuration: 'OFF',
  aws_cognito_mfa_types: ['SMS'],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_verification_mechanisms: ['EMAIL'],
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