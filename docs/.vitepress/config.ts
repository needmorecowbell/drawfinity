import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Drawfinity',
  description: 'Infinite canvas drawing app with real-time collaboration and turtle graphics',
  base: '/',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Drawfinity' }],
    ['meta', { property: 'og:description', content: 'Infinite canvas for drawing, collaboration, and creative coding' }],
    ['meta', { property: 'og:image', content: '/assets/screenshot-canvas.png' }],
  ],

  themeConfig: {
    logo: '/assets/logo.png',

    nav: [
      { text: 'Downloads', link: '/downloads' },
      { text: 'Guide', link: '/getting-started' },
      {
        text: 'Creative Coding',
        items: [
          { text: 'Turtle Graphics', link: '/turtle-graphics' },
          { text: 'Turtle API Reference', link: '/turtle-api' },
          { text: 'Turtle Exchange', link: '/turtle-exchange' },
        ],
      },
      { text: 'Architecture', link: '/architecture' },
      {
        text: 'GitHub',
        link: 'https://github.com/needmorecowbell/drawfinity',
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Downloads', link: '/downloads' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Features', link: '/features' },
          { text: 'Collaboration', link: '/collaboration' },
          { text: 'Server Setup', link: '/server-setup' },
          { text: 'Cross-Platform Notes', link: '/cross-platform-notes' },
          { text: 'Keyboard Shortcuts', link: '/shortcuts' },
        ],
      },
      {
        text: 'Creative Coding',
        items: [
          { text: 'Turtle Graphics', link: '/turtle-graphics' },
          { text: 'Turtle API', link: '/turtle-api' },
          { text: 'Turtle Exchange', link: '/turtle-exchange' },
        ],
      },
      {
        text: 'Internals',
        items: [
          { text: 'Architecture', link: '/architecture' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/needmorecowbell/drawfinity' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 Drawfinity contributors',
    },

    search: {
      provider: 'local',
    },
  },

  // Dark mode by default — artistic/creative feel
  appearance: 'dark',

  mermaid: {},
}))
