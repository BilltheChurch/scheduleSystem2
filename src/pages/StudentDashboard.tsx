import React, { useState, useEffect } from 'react';
import { Calendar } from '../components/Calendar';
import { BookingForm } from '../components/BookingForm';
import { ModificationRequestForm } from '../components/ModificationRequestForm';
import { socketService } from '../services/socket';
import { TimeSlot, ScheduleRequest } from '../types';

export const StudentDashboard: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showModificationForm, setShowModificationForm] = useState(false);
  const user = JSON.parse(localStorage.getItem('student_user') || '{}');

  useEffect(() => {
    // 监听初始数据
    const handleInitialData = (data: { timeSlots: TimeSlot[], scheduleRequests: ScheduleRequest[] }) => {
      console.log('Received initial data:', data);
      setTimeSlots(data.timeSlots);
    };

    // 监听时间段更新
    const handleSlotsUpdate = (updatedSlots: TimeSlot[]) => {
      console.log('Received updated slots:', updatedSlots);
      setTimeSlots(updatedSlots);
    };

    // 注册监听器
    socketService.socket.on('initial-data', handleInitialData);
    socketService.socket.on('slots-updated', handleSlotsUpdate);

    // 主动请求初始数据
    socketService.socket.emit('request-initial-data');

    // 清理函数
    return () => {
      socketService.socket.off('initial-data', handleInitialData);
      socketService.socket.off('slots-updated', handleSlotsUpdate);
    };
  }, []);

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowModificationForm(slot.status === 'busy' && slot.studentId === user.id);
  };

  const handleBooking = async (data: { studentName: string; courseContent: string }) => {
    if (!selectedSlot) return;
    
    socketService.bookTimeSlot({
      slotId: selectedSlot.id,
      studentId: user.id,
      studentName: data.studentName,
      courseContent: data.courseContent
    });
    
    setSelectedSlot(null);
  };

  const handleModificationRequest = async (targetSlotId: string, reason: string) => {
    if (!selectedSlot) return;
    
    socketService.submitModificationRequest({
      id: Math.random().toString(36).substr(2, 9),
      studentId: user.id,
      studentName: user.name,
      originalSlotId: selectedSlot.id,
      targetSlotId,
      courseContent: reason,
      status: 'pending',
      requestType: 'modify'
    });
    
    setSelectedSlot(null);
    setShowModificationForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">学生面板</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">课程表</h2>
          {timeSlots.length > 0 ? (
            <Calendar
              timeSlots={timeSlots}
              onSlotSelect={handleSlotSelect}
              userRole="student"
              currentUserId={user.id}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无可预约的时间段
            </div>
          )}
        </div>

        {selectedSlot && !showModificationForm && selectedSlot.status === 'free' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">预约课程</h2>
            <BookingForm
              selectedSlot={selectedSlot}
              onSubmit={handleBooking}
            />
          </div>
        )}

        {showModificationForm && selectedSlot && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">申请修改课程时间</h2>
            <ModificationRequestForm
              originalSlot={selectedSlot}
              availableSlots={timeSlots.filter(slot => slot.status === 'free')}
              onSubmit={handleModificationRequest}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 