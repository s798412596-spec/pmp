import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

class RootErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("RootErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { style: { padding: 40, fontFamily: "-apple-system, sans-serif", textAlign: "center" } },
        React.createElement("h2", { style: { color: "#EF4444" } }, "页面出错了"),
        React.createElement("p", { style: { color: "#6B7280", fontSize: 14 } }, String(this.state.error?.message || "未知错误")),
        React.createElement("button", {
          onClick: () => { this.setState({ hasError: false, error: null }); window.location.reload(); },
          style: { marginTop: 16, padding: "10px 24px", borderRadius: 8, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, cursor: "pointer" }
        }, "刷新重试")
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
