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
        <header class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 text-white shadow-lg">
          <div class="container mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <h1 class="text-2xl font-bold">spec-beanbot</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <Component />
      </body>
    </html>
  );
}