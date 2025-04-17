/**
 * File: api/register.ts - FINAL REVIEW VERSION
 * Purpose: Vercel Serverless Function to handle user registration.
 * Validates input server-side, hashes password, creates user via Prisma.
 * NOTE: Contains placeholder logic for World ID fields (Issue #2).
 */

// ============================================================================
// SECTION: Imports
// ============================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Ensure the path to your Prisma client is correct
import prisma from '../lib/prisma'; 
import argon2 from 'argon2';
import { randomUUID } from 'crypto';

// ============================================================================
// SECTION: Validation Helpers (Ideally move to shared lib -> e.g., ../lib/validation.ts)
// ============================================================================

// --- Profanity Filter Implementation (Duplicated - TODO: Refactor to shared lib) ---
const PROFANITY_LIST: string[] = [ 
  "fuck", "shit", "bitch", "cunt", "twat", "wanker", "asshole",
  "faggot", "nigger", "nigga", "bastard", "dick", "piss", "slut", 
  "whore", "cock", "ass", "pussy", "prick"
  // Add more words/variations as needed
];

const CHAR_SUBSTITUTIONS: { [key: string]: string } = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'l', '*': '', '.': '', '_': '', '-': '', '+': '', '=': ''
};

// Normalizes text by converting to lowercase and applying character substitutions
function normalizeText(text: string): string {
  return text.toLowerCase().split('').map(char => CHAR_SUBSTITUTIONS[char] || char).join('');
}

// Checks if normalized text contains any profanity from the list
function containsProfanity(text: string): boolean {
  const normalized = normalizeText(text);
  // Check for whole word matches (case-insensitive) and substring inclusion
  return PROFANITY_LIST.some(word => {
    if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) return true; 
    return normalized.includes(word);
  });
}

// --- Regex for Validation ---
// Matches strings containing only letters (a-z, A-Z), numbers (0-9), and underscores (_)
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/; 
// Checks for at least one uppercase letter
const HAS_UPPERCASE_REGEX = /[A-Z]/;
// Checks for at least one lowercase letter
const HAS_LOWERCASE_REGEX = /[a-z]/;
// Checks for at least one number
const HAS_NUMBER_REGEX = /[0-9]/;


// ============================================================================
// SECTION: API Handler Function
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  // 1. --- Method Check ---
  // Ensure only POST requests are allowed for registration
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']); // Inform client which methods are allowed
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. --- Body Parsing ---
  let body;
  try {
    // Handle cases where the body might be a string or already parsed object
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Ensure body is an object after parsing/assignment
    if (typeof body !== 'object' || body === null) {
        throw new Error('Request body is not a valid object.');
    }
  } catch (parseError: any) {
    // Return error if JSON is invalid or body is not an object
    return res.status(400).json({ error: `Invalid request body: ${parseError.message}` });
  }

  // 3. --- Basic Input Presence Check ---
  const { username, password } = body;
  // Use an array to collect names of missing fields
  const missingFields: string[] = []; // CORRECTED: Explicitly type as string array
  if (!username) missingFields.push('username');
  if (!password) missingFields.push('password');
  // If any required fields are missing, return an error
  if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
  }

  // 4. --- *** SERVER-SIDE VALIDATION *** ---
  // Validate the received username and password against defined rules
  const validationErrors: string[] = [];

  // Username Validation
  if (typeof username !== 'string') {
     validationErrors.push('Username must be a string.'); 
  } else { // Only run string checks if it's a string
    if (username.length < 3) validationErrors.push('Username must be at least 3 characters.');
    if (username.length > 20) validationErrors.push('Username must be less than 20 characters.');
    if (!USERNAME_REGEX.test(username)) validationErrors.push('Username can only contain letters, numbers, and underscores.');
    if (containsProfanity(username)) validationErrors.push('Username contains inappropriate language.');
  }

  // Password Validation
  if (typeof password !== 'string') {
    validationErrors.push('Password must be a string.');
  } else { // Only run string checks if it's a string
    if (password.length < 8) validationErrors.push('Password must be at least 8 characters.');
    if (!HAS_UPPERCASE_REGEX.test(password)) validationErrors.push('Password must contain at least one uppercase letter.');
    if (!HAS_LOWERCASE_REGEX.test(password)) validationErrors.push('Password must contain at least one lowercase letter.');
    if (!HAS_NUMBER_REGEX.test(password)) validationErrors.push('Password must contain at least one number.');
    // Note: Could add a special character check here if needed.
  }

  // Check if any validation errors occurred
  if (validationErrors.length > 0) {
    // Log the specific validation failure server-side for debugging
    console.log(`Validation failed for user ${username || '(no username provided)'}: ${validationErrors[0]}`); 
    // Return the first validation error found to the client
    return res.status(400).json({ error: validationErrors[0] }); 
  }
  // --- End of Server-Side Validation ---


  // 5. --- Core Logic (Hashing & Database Interaction) ---
  try {
    // TODO: Issue #2 - Placeholder values below need replacing with actual World ID logic.
    // These should eventually come from the frontend after World ID verification.
    const worldAppId: string = ''; 
    const worldNullifierHash: string = randomUUID(); 

    // Hash the password securely using Argon2
    const passwordHash: string = await argon2.hash(password);

    // Attempt to create the new user record in the database using Prisma
    const user = await prisma.user.create({
      // Data to be inserted, matching the Prisma schema 'User' model
      data: {
        name: username, // Storing username in the 'name' field
        passwordHash,
        worldAppId,       // Using placeholder
        worldNullifierHash, // Using placeholder
        // isVerified defaults to false, createdAt defaults to now() via schema
      },
      // Select only the necessary fields to return in the response
      select: { 
        id: true,
        name: true,
        createdAt: true 
      }
    });

    // Log successful registration on the server
    console.log(`User registered successfully: ${user.name} (ID: ${user.id})`);
    // Return a 201 Created status and the selected user data
    return res.status(201).json({ user }); 

  } catch (err: any) {
    // 6. --- Error Handling ---
    // Log the full error details on the server for debugging purposes
    console.error(`Registration Error for attempted user '${username}':`, err); 

    // Handle Prisma's unique constraint violation error (e.g., duplicate username)
    if (err?.code === 'P2002') {
      // Try to identify which unique field caused the error from Prisma's metadata
      const target = err.meta?.target; 
      let errorMessage = 'A user with the provided details already exists.'; // Default message
      if (Array.isArray(target) && target.includes('name')) {
         errorMessage = 'Username already exists. Please choose another one.';
      } else if (Array.isArray(target) && target.includes('worldNullifierHash')) {
         // This check is important for when World ID is properly implemented
         errorMessage = 'This World ID has already been registered.'; 
      }
      // Return a 400 Bad Request status with the specific error message
      return res.status(400).json({ error: errorMessage });
    }
    
    // Handle any other unexpected errors during the process
    // Return a generic 500 Internal Server Error status to the client
    return res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
  } finally {
      // Optional: Disconnect Prisma client. Check Prisma/Vercel best practices
      // for connection management in serverless environments.
      // await prisma.$disconnect(); 
  }
}

