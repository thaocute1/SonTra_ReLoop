import React from 'react';

/**
 * Catches unexpected render errors so the application displays a recovery view
 * instead of unmounting to a blank white screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoLogin = () => {
    this.setState({ hasError: false });
    window.location.assign('/login');
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-[#F8FAF7] px-4 text-[#191C1A]">
          <section className="max-w-md w-full rounded-3xl border border-[#C5CCC7] bg-white p-8 text-center shadow-sm space-y-4">
            <h1 className="text-xl font-bold m-0">Đã có sự cố hiển thị trang</h1>
            <p className="text-sm text-[#4A514C] m-0">
              Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang hoặc quay về trang đăng nhập.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-full bg-[#2F5D4A] text-white text-sm font-semibold border-0 cursor-pointer"
              >
                Tải lại trang
              </button>
              <button
                type="button"
                onClick={this.handleGoLogin}
                className="px-5 py-2.5 rounded-full bg-white text-[#191C1A] text-sm font-semibold border border-[#C5CCC7] cursor-pointer"
              >
                Về trang đăng nhập
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
