import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight">Royal Trust Pharma POS</h1>
              <p className="text-xs text-slate-400">
                An unexpected interface state occurred. Your pharmacy records and transactions are safely saved.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left">
                <p className="text-[10px] font-mono text-rose-300 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application Page
              </button>
              
              <button
                onClick={this.handleResetState}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                Clear Session Cache & Recover
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
