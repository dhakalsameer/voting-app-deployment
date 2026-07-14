import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f5ec] p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-red-100 text-red-700 rounded-full h-10 w-10 flex items-center justify-center text-xl">!</span>
            <h1 className="text-xl font-black text-green-950">Something went wrong</h1>
          </div>
          <p className="text-sm text-green-800 mb-4">
            A component crashed. The rest of the UI is hidden to avoid showing broken state.
          </p>
          <pre className="text-xs bg-[#1a2e1a] text-red-200 p-3 rounded-lg overflow-auto max-h-48 mb-4">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={this.reset}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
