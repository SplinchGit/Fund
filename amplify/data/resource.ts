import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Campaign: a
    .model({
      title: a.string().required(),
      description: a.string().required(),
      goal: a.float().required(),
      raised: a.float().default(0),
      ownerId: a.string().required(),
      category: a.string().required(),
      image: a.string(),
      status: a.enum(['active', 'completed', 'cancelled', 'PENDING_REVIEW']),
      currency: a.string().default('WLD'),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  Donation: a
    .model({
      campaignId: a.string().required(),
      amount: a.float().required(),
      donor: a.string().required(),
      txHash: a.string().required(),
      currency: a.string().default('WLD'),
      onChainAmountSmallestUnit: a.string(),
      verifiedStatus: a.enum(['VERIFIED', 'PENDING', 'FAILED']),
      verifiedAt: a.datetime(),
      chainId: a.integer(),
      blockNumber: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.authenticated().to(['create', 'read']),
    ]),

  User: a
    .model({
      walletAddress: a.string().required(),
      isWorldIdVerified: a.boolean().default(false),
      worldIdNullifier: a.string(),
      worldIdVerifiedAt: a.datetime(),
    })
    .identifier(['walletAddress'])
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});