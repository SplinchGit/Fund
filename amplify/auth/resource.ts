import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    'custom:walletAddress': {
      dataType: 'String',
    },
    'custom:worldIdVerified': {
      dataType: 'Boolean', 
    },
  },
});