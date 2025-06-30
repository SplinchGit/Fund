/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getFund = /* GraphQL */ `
  query GetFund($id: ID!) {
    getFund(id: $id) {
      id
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listFunds = /* GraphQL */ `
  query ListFunds(
    $filter: ModelFundFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFunds(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
