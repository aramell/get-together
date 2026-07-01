'use client'

import { ReactNode, useEffect } from 'react'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { Amplify } from 'aws-amplify'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { BottomNav } from '@/components/layout/BottomNav'
import theme from '@/lib/theme'

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
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Box display="flex" flexDirection="column" minH="100vh">
          <Box flex={1} pb={{ base: '56px', md: 0 }}>
            {children}
          </Box>
          <BottomNav />
        </Box>
      </AuthProvider>
    </ChakraProvider>
  )
}
