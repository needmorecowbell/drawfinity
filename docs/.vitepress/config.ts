import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Drawfinity',
  description: 'Infinite canvas drawing app with real-time collaboration and turtle graphics',
  base: '/',

  head: [
    ['link', { rel: 'icon', href: '/assets/logo.png' }],
  ],

  themeConfig: {
    logo: '/assets/logo.png',

    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Turtle Graphics', link: '/turtle-graphics' },
      { text: 'API Reference', link: '/turtle-api' },
      {
        text: 'GitHub',
        link: 'https://github.com/needmorecowbell/drawfinity',
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
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
})
