import React from 'react';
import { TimeSlot, ScheduleRequest } from '../types';

interface CalendarProps {
  timeSlots: TimeSlot[];
  requests?: ScheduleRequest[];
  onSlotSelect: (slot: TimeSlot) => void;
  userRole: 'student' | 'teacher';
  currentUserId: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  timeSlots,
  requests = [],
  onSlotSelect,
  userRole,
  currentUserId
}) => {
  // 按日期对时间段进行分组
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const date = new Date(slot.startTime).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const renderTimeSlot = (slot: TimeSlot) => {
    const isSelectable = slot.status === 'free' || 
      (userRole === 'teacher') ||
      (slot.studentId === currentUserId);
    
    // 查找与此时间段相关的修改请求
    const relatedRequests = requests.filter(req => 
      (req.originalSlotId === slot.id || req.targetSlotId === slot.id) && 
      req.status === 'pending'
    );
    
    const slotColor = slot.status === 'free' 
      ? 'bg-green-100 hover:bg-green-200' 
      : slot.isConfirmed 
        ? 'bg-red-100' 
        : 'bg-yellow-100';
    
    const startTime = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div
        key={slot.id}
        onClick={() => isSelectable && onSlotSelect(slot)}
        className={`relative p-3 m-1 rounded-lg shadow ${slotColor} ${
          isSelectable ? 'cursor-pointer transform hover:scale-105 transition-transform' : 'cursor-not-allowed opacity-50'
        } ${relatedRequests.length > 0 ? 'ring-2 ring-offset-2' : ''}`}
      >
        <div className="font-semibold">{`${startTime} - ${endTime}`}</div>
        {slot.studentName && (userRole === 'teacher' || slot.studentId === currentUserId) && (
          <>
            <div className="text-sm text-gray-600">学生: {slot.studentName}</div>
            <div className="text-sm text-gray-600">内容: {slot.courseContent}</div>
            {!slot.isConfirmed && <div className="text-xs text-orange-500">待确认</div>}
          </>
        )}
        
        {/* 显示修改请求指示器 */}
        {relatedRequests.map((request, index) => {
          const isSource = request.originalSlotId === slot.id;
          const targetSlot = timeSlots.find(s => s.id === (isSource ? request.targetSlotId : request.originalSlotId));
          
          if (!targetSlot) return null;

          return (
            <div
              key={`${request.id}-${index}`}
              className={`absolute ${isSource ? '-right-2 top-1/2' : '-left-2 top-1/2'} transform -translate-y-1/2`}
            >
              <div className={`
                w-4 h-4 rounded-full bg-purple-500 
                ${isSource ? 'animate-pulse' : ''}
              `} />
              {userRole === 'teacher' && (
                <div className="absolute top-full mt-1 text-xs whitespace-nowrap bg-white p-1 rounded shadow">
                  {isSource ? '想改到 →' : '← 想改自'}
                  {new Date(targetSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {Object.entries(groupedSlots).map(([date, slots]) => (
        <div key={date} className="mb-6">
          <h3 className="text-lg font-bold mb-2">{date}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map(renderTimeSlot)}
          </div>
        </div>
      ))}
    </div>
  );
}; 