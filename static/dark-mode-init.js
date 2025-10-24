// Browser script - Initialize dark mode before page renders to prevent flash
// This runs before Tailwind loads to avoid flash of unstyled content
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  // Default to dark mode
  document.documentElement.classList.add('dark');
}
