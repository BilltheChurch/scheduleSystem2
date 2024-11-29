import React, { useEffect, useRef } from 'react';
import { ScheduleRequest, TimeSlot } from '../types';

interface RequestsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ScheduleRequest[];
  timeSlots: TimeSlot[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const RequestsSidebar: React.FC<RequestsSidebarProps> = ({
  isOpen,
  onClose,
  requests,
  timeSlots,
  onApprove,
  onReject
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 添加点击事件监听器
    document.addEventListener('mousedown', handleClickOutside);

    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const formatTimeRange = (slot: TimeSlot) => {
    const startTime = new Date(slot.startTime).toLocaleString();
    const endTime = new Date(slot.endTime).toLocaleString();
    return `${startTime} - ${endTime}`;
  };

  // 处理批准和拒绝时自动关闭侧边栏
  const handleApprove = (requestId: string) => {
    onApprove(requestId);
    onClose();
  };

  const handleReject = (requestId: string) => {
    onReject(requestId);
    onClose();
  };

  return (
    <>
      {/* 添加遮罩层 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40" />
      )}
      
      <div
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">调课请求处理</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {requests.filter(r => r.status === 'pending').map(request => {
              const originalSlot = timeSlots.find(slot => slot.id === request.originalSlotId);
              const targetSlot = timeSlots.find(slot => slot.id === request.targetSlotId);

              return (
                <div
                  key={request.id}
                  id={`request-${request.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4"
                >
                  <div className="space-y-3">
                    <p className="font-medium">学生: {request.studentName}</p>
                    
                    <div className="border-l-4 border-yellow-500 pl-3">
                      <p className="text-sm text-gray-600">原始时间:</p>
                      <p className="text-sm">{originalSlot ? formatTimeRange(originalSlot) : '未找到原始时间段'}</p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-sm text-gray-600">目标时间:</p>
                      <p className="text-sm">{targetSlot ? formatTimeRange(targetSlot) : '未找到目标时间段'}</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">修改原因:</p>
                      <p className="text-sm">{request.courseContent}</p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        批准
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}; 