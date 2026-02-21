import SalesCoachAI from './mock_demo_ui';
import LiveDemoUI from './live_demo_ui';
import PostSalesDashboard from './postsales_dashboard';

function App() {
  const mode = process.env.REACT_APP_MODE || 'mock';
  if (mode === 'live') return <LiveDemoUI />;
  if (mode === 'dashboard') return <PostSalesDashboard />;
  return <SalesCoachAI />;
}

export default App;
