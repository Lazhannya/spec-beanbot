import { PageProps } from "$fresh/server.ts";
import ThemeToggle from "../islands/ThemeToggle.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>spec-beanbot</title>
        <script src="/dark-mode-init.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Component />
        {/* Floating Theme Toggle Button */}
        <div class="fixed bottom-6 right-6 z-50">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}