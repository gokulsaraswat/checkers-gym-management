import React from 'react';

import RouteFallbackPage from './RouteFallbackPage';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      resetKey: 0,
    };

    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  handleRetry() {
    this.setState((previousState) => ({
      error: null,
      resetKey: previousState.resetKey + 1,
    }));
  }

  render() {
    const { children } = this.props;
    const { error, resetKey } = this.state;

    if (error) {
      return <RouteFallbackPage error={error} onRetry={this.handleRetry} />;
    }

    return <React.Fragment key={resetKey}>{children}</React.Fragment>;
  }
}

export default AppErrorBoundary;
