import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

class RootErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[RootError]', e, info); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#e53e3e', background: '#fff5f5', minHeight: '100vh' }}>
        <h2>应用崩溃</h2>
        <p><b>错误信息：</b>{this.state.error?.message}</p>
        <p><b>位置：</b>{this.state.error?.stack?.split('\n')[1]}</p>
        <button onClick={() => this.setState({ error: null })} style={{ background: '#e53e3e', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', marginTop: 16 }}>重试</button>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary><App /></RootErrorBoundary>
);
