// Initialize dark mode before page renders to prevent flash
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  // Default to dark mode
  document.documentElement.classList.add('dark');
}

// Configure Tailwind dark mode
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: 'class'
  };
}
