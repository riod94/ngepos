// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
          <title>NgePos — Kasir Pintar untuk Usahamu</title>
          <meta name="description" content="Aplikasi kasir digital yang cepat, simpel, dan offline-first untuk usaha makanan dan minuman Anda." />
          <meta name="theme-color" content="#4338CA" />

          {/* Favicon */}
          <link rel="icon" type="image/png" href="/logo_icon.png" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/logo_icon.png" />

          {/* Open Graph */}
          <meta property="og:title" content="NgePos — Kasir Pintar untuk Usahamu" />
          <meta property="og:description" content="Aplikasi kasir digital yang cepat, simpel, dan offline-first." />
          <meta property="og:image" content="/logo_wordmark.png" />
          <meta property="og:type" content="website" />

          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
