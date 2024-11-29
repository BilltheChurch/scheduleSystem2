import express from 'express';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { authMiddleware, generateToken, verifyToken } from './auth';
import { User, TimeSlot, ScheduleRequest } from '../types';
import { User as UserModel, TimeSlot as TimeSlotModel, ScheduleRequest as ScheduleRequestModel } from './models';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

// 扩展 Socket 类型
interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap> {
  user?: User;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 移除内存中的数据存储
// let timeSlots: TimeSlot[] = [];
// let scheduleRequests: ScheduleRequest[] = [];

// 修改初始化函数
const initializeData = async () => {
  try {
    // 检查是否有时间段数据，如果没有则创建示例数据
    const slotsCount = await TimeSlotModel.countDocuments();
    if (slotsCount === 0) {
      console.log('No time slots found, database is ready for new data');
    } else {
      console.log(`Found ${slotsCount} existing time slots`);
    }

    // 检查是否有请求数据
    const requestsCount = await ScheduleRequestModel.countDocuments();
    console.log(`Found ${requestsCount} existing schedule requests`);
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// 连接数据库并启动服务器
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scheduling-app')
  .then(async () => {
    console.log('Connected to MongoDB');
    await initializeData();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// 使用环境变量中的端口
const PORT = process.env.PORT || 3000;

// 添加中间件
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(authMiddleware);

// 添加一个转换函数，将 Mongoose 文档转换为 User 类型
const convertToUser = (doc: any): User => {
  if (!doc.id && !doc._id) {
    throw new Error('User document must have an id');
  }
  if (!doc.name) {
    throw new Error('User document must have a name');
  }
  if (!doc.role) {
    throw new Error('User document must have a role');
  }
  
  return {
    id: doc.id || doc._id.toString(),
    name: doc.name,
    role: doc.role as 'student' | 'teacher'
  };
};

// REST API 端点
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  
  try {
    // 先检查数据库连接
    console.log('Database connection state:', mongoose.connection.readyState);
    
    // 查找用户并打印详细信息
    const userDoc = await UserModel.findOne({ name: username });
    console.log('Database query result:', userDoc);
    
    if (!userDoc) {
      console.log('User not found');
      return res.status(401).json({ message: '用户名不存在' });
    }
    
    if (userDoc.password !== password) {
      console.log('Password mismatch');
      return res.status(401).json({ message: '密码错误' });
    }

    const user = convertToUser(userDoc);
    const token = generateToken(user);
    console.log('Login successful:', { user });
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新 WebSocket 身份验证中间件
io.use(async (socket: CustomSocket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('Authenticating socket connection with token:', token);
    
    if (!token) {
      console.log('No token provided');
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token) as User;
    console.log('Decoded token:', decoded);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication error'));
  }
});

// 添加一个函数来获取已处理的请求
const getProcessedRequests = async () => {
  return await ScheduleRequestModel.find({
    status: { $in: ['approved', 'rejected'] }
  }).sort({ _id: -1 }); // 按时间倒序排列
};

io.on('connection', async (socket: CustomSocket) => {
  try {
    // 处理主动请求初始数据
    socket.on('request-initial-data', async () => {
      try {
        const currentTimeSlots = await TimeSlotModel.find();
        const currentRequests = await ScheduleRequestModel.find();
        socket.emit('initial-data', { 
          timeSlots: currentTimeSlots, 
          scheduleRequests: currentRequests 
        });
      } catch (error) {
        console.error('Error sending initial data:', error);
      }
    });

    // 处理教师添加时间段
    socket.on('add-time-slots', async (slots: TimeSlot[]) => {
      console.log('Add time slots request from user:', socket.user);
      
      if (!socket.user) {
        console.error('No user in socket');
        return;
      }
      
      if (socket.user.role !== 'teacher') {
        console.error('Unauthorized: user is not a teacher');
        return;
      }

      try {
        console.log('Processing time slots:', slots);

        const slotsToAdd = slots.map(slot => ({
          id: Math.random().toString(36).substr(2, 9),
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          status: 'free',
          isConfirmed: false
        }));

        const result = await TimeSlotModel.insertMany(slotsToAdd);
        console.log('Inserted time slots:', result);

        const allSlots = await TimeSlotModel.find();
        io.emit('slots-updated', allSlots);
        
        console.log('Broadcast complete');
      } catch (error) {
        console.error('Error adding time slots:', error);
      }
    });

    // 处理删除时间段
    socket.on('delete-time-slot', async (slotId: string) => {
      if (!socket.user || socket.user.role !== 'teacher') return;

      try {
        const slot = await TimeSlotModel.findOne({ id: slotId });
        if (!slot) {
          console.error('Slot not found:', slotId);
          return;
        }

        // 如果是已预约的时间段，需要处理相关的请求
        if (slot.status === 'busy') {
          // 查找并更新所有涉及该时间段的待处理请求
          await ScheduleRequestModel.updateMany(
            {
              $or: [
                { originalSlotId: slotId },
                { targetSlotId: slotId }
              ],
              status: 'pending'
            },
            { $set: { status: 'rejected' } }
          );
        }

        // 删除时间段
        await TimeSlotModel.deleteOne({ id: slotId });

        // 获取并广播更新后的数据
        const updatedSlots = await TimeSlotModel.find();
        const updatedRequests = await ScheduleRequestModel.find();
        io.emit('slots-updated', updatedSlots);
        io.emit('requests-updated', updatedRequests);

        console.log('Time slot deleted successfully:', slotId);
      } catch (error) {
        console.error('Error deleting time slot:', error);
      }
    });

    // 处理预约请求
    socket.on('book-slot', async (data: {
      slotId: string;
      studentId: string;
      studentName: string;
      courseContent: string;
    }) => {
      if (!socket.user) return;
      
      const slot = await TimeSlotModel.findOne({ id: data.slotId });
      if (slot && slot.status === 'free') {
        slot.status = 'busy';
        slot.studentId = data.studentId;
        slot.studentName = data.studentName;
        slot.courseContent = data.courseContent;
        await slot.save();
        
        // 广播更新给所有客户端
        io.emit('slots-updated', await TimeSlotModel.find());
      }
    });

    // 修改处理修改请求的部分
    socket.on('modify-request', async (request: ScheduleRequest) => {
      try {
        // 保存修改请求到据库
        const newRequest = new ScheduleRequestModel(request);
        await newRequest.save();
        
        // 获取并广播最新的请求列表
        const updatedRequests = await ScheduleRequestModel.find();
        io.emit('requests-updated', updatedRequests);
      } catch (error) {
        console.error('Error handling modification request:', error);
      }
    });

    // 处理教师确认预约
    socket.on('confirm-booking', async (slotId: string) => {
      if (!socket.user || socket.user.role !== 'teacher') return;

      try {
        const slot = await TimeSlotModel.findOne({ id: slotId });
        if (slot) {
          slot.isConfirmed = true;
          await slot.save();
          const updatedSlots = await TimeSlotModel.find();
          io.emit('slots-updated', updatedSlots);
        }
      } catch (error) {
        console.error('Error confirming booking:', error);
      }
    });

    // 处理获取已处理请求的请求
    socket.on('request-processed-history', async () => {
      try {
        const processedRequests = await getProcessedRequests();
        socket.emit('processed-history', processedRequests);
      } catch (error) {
        console.error('Error fetching processed requests:', error);
      }
    });

    // 修改 approve-modification 处理器
    socket.on('approve-modification', async (requestId: string) => {
      if (!socket.user || socket.user.role !== 'teacher') return;

      try {
        console.log('Approving modification request:', requestId);
        
        // 查找请求
        const request = await ScheduleRequestModel.findOne({ id: requestId });
        if (!request) {
          console.error('Request not found:', requestId);
          return;
        }

        console.log('Found request:', request);

        // 查找相关的时间段
        const originalSlot = await TimeSlotModel.findOne({ id: request.originalSlotId });
        const targetSlot = await TimeSlotModel.findOne({ id: request.targetSlotId });

        if (!originalSlot || !targetSlot) {
          console.error('Slots not found:', { 
            originalSlotId: request.originalSlotId, 
            targetSlotId: request.targetSlotId 
          });
          return;
        }

        console.log('Found slots:', { originalSlot, targetSlot });

        // 检查目标时间段是否可用
        if (targetSlot.status !== 'free') {
          console.error('Target slot is not free:', targetSlot);
          return;
        }

        // 交换时间段状态
        const studentInfo = {
          studentId: request.studentId,
          studentName: request.studentName,
          courseContent: request.courseContent,
          isConfirmed: true
        };

        // 更新原始时间段 - 变为空闲
        await TimeSlotModel.updateOne(
          { id: originalSlot.id },
          {
            $set: {
              status: 'free',
              studentId: null,
              studentName: null,
              courseContent: null,
              isConfirmed: false
            }
          }
        );

        // 更新目标时间段 - 变为已预约
        await TimeSlotModel.updateOne(
          { id: targetSlot.id },
          {
            $set: {
              status: 'busy',
              ...studentInfo
            }
          }
        );

        // 更新请求状态
        await ScheduleRequestModel.updateOne(
          { id: requestId },
          { 
            $set: { 
              status: 'approved',
              processedAt: new Date()
            } 
          }
        );

        // 获取更新后的数据
        const updatedSlots = await TimeSlotModel.find();
        const updatedRequests = await ScheduleRequestModel.find();

        // 广播更新
        io.emit('slots-updated', updatedSlots);
        io.emit('requests-updated', updatedRequests);

        console.log('Modification request approved successfully');

      } catch (error) {
        console.error('Error approving modification:', error);
      }
    });

    // 修改 reject-modification 处理器
    socket.on('reject-modification', async (requestId: string) => {
      if (!socket.user || socket.user.role !== 'teacher') return;

      try {
        console.log('Rejecting modification request:', requestId);
        
        // 查找请求
        const request = await ScheduleRequestModel.findOne({ id: requestId });
        if (!request) {
          console.error('Request not found:', requestId);
          return;
        }

        // 更新请求状态为拒绝，但不改变任何时间段的状态
        await ScheduleRequestModel.updateOne(
          { id: requestId },
          { 
            $set: { 
              status: 'rejected',
              processedAt: new Date()
            } 
          }
        );

        // 获取更新后的数据
        const updatedRequests = await ScheduleRequestModel.find();
        
        // 广播更新
        io.emit('requests-updated', updatedRequests);

        console.log('Modification request rejected successfully');

      } catch (error) {
        console.error('Error rejecting modification:', error);
      }
    });
  } catch (error) {
    console.error('Error in socket connection:', error);
  }
}); 