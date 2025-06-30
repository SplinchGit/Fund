// src/aws-exports.d.ts
// This file provides TypeScript declarations for the auto-generated aws-exports.js module.
// It helps TypeScript understand the shape of the 'awsmobile' configuration object,
// resolving the "Could not find a declaration file" error.

declare module 'aws-exports' {
  // Declare the shape of the awsmobile object that is exported from aws-exports.js
  // This interface should reflect the properties that Amplify populates in the file.
  interface AmplifyConfig {
    aws_project_region: string;
    aws_cognito_identity_pool_id?: string;
    aws_cognito_region?: string;
    aws_user_pools_id?: string;
    aws_user_pools_web_client_id?: string;
    oauth?: Record<string, any>;
    aws_cognito_username_attributes?: string[];
    aws_cognito_social_providers?: string[];
    aws_cognito_signup_attributes?: string[];
    aws_cognito_mfa_configuration?: string;
    aws_cognito_mfa_types?: string[];
    aws_cognito_password_protection_settings?: {
      passwordPolicyMinLength?: number;
      passwordPolicyCharacters?: string[];
    };
    aws_cognito_verification_mechanisms?: string[];
    aws_user_files_s3_bucket?: string;
    aws_user_files_s3_bucket_region?: string;
    aws_appsync_graphqlEndpoint?: string;
    aws_appsync_region?: string;
    aws_appsync_authenticationType?: string;
    aws_appsync_apiKey?: string;
    // Add any other properties that might be present in your aws-exports.js
    // For example, if you have Analytics, Push Notifications, etc.
    // aws_mobile_analytics_app_id?: string;
    // aws_mobile_analytics_region?: string;
  }

  // Export the default configuration object
  const awsmobile: AmplifyConfig;
  export default awsmobile;
}
