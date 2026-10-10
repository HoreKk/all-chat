import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

// Chakra's default theme plus the All Chat brand. Components use the default
// semantic tokens (bg, fg, fg.muted, border…) and `accent` for the brand red.
const config = defineConfig({
  globalCss: {
    body: { bg: "bg.page", color: "fg" }
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
        body: { value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }
      }
    },
    semanticTokens: {
      colors: {
        bg: {
          page: { value: { _light: "#f7f6f3", _dark: "#111114" } },
          panel: { value: { _light: "#ffffff", _dark: "#1a1a1f" } }
        },
        fg: {
          DEFAULT: { value: { _light: "#16161a", _dark: "#ececf0" } },
          muted: { value: { _light: "#6b6b76", _dark: "#9a9aa6" } }
        },
        border: {
          DEFAULT: { value: { _light: "#dddbd5", _dark: "#2a2a31" } }
        },
        accent: { value: { _light: "#c8102e", _dark: "#ff4d5e" } }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)
