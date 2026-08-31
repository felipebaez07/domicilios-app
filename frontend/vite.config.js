import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El CSS va inline en el <head> en vez de en un <link> aparte: en algunos
// dispositivos/redes la peticion externa del .css fallaba (proxies de
// operador, extensiones, cortes puntuales) dejando la app sin estilos
// mientras el JS seguia funcionando. Al ir dentro del mismo documento HTML
// ya no depende de que esa segunda peticion tenga exito.
function inlineCss() {
  return {
    name: 'inline-css',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        let result = html
        for (const chunk of Object.values(ctx.bundle)) {
          if (chunk.type !== 'asset' || !chunk.fileName.endsWith('.css')) continue
          const css = typeof chunk.source === 'string' ? chunk.source : chunk.source.toString('utf-8')
          const linkTag = new RegExp(`<link[^>]*href="[^"]*${chunk.fileName}"[^>]*>`)
          result = result.replace(linkTag, `<style>${css}</style>`)
        }
        return result
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineCss()],
})
