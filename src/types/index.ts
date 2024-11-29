export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  status: 'free' | 'busy';
  studentId?: string;
  studentName?: string;
  courseContent?: string;
  isConfirmed: boolean;
}

export interface ScheduleRequest {
  id: string;
  studentId: string;
  studentName: string;
  originalSlotId?: string; // 如果是修改请求，则包含原时间段ID
  targetSlotId: string;
  courseContent: string;
  status: 'pending' | 'approved' | 'rejected';
  requestType: 'new' | 'modify';
}

export interface User {
  id: string;
  name: string;
  password?: string;
  role: 'student' | 'teacher';
} 