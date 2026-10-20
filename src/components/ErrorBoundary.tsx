import React, { Component, ErrorInfo, ReactNode } from 'react';
import NotFoundScreen from '../screens/NotFoundScreen';
import { captureException } from '../services/monitoringService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary Yakaladı]:', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <NotFoundScreen
          code="404"
          title="Kısa Bir Mutfak Molası"
          subtitle="Beklenmedik bir aksaklık nedeniyle bu ekran yüklenemedi. Şeflerimiz durumu inceliyor."
          frenchNote="Une brève pause dans nos ateliers"
          onGoHome={this.handleReset}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
