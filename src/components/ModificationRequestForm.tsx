import React, { useState } from 'react';
import { TimeSlot } from '../types';

interface ModificationRequestFormProps {
  originalSlot: TimeSlot;
  availableSlots: TimeSlot[];
  onSubmit: (targetSlotId: string, reason: string) => Promise<void>;
}

export const ModificationRequestForm: React.FC<ModificationRequestFormProps> = ({
  originalSlot,
  availableSlots,
  onSubmit
}) => {
  const [targetSlotId, setTargetSlotId] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(targetSlotId, reason);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">申请修改课程时间</h3>
      <div className="mb-4 text-sm text-gray-600">
        原始时间: {new Date(originalSlot.startTime).toLocaleString()} - {new Date(originalSlot.endTime).toLocaleString()}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">新时间段</label>
          <select
            value={targetSlotId}
            onChange={(e) => setTargetSlotId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">请选择新的时间段</option>
            {availableSlots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.startTime).toLocaleString()} - {new Date(slot.endTime).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">修改原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          提交修改请求
        </button>
      </form>
    </div>
  );
}; 