import { Component } from 'react'

// Stops any component error from blanking the whole app. Used in two places:
// around the Splash (fallback null -> the app simply shows without the intro)
// and around the whole app (fallback -> a friendly reload screen).
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null
    return this.props.children
  }
}
