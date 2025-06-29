// src/aws-config.ts - Fixed with S3 Storage configuration
import { Amplify } from 'aws-amplify';

// Default configuration values
const DEFAULT_CONFIG = {
  userPoolClientId: '4scug8v54ekmj6d48ihastfs9i',
  userPoolId: 'eu-west-2_Voxip1n3G'
};

export const configureAmplify = () => {
  try {
    console.log('Starting Amplify configuration...');
    
    // Create a base configuration using any to bypass TypeScript errors
    const authConfig: any = {
      Cognito: {
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || DEFAULT_CONFIG.userPoolClientId,
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || DEFAULT_CONFIG.userPoolId,
        loginWith: {
          email: true,
          username: true
        }
      }
    };

    // Only add identityPoolId if it's defined
    if (import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID) {
      authConfig.Cognito.identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
      console.log('Identity pool ID included in configuration');
    } else {
      console.log('No identity pool ID found in environment variables');
    }

    // 🔧 FIX: Add Storage configuration for S3
    const storageConfig: any = {
      S3: {
        bucket: import.meta.env.VITE_S3_BUCKET_NAME || 'fund-image-uploads', // Your chosen bucket name
        region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
      }
    };

    // Configure Amplify with both auth and storage
    Amplify.configure({
      Auth: authConfig,
      Storage: storageConfig // 🔧 This was missing!
    });
    
    console.log('Amplify configuration completed successfully');
    console.log('Storage bucket configured:', storageConfig.S3.bucket);
    return true;
  } catch (error) {
    console.error('Error configuring Amplify:', error);
    
    // Try with minimal configuration as fallback
    try {
      console.log('Attempting fallback configuration...');
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolClientId: DEFAULT_CONFIG.userPoolClientId,
            userPoolId: DEFAULT_CONFIG.userPoolId,
            loginWith: { email: true, username: true }
          }
        }
      });
      console.log('Fallback configuration applied (no storage)');
      return true;
    } catch (fallbackError) {
      console.error('Fallback configuration also failed:', fallbackError);
      return false;
    }
  }
};