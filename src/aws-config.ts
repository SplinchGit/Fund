// src/aws-config.ts
import { Amplify } from 'aws-amplify';

export const configureAmplify = () => {
  // Create a base configuration
  const authConfig: any = {
    Cognito: {
      userPoolClientId: process.env.VITE_COGNITO_CLIENT_ID || '4scug8v54ekmj6d48ihastfs9i',
      userPoolId: process.env.VITE_COGNITO_USER_POOL_ID || 'eu-west-2_Voxip1n3G',
      loginWith: {
        email: true,
        username: true
      }
    }
  };

  // Only add identityPoolId if it's defined
  if (process.env.VITE_COGNITO_IDENTITY_POOL_ID) {
    authConfig.Cognito.identityPoolId = process.env.VITE_COGNITO_IDENTITY_POOL_ID;
  }

  // Configure Amplify with our auth settings
  Amplify.configure({
    Auth: authConfig
  });
};