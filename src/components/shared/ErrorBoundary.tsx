import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { JuicyButton } from './JuicyButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-[#0d0605] text-[#f7f0ea] flex flex-col items-center justify-center p-6 z-[9999] select-none font-sans-clean">
          <div className="bg-[#170b09] border-2 border-[#301a14] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.2)] text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-2xl shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-[#f7f0ea] tracking-tight">
                Table Glitch Prevented
              </h2>
              <p className="text-xs sm:text-sm text-[#f7f0ea]/60 mt-1">
                A rendering glitch was safely captured without crashing the match.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-[#0d0605] rounded-xl p-3 border border-[#301a14] text-left font-mono text-[10px] text-rose-300 overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <JuicyButton variant="gold" size="md" onClick={this.handleRecover} className="w-full mt-2">
              <RotateCcw className="w-4 h-4 mr-1" />
              <span>Resume Table</span>
            </JuicyButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
