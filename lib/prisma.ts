// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"; // <-- Import SDK

// Define types for the global object to handle async initialization
interface PrismaGlobal {
  prisma?: PrismaClient;
  prismaPromise?: Promise<PrismaClient>; // Store the promise during async init
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;
const secretId = "DBURL"; // The name of your secret in AWS Secrets Manager
const region = "eu-north-1"; // The AWS region where your secret is stored

const getPrismaInstance = async (): Promise<PrismaClient> => {
  // If prisma is already initialized, return it
  if (globalForPrisma.prisma) {
    // console.log("Returning existing Prisma Client instance.");
    return globalForPrisma.prisma;
  }
  // If initialization is already in progress, wait for it
  if (globalForPrisma.prismaPromise) {
    // console.log("Waiting for existing Prisma Client initialization promise.");
    return globalForPrisma.prismaPromise;
  }

  // Start the async initialization only once
  console.log("Initializing Prisma Client asynchronously...");
  globalForPrisma.prismaPromise = (async () => {
    try {
      console.log(`Workspaceing secret value for '<span class="math-inline">\{secretId\}' from Secrets Manager in region '</span>{region}'...`);
      const secretsManagerClient = new SecretsManagerClient({ region: region });
      const command = new GetSecretValueCommand({ SecretId: secretId });
      const data = await secretsManagerClient.send(command);

      if (!data || !data.SecretString) {
        throw new Error(`SecretString for ${secretId} not found or is empty.`);
      }

      const databaseUrl = data.SecretString;
      console.log("Successfully fetched secret value. Initializing Prisma Client...");

      // Initialize PrismaClient with the fetched URL
      const prismaInstance = new PrismaClient({
        datasources: {
          db: { // Make sure 'db' matches the datasource name in your schema.prisma
            url: databaseUrl,
          },
        },
      });

      // Store the successfully initialized client globally
      console.log("Prisma Client initialized successfully.");
      globalForPrisma.prisma = prismaInstance;
      return prismaInstance;

    } catch (error) {
      console.error("FATAL: Failed to fetch secret or initialize Prisma Client:", error);
      // Clean up the promise variable if initialization failed to allow retries (maybe?)
      delete globalForPrisma.prismaPromise;
      // Re-throw or handle appropriately depending on your app's error handling strategy
      throw new Error(`Could not initialize Prisma Client: ${error.message}`);
    }
  })();

  return globalForPrisma.prismaPromise;
};

// --- Client Export ---
// Instead of exporting the instance directly, we export an object
// with a function to get the initialized client asynchronously.
const prisma = {
    getClient: getPrismaInstance
};

export default prisma;

// --- IMPORTANT USAGE CHANGE ---
// In your API handlers (e.g., api/login.ts, api/register.ts) where you
// previously did `import prisma from '../../lib/prisma'` and then directly used
// `await prisma.user.findFirst(...)`, you will now need to do:
//
// import prismaGetter from '../../lib/prisma'; // Import the object with the getter
//
// // Inside your async API handler function:
// const prisma = await prismaGetter.getClient(); // Call the getter and await the promise
// const user = await prisma.user.findFirst(...); // Now you can use the client
//
// Make sure your API handler functions are `async`.