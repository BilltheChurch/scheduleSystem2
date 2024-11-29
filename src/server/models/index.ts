import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'teacher'] }
});

const timeSlotSchema = new mongoose.Schema({
  id: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, required: true, enum: ['free', 'busy'] },
  studentId: String,
  studentName: String,
  courseContent: String,
  isConfirmed: { type: Boolean, default: false }
});

const scheduleRequestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  originalSlotId: String,
  targetSlotId: { type: String, required: true },
  courseContent: { type: String, required: true },
  status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'] },
  requestType: { type: String, required: true, enum: ['new', 'modify'] },
  processedAt: { type: Date }
});

userSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

// 添加索引以提高查询性能
timeSlotSchema.index({ startTime: 1, endTime: 1 });
timeSlotSchema.index({ status: 1 });
timeSlotSchema.index({ studentId: 1 });

scheduleRequestSchema.index({ studentId: 1 });
scheduleRequestSchema.index({ status: 1 });
scheduleRequestSchema.index({ originalSlotId: 1, targetSlotId: 1 });
scheduleRequestSchema.index({ processedAt: -1 });

export const User = mongoose.model('User', userSchema);
export const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
export const ScheduleRequest = mongoose.model('ScheduleRequest', scheduleRequestSchema); 