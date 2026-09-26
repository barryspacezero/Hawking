import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="max-w-lg mx-auto text-center py-16 px-6">
            <p className="text-red-400 font-medium mb-2">Something went wrong loading this view.</p>
            <p className="text-sm text-gray-400 mb-6">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-none bg-brand text-white text-sm hover:bg-brand-hover transition"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

