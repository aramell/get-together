'use client'

import { ReactNode, useEffect } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { Amplify } from 'aws-amplify'
import { AuthProvider } from '@/lib/contexts/AuthContext'

export function AmplifyProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log('🔵 AmplifyProvider mounted - setting up AuthProvider context')
    // Configure Amplify on client side after mount
    // amplify_outputs.json should be in the public directory or root
    // See AMPLIFY_DEPLOYMENT.md for setup instructions
    const configureAmplify = async () => {
      try {
        // Import the config dynamically to avoid build-time errors
        const config = await import('../amplify_outputs.json')
        if (config.default) {
          Amplify.configure(config.default)
          console.log('✅ Amplify configured successfully')
        }
      } catch (error) {
        console.warn(
          '⚠️ Amplify configuration not available yet. ' +
          'Run "amplify deploy" in the get-together/ directory and copy amplify_outputs.json to the root. ' +
          'See AMPLIFY_DEPLOYMENT.md for detailed instructions.'
        )
      }
    }

    configureAmplify()
  }, [])

  console.log('🔵 AmplifyProvider rendering with AuthProvider')
  return (
    <ChakraProvider>
      <AuthProvider>{children}</AuthProvider>
    </ChakraProvider>
  )
}
