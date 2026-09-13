import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo text-right" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              مركز الرعاية الطبية
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              حدث تنبيه مؤقت أثناء عرض الصفحة على هاتفك. يمكنك إعادة تحديث الواجهة للمتابعة بسلاسة.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition cursor-pointer"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

