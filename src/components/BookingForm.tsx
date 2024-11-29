import React, { useState } from 'react';
import { TimeSlot } from '../types';

interface BookingFormProps {
  selectedSlot: TimeSlot;
  onSubmit: (data: {
    studentName: string;
    courseContent: string;
  }) => Promise<void>;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedSlot,
  onSubmit
}) => {
  const [studentName, setStudentName] = useState('');
  const [courseContent, setCourseContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ studentName, courseContent });
    setStudentName('');
    setCourseContent('');
  };

  const startTime = new Date(selectedSlot.startTime).toLocaleString();
  const endTime = new Date(selectedSlot.endTime).toLocaleString();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">预约课程</h3>
      <div className="mb-4 text-sm text-gray-600">
        选择的时间段: {startTime} - {endTime}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">学生姓名</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">课程内容</label>
          <textarea
            value={courseContent}
            onChange={(e) => setCourseContent(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          提交预约
        </button>
      </form>
    </div>
  );
}; 