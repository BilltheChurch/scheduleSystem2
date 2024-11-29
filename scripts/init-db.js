// 连接到 MongoDB
db = connect('mongodb://127.0.0.1:27017/scheduling-app');

// 清空现有数据
db.users.drop();
db.timeslots.drop();
db.schedulerequests.drop();

// 创建测试用户
db.users.insertMany([
  {
    id: '1',
    name: 'teacher',
    password: 'teacher123',
    role: 'teacher'
  },
  {
    id: '2',
    name: 'student1',
    password: 'student123',
    role: 'student'
  }
]);

// 创建索引
db.users.createIndex({ name: 1 }, { unique: true });
db.timeslots.createIndex({ id: 1 }, { unique: true });
db.schedulerequests.createIndex({ id: 1 }, { unique: true });

print("Database initialized successfully!"); 