// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://smithadifd.github.io',
  base: '/starting-six',
  integrations: [
    starlight({
      title: 'Starting Six',
      description: 'Pokemon team builder and analysis tool — documentation.',
      social: {
        github: 'https://github.com/smithadifd/starting-six',
      },
      editLink: {
        baseUrl: 'https://github.com/smithadifd/starting-six/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Introduction',
          items: [
            { label: 'What is Starting Six?', slug: 'introduction/what-is-starting-six' },
            { label: 'Why it exists', slug: 'introduction/why-it-exists' },
          ],
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Quick Start (Docker)', slug: 'getting-started/quick-start' },
            { label: 'Local Development', slug: 'getting-started/local-development' },
            { label: 'First Run & PokeAPI Sync', slug: 'getting-started/first-run' },
          ],
        },
        {
          label: 'Features',
          items: [
            { label: 'Pokemon Browser', slug: 'features/pokemon-browser' },
            { label: 'Playthroughs & Team Builder', slug: 'features/playthroughs-team-builder' },
            { label: 'Analysis Engine', slug: 'features/analysis-engine' },
            { label: 'PWA & Offline Use', slug: 'features/pwa' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Overview', slug: 'architecture/overview' },
            { label: 'Database Schema', slug: 'architecture/database-schema' },
            { label: 'PokeAPI Sync Pipeline', slug: 'architecture/sync-pipeline' },
            { label: 'Analysis Engine Internals', slug: 'architecture/analysis-internals' },
          ],
        },
        {
          label: 'Design Decisions',
          items: [
            { label: 'Why SQLite', slug: 'design-decisions/why-sqlite' },
            { label: 'Bulk Sync vs. Live API', slug: 'design-decisions/bulk-sync' },
            { label: 'Bench/Swap Data Model', slug: 'design-decisions/bench-swap' },
            { label: 'Hardcoded Type Chart', slug: 'design-decisions/type-chart' },
          ],
        },
        {
          label: 'Configuration',
          items: [
            { label: 'Environment Variables', slug: 'configuration/environment-variables' },
            { label: 'Demo Mode', slug: 'configuration/demo-mode' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API Routes', slug: 'reference/api-routes' },
            { label: 'Tech Stack', slug: 'reference/tech-stack' },
          ],
        },
      ],
      components: {
        // override defaults later if needed
      },
    }),
  ],
});
