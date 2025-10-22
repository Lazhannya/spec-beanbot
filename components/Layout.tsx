// Base Fresh layout component for consistent UI structure

import { Head } from "$fresh/runtime.ts";
import type { ComponentChildren } from "preact";

export interface LayoutProps {
  title?: string;
  description?: string;
  children: ComponentChildren;
  showNavigation?: boolean;
  currentUser?: {
    username: string;
    isAdmin: boolean;
  } | null;
}

export default function Layout({
  title = "Reminder Management",
  description = "Discord Bot Reminder Management Interface",
  children,
  showNavigation = true,
  currentUser = null,
}: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </Head>
      
      <div class="min-h-screen bg-gray-50">
        {showNavigation && (
          <Navigation currentUser={currentUser} />
        )}
        
        <main class={showNavigation ? "pt-16" : ""}>
          {children}
        </main>
        
        <Footer />
      </div>
    </>
  );
}

function Navigation({ currentUser }: { currentUser: LayoutProps["currentUser"] }) {
  return (
    <nav class="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div class="flex items-center">
            <a href="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span class="text-white font-bold text-sm">R</span>
              </div>
              <span class="font-semibold text-gray-900">Reminder Bot</span>
            </a>
          </div>

          {/* Navigation Links */}
          <div class="hidden md:flex items-center space-x-8">
            <a 
              href="/" 
              class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </a>
            
            {currentUser?.isAdmin && (
              <>
                <a 
                  href="/admin/reminders" 
                  class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Reminders
                </a>
                <a 
                  href="/admin/reminders/new" 
                  class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Create Reminder
                </a>
              </>
            )}
          </div>

          {/* User Menu */}
          <div class="flex items-center space-x-4">
            {currentUser ? (
              <div class="flex items-center space-x-3">
                <span class="text-sm text-gray-700">
                  {currentUser.username}
                  {currentUser.isAdmin && (
                    <span class="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                </span>
                <a 
                  href="/auth/logout" 
                  class="text-gray-500 hover:text-gray-900 text-sm font-medium"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a 
                href="/auth/login" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer class="bg-white border-t border-gray-200 mt-auto">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="text-center text-sm text-gray-500">
          <p>
            Reminder Bot Management Interface • Built with{" "}
            <a 
              href="https://fresh.deno.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800"
            >
              Fresh
            </a>
            {" "}and{" "}
            <a 
              href="https://deno.land" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800"
            >
              Deno
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// Common page wrapper for consistent spacing
export function PageContainer({ 
  children, 
  title, 
  subtitle 
}: { 
  children: ComponentChildren; 
  title?: string; 
  subtitle?: string; 
}) {
  return (
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {(title || subtitle) && (
        <div class="mb-6">
          {title && (
            <h1 class="text-3xl font-bold text-gray-900">{title}</h1>
          )}
          {subtitle && (
            <p class="mt-2 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}
      
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Loading spinner component
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
  };

  return (
    <div class="flex justify-center">
      <div class={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
    </div>
  );
}

// Alert/notification component
export function Alert({ 
  type = "info", 
  title, 
  message, 
  dismissible = false 
}: { 
  type?: "success" | "error" | "warning" | "info"; 
  title?: string; 
  message: string; 
  dismissible?: boolean; 
}) {
  const typeStyles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div class={`border rounded-md p-4 ${typeStyles[type]}`}>
      <div class="flex">
        <div class="flex-1">
          {title && (
            <h3 class="text-sm font-medium mb-1">{title}</h3>
          )}
          <p class="text-sm">{message}</p>
        </div>
        
        {dismissible && (
          <button 
            type="button"
            class="ml-3 text-sm hover:opacity-75"
            onClick="this.closest('.border').remove()"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}