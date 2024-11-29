import React from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../services/socket';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const currentRole = localStorage.getItem('current_role');
  const user = currentRole ? JSON.parse(localStorage.getItem(`${currentRole}_user`) || '{}') : {};

  const handleLogout = () => {
    // 断开 socket 连接
    if (socketService.socket) {
      socketService.socket.disconnect();
    }
    
    // 清除所有存储的数据
    localStorage.clear();
    
    // 重定向到登录页面
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">排课系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                {user.role === 'teacher' ? '教师' : '学生'}: {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}; 