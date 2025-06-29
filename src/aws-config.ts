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
        // Note: For newer Amplify (v6+), 'Cognito' might be directly under 'Auth'
        // and its structure might be slightly different. Assuming v5 structure here.
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

        // Only add identityPoolId if it's defined in the environment variables
        if (import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID) {
            authConfig.Cognito.identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
            console.log('Identity pool ID included in configuration:', authConfig.Cognito.identityPoolId);
        } else {
            console.warn('No VITE_COGNITO_IDENTITY_POOL_ID found in environment variables. S3 uploads might fail.');
        }

        // 🔧 FIX: Add Storage configuration for S3 using env variables
        const storageConfig: any = {
            S3: {
                // Ensure VITE_S3_BUCKET_NAME matches the actual bucket created by Amplify CLI or manually
                bucket: import.meta.env.VITE_S3_BUCKET_NAME || 'fund-image-uploads', 
                region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
            }
        };

        // Configure Amplify with both Auth and Storage
        Amplify.configure({
            Auth: authConfig,
            Storage: storageConfig // This was confirmed as added previously
            // Add API config here if not already handled elsewhere, e.g.:
            // API: {
            //     endpoints: [
            //         {
            //             name: "FundAPI",
            //             endpoint: import.meta.env.VITE_AMPLIFY_API,
            //             region: import.meta.env.VITE_AWS_REGION,
            //         },
            //     ]
            // }
        });
        
        console.log('Amplify configuration completed successfully.');
        console.log('Configured Storage bucket:', storageConfig.S3.bucket);
        return true;
    } catch (error) {
        console.error('Error configuring Amplify:', error);
        
        // Try with minimal configuration as fallback if main config fails
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
            console.log('Fallback configuration applied (no storage or identity pool configured).');
            return true;
        } catch (fallbackError) {
            console.error('Fallback configuration also failed:', fallbackError);
            return false;
        }
    }
};
