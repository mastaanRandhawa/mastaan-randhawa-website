import { Component, type ReactNode } from "react";

/**
 * If anything in the 3D experience throws, fall back to the classic portfolio
 * instead of a blank page — the professional content must always be reachable.
 */
export class GameErrorBoundary extends Component<{ children: ReactNode; onFail: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[skybound] game crashed, falling back to portfolio:", error);
    this.props.onFail(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
