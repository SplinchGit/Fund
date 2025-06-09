import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      // I'd recommend adding the 'isDone' field from the original comment
      isDone: a.boolean().default(false)
    })
    // We can let the global rule handle authorization
    .authorization((allow) => [allow.publicApiKey()]), 
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Change this to apiKey
    defaultAuthorizationMode: 'apiKey', 
    // And configure the API key
    apiKeyAuthorizationMode: {
      expiresInDays: 30 // The API key will be valid for 30 days
    }
  },
});