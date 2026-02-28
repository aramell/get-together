import { defineAuth } from '@aws-amplify/backend'

/**
 * Authentication with Cognito
 * Decision 2c: Email/password authentication with account recovery
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  accountRecovery: 'EMAIL_ONLY',
})
