import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PlayerProfile } from './pages/PlayerProfile';
import { CompareView } from './pages/CompareView';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'player/:id', Component: PlayerProfile },
      { path: 'compare', Component: CompareView },
    ],
  },
], {
  // Required for GitHub Pages sub-path routing.
  // Change to '/' if you use a custom domain.
  basename: '/sleeper-scout',
});

