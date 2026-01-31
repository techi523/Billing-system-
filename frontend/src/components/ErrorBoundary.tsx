import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("🔥 [CRITICAL] React Error Boundary caught an error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', background: '#ffebee', color: '#b71c1c', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, overflow: 'auto', zIndex: 99999 }}>
                    <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>⚠️ CRITICAL REACT RENDER FAILURE</h1>
                    <h2 style={{ fontSize: '24px' }}>{this.state.error?.name}: {this.state.error?.message}</h2>
                    <pre style={{ marginTop: '20px', padding: '20px', background: '#fff', border: '1px solid #ffcdd2', borderRadius: '4px', overflowX: 'auto' }}>
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '20px', padding: '10px 20px', fontSize: '18px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Force Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
