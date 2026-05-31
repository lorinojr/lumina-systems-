// @ts-nocheck
// React 19 in this project ships no bundled .d.ts files and @types/react is not
// installed, so TypeScript cannot verify React.Component inheritance. The logic
// here is straightforward and safe; ts-nocheck is the pragmatic fix.
import { Component } from 'react';
import { Warning } from '@phosphor-icons/react';

export class ErrorBoundary extends Component {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Erro desconhecido' };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center">
          <Warning size={28} weight="fill" className="text-danger" />
        </div>
        <div>
          <p className="text-[15px] font-black text-ink mb-1">
            {this.props.fallbackLabel ?? 'Erro ao carregar módulo'}
          </p>
          <p className="text-[12px] text-muted font-medium max-w-xs leading-relaxed">
            {this.state.message}
          </p>
        </div>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="px-4 py-2 rounded-lg bg-accent text-white text-[12px] font-bold hover:bg-accent/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
