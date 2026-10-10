import { ChakraProvider } from "@chakra-ui/react"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { system } from "@/lib/theme.ts"

// Follows the OS colour scheme; next-themes sets the `light`/`dark` class on <html>.
export function Provider({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  )
}
