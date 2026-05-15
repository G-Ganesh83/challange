import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['all', '5173-i90fv02st6wbssdj6fxyb.e2b.app', '.e2b.app']
  }
})
