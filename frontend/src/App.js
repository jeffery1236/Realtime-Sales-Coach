import SalesCoachAI from './mock_demo_ui';
import LiveDemoUI from './live_demo_ui';

function App() {
  const mode = process.env.REACT_APP_MODE || 'mock';
  return mode === 'live' ? <LiveDemoUI /> : <SalesCoachAI />;
}

export default App;
