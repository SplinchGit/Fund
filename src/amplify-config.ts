// src/amplify-config.ts
// COMPLETE REPLACEMENT - Gen 2 Configuration

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Simple Gen 2 configuration - replaces all the manual config
Amplify.configure(outputs);

console.log('[amplify-config] Gen 2 configuration loaded successfully');
console.log('[amplify-config] Storage bucket configured:', outputs.storage?.bucket_name);
console.log('[amplify-config] Auth configured:', !!outputs.auth);

export default outputs;