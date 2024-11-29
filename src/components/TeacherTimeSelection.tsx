import React, { useState, useRef } from 'react';
import { TimeSlot, ScheduleRequest } from '../types';
import { format, startOfWeek, addDays } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';

interface TeacherTimeSelectionProps {
  onTimeSelect: (slots: TimeSlot[]) => void;
  existingSlots?: TimeSlot[];
  onDeleteSlots?: (slotIds: string[]) => void;
  requests?: ScheduleRequest[];
  onRequestSelect?: (requestId: string) => void;
}

interface TimeBlock {
  startTime: Date;
  endTime: Date;
}

interface ConfirmDialogProps {
  blocks: TimeBlock[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ blocks, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">确认添加以下时间段？</h3>
        <div className="max-h-60 overflow-y-auto mb-4">
          {blocks.map((block, index) => (
            <div key={index} className="py-2 border-b border-gray-200 last:border-0">
              {format(block.startTime, 'MM月dd日 (EEE) HH:mm', { locale: zhCN })} - 
              {format(block.endTime, 'HH:mm', { locale: zhCN })}
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
};

export const TeacherTimeSelection: React.FC<TeacherTimeSelectionProps> = ({
  onTimeSelect,
  existingSlots = [],
  onDeleteSlots,
  requests = [],
  onRequestSelect
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<TimeBlock[]>([]);
  const [selectedExistingSlots, setSelectedExistingSlots] = useState<TimeSlot[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 5; // 5像素的移动阈值
  const [hoveredRequest, setHoveredRequest] = useState<string | null>(null);
  const [visibleRequests, setVisibleRequests] = useState<ScheduleRequest[]>([]);

  // 生成时间网格
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 20:00
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // 检查时间段是否重叠
  const isOverlapping = (startTime: Date, endTime: Date) => {
    return existingSlots.some(slot => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      return (
        (startTime >= slotStart && startTime < slotEnd) ||
        (endTime > slotStart && endTime <= slotEnd) ||
        (startTime <= slotStart && endTime >= slotEnd)
      );
    });
  };

  // 检查是否有待处理的请求
  const hasPendingRequests = requests.some(req => req.status === 'pending');

  // 处理请求点击
  const handleRequestClick = (requestId: string) => {
    // 滚动到对应的请求卡片
    const requestCard = document.getElementById(`request-${requestId}`);
    if (requestCard) {
      requestCard.scrollIntoView({ behavior: 'smooth' });
      requestCard.classList.add('highlight-animation'); // 添加高亮动画
      setTimeout(() => requestCard.classList.remove('highlight-animation'), 2000);
    }
  };

  // 修改鼠标事件处理函数，在有待处理请求时禁用时间段操作
  const handleMouseDown = (e: React.MouseEvent) => {
    if (hasPendingRequests) return;
    if (!gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    setSelectionStart({ x, y });
    setIsSelecting(true);
    setIsDragging(false);

    if (e.ctrlKey || e.metaKey) {
      setIsMultiSelecting(true);
    } else {
      setIsMultiSelecting(false);
      setSelectedBlocks([]);
      setSelectedExistingSlots([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hasPendingRequests) return;
    if (!isSelecting || !mouseDownPos.current || !gridRef.current) return;

    // 计算鼠标移动距离
    const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离超过阈值，开始拖动
    if (!isDragging && distance > DRAG_THRESHOLD) {
      setIsDragging(true);
    }

    // 只有在拖动状态下才处理选择
    if (isDragging) {
      const rect = gridRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const cellWidth = rect.width / 7;
      const cellHeight = rect.height / 12;

      const startCol = Math.max(0, Math.min(6, Math.floor(selectionStart!.x / cellWidth)));
      const startRow = Math.max(0, Math.min(11, Math.floor(selectionStart!.y / cellHeight)));
      const currentCol = Math.max(0, Math.min(6, Math.floor(currentX / cellWidth)));
      const currentRow = Math.max(0, Math.min(11, Math.floor(currentY / cellHeight)));

      const minCol = Math.min(startCol, currentCol);
      const maxCol = Math.max(startCol, currentCol);
      const minRow = Math.min(startRow, currentRow);
      const maxRow = Math.max(startRow, currentRow);

      // 找出选择区域内的所有时间段
      const overlappingSlots = existingSlots.filter(slot => {
        const slotDate = new Date(slot.startTime);
        const slotDay = days.findIndex(d => 
          d.getDate() === slotDate.getDate() &&
          d.getMonth() === slotDate.getMonth()
        );
        const slotHour = hours.indexOf(slotDate.getHours());

        return (
          slot.status === 'free' &&
          slotDay >= minCol &&
          slotDay <= maxCol &&
          slotHour >= minRow &&
          slotHour <= maxRow
        );
      });

      // 更新选中的时间段
      setSelectedExistingSlots(overlappingSlots);

      // 计算新的时间段（排除已存在的）
      const newBlocks: TimeBlock[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const startTime = new Date(days[col]);
          startTime.setHours(hours[row], 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1);

          // 检查是否与现有时间段重叠
          if (!isOverlapping(startTime, endTime)) {
            newBlocks.push({ startTime, endTime });
          }
        }
      }
      setSelectedBlocks(newBlocks);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (hasPendingRequests) return;
    if (!mouseDownPos.current || !gridRef.current) {
      setIsSelecting(false);
      setIsDragging(false);
      mouseDownPos.current = null;
      return;
    }

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算鼠标移动距离
    const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离小于阈值，处理为点击
    if (distance <= DRAG_THRESHOLD) {
      const cellWidth = rect.width / 7;
      const cellHeight = rect.height / 12;
      
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      
      const startTime = new Date(days[col]);
      startTime.setHours(hours[row], 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      // 检查点击的位置是否有现有时间段
      const clickedSlot = existingSlots.find(slot => {
        const slotDate = new Date(slot.startTime);
        const slotDay = days.findIndex(d => 
          d.getDate() === slotDate.getDate() &&
          d.getMonth() === slotDate.getMonth()
        );
        const slotHour = hours.indexOf(slotDate.getHours());
        
        return slotDay === col && slotHour === row && slot.status === 'free';
      });

      if (clickedSlot) {
        // 直接删除已存在的时间段
        onDeleteSlots?.([clickedSlot.id]);
      } else if (!isOverlapping(startTime, endTime)) {
        // 直接添加新的时间段
        const newSlot: TimeSlot = {
          id: Math.random().toString(36).substr(2, 9),
          startTime,
          endTime,
          status: 'free',
          isConfirmed: false
        };
        onTimeSelect([newSlot]);
      }
    } else {
      // 处理拖动选择的结果
      if (selectedExistingSlots.length > 0) {
        if (selectedExistingSlots.length > 1) {
          if (confirm(`是否要删除这 ${selectedExistingSlots.length} 个时间段？`)) {
            onDeleteSlots?.(selectedExistingSlots.map(slot => slot.id));
          }
        } else {
          if (confirm('是否要删除这个时间？')) {
            onDeleteSlots?.(selectedExistingSlots.map(slot => slot.id));
          }
        }
      } else if (selectedBlocks.length > 0) {
        setShowConfirmDialog(true);
      }
    }

    // 重置状态
    setIsSelecting(false);
    setIsDragging(false);
    mouseDownPos.current = null;
  };

  const handleConfirm = () => {
    console.log('Confirming time slots:', selectedBlocks);
    if (selectedBlocks.length === 0) {
      console.log('No blocks selected');
      return;
    }

    const slots: TimeSlot[] = selectedBlocks.map(block => ({
      id: Math.random().toString(36).substr(2, 9),
      startTime: block.startTime,
      endTime: block.endTime,
      status: 'free',
      isConfirmed: false
    }));
    
    console.log('Sending slots to server:', slots);
    onTimeSelect(slots);
    setShowConfirmDialog(false);
    setSelectedBlocks([]);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedBlocks([]);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  // 修改渲染已存在的时间段
  const renderExistingSlot = (slot: TimeSlot) => {
    const dayIndex = days.findIndex(d => 
      d.getDate() === new Date(slot.startTime).getDate() &&
      d.getMonth() === new Date(slot.startTime).getMonth()
    );
    const hourIndex = hours.indexOf(new Date(slot.startTime).getHours());
    
    if (dayIndex === -1 || hourIndex === -1) return null;

    const isSelected = selectedExistingSlots.some(s => s.id === slot.id);
    const slotColor = slot.status === 'free' ? 'bg-green-200' : 'bg-red-200';

    // 检查这个时间段是否与任何待处理的请求相关
    const relatedRequest = requests
      .find(req => 
        (req.originalSlotId === slot.id || req.targetSlotId === slot.id) && 
        req.status === 'pending'
      );

    const isHighlighted = hoveredRequest && 
      relatedRequest && 
      hoveredRequest === relatedRequest.id;

    return (
      <div
        key={slot.id}
        className={`absolute ${slotColor} ${
          isSelected ? 'ring-2 ring-red-500 ring-offset-2' : ''
        } transition-all duration-300`}
        style={{
          left: `${(dayIndex / 7) * 100}%`,
          top: `${(hourIndex / 12) * 100}%`,
          width: `${100 / 7}%`,
          height: `${100 / 12}%`,
          transform: isHighlighted ? 'scale(1.03)' : 'scale(1)',
          transformOrigin: 'center center',
          zIndex: isHighlighted ? 11 : 1
        }}
      >
        {slot.status === 'busy' && (
          <div className={`text-xs p-1 truncate transition-all duration-300 ${
            isHighlighted ? 'font-semibold' : ''
          }`}>
            {slot.studentName}
          </div>
        )}
      </div>
    );
  };

  // 修改渲染选择区域的代码
  const renderSelectionArea = () => {
    if (!isSelecting || selectedBlocks.length === 0) return null;

    return selectedBlocks.map((block, index) => {
      const dayIndex = days.findIndex(d => 
        d.getDate() === block.startTime.getDate() &&
        d.getMonth() === block.startTime.getMonth()
      );
      const hourIndex = hours.indexOf(block.startTime.getHours());
      
      if (dayIndex === -1 || hourIndex === -1) return null;

      return (
        <div
          key={index}
          className="absolute bg-blue-200 ring-2 ring-blue-500 ring-offset-2"
          style={{
            left: `${(dayIndex / 7) * 100}%`,
            top: `${(hourIndex / 12) * 100}%`,
            width: `${100 / 7}%`,
            height: `${100 / 12}%`,
            zIndex: 5,
          }}
        />
      );
    });
  };

  // 添加一个函数来检查请求是否应该显示
  const shouldShowRequest = (request: ScheduleRequest) => {
    if (!request.originalSlotId || !request.targetSlotId) return false;

    const originalSlot = existingSlots.find(slot => slot.id === request.originalSlotId);
    const targetSlot = existingSlots.find(slot => slot.id === request.targetSlotId);

    if (!originalSlot || !targetSlot) return false;

    const originalDate = new Date(originalSlot.startTime);
    const targetDate = new Date(targetSlot.startTime);

    // 检查是否至少有一个时间段在当前视图中
    const isOriginalInView = days.some(day => 
      day.getDate() === originalDate.getDate() &&
      day.getMonth() === originalDate.getMonth()
    );

    const isTargetInView = days.some(day => 
      day.getDate() === targetDate.getDate() &&
      day.getMonth() === targetDate.getMonth()
    );

    return isOriginalInView || isTargetInView;
  };

  // 修改 renderModificationArrows 函数
  const renderModificationArrows = () => {
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;

    return requests
      .filter(request => request.status === 'pending')
      .map(request => {
        const originalSlot = existingSlots.find(slot => slot.id === request.originalSlotId);
        const targetSlot = existingSlots.find(slot => slot.id === request.targetSlotId);
        
        if (!originalSlot || !targetSlot) return null;

        // 计算原始时间段的位置
        const originalDate = new Date(originalSlot.startTime);
        const originalDayIndex = days.findIndex(d => 
          d.getDate() === originalDate.getDate() &&
          d.getMonth() === originalDate.getMonth()
        );
        const originalHourIndex = hours.indexOf(originalDate.getHours());

        // 计算目标时间段的位置
        const targetDate = new Date(targetSlot.startTime);
        const targetDayIndex = days.findIndex(d => 
          d.getDate() === targetDate.getDate() &&
          d.getMonth() === targetDate.getMonth()
        );
        const targetHourIndex = hours.indexOf(targetDate.getHours());

        // 检查是否至少有一个时间段在当前视图中
        const isOriginalInView = originalDayIndex !== -1;
        const isTargetInView = targetDayIndex !== -1;

        if (!isOriginalInView && !isTargetInView) return null;

        // 如果原始时间段不在视图中，使用边缘位置
        const effectiveOriginalDayIndex = isOriginalInView ? originalDayIndex : (originalDate < days[0] ? -1 : 7);
        const effectiveOriginalHourIndex = isOriginalInView ? originalHourIndex : 6;

        // 如果目标时间段不在视图中，使用边缘位置
        const effectiveTargetDayIndex = isTargetInView ? targetDayIndex : (targetDate < days[0] ? -1 : 7);
        const effectiveTargetHourIndex = isTargetInView ? targetHourIndex : 6;

        // 计算箭头的起点和终点
        const startX = isOriginalInView ? 
          ((effectiveOriginalDayIndex + 0.5) / 7) * SVG_WIDTH :
          (originalDate < days[0] ? 0 : SVG_WIDTH);
        
        const startY = isOriginalInView ?
          ((effectiveOriginalHourIndex + 0.5) / 12) * SVG_HEIGHT :
          SVG_HEIGHT / 2;

        const endX = isTargetInView ?
          ((effectiveTargetDayIndex + 0.5) / 7) * SVG_WIDTH :
          (targetDate < days[0] ? 0 : SVG_WIDTH);
        
        const endY = isTargetInView ?
          ((effectiveTargetHourIndex + 0.5) / 12) * SVG_HEIGHT :
          SVG_HEIGHT / 2;

        // 计算控制点
        const controlX = (startX + endX) / 2;
        const controlY1 = startY;
        const controlY2 = endY;

        // 计算信息提示框的位置
        const infoX = (startX + endX) / 2;
        const infoY = (startY + endY) / 2;

        return (
          <div key={request.id} className="absolute inset-0 pointer-events-none">
            {/* 原始时间段高亮 - 仅在视图内显示 */}
            {isOriginalInView && (
              <div
                className="absolute transition-all duration-300 pointer-events-none overflow-visible"
                style={{
                  left: `${(originalDayIndex / 7) * 100}%`,
                  top: `${(originalHourIndex / 12) * 100}%`,
                  width: `${100 / 7}%`,
                  height: `${100 / 12}%`,
                  zIndex: 10,
                  backgroundColor: 'rgba(209, 213, 219, 0.8)',
                  outline: `3px dashed ${
                    hoveredRequest === request.id ? 'rgb(107, 114, 128)' : 'rgba(107, 114, 128, 0.5)'
                  }`,
                  outlineOffset: '0px',
                  transform: hoveredRequest === request.id ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: 'center center'
                }}
              >
                <div className="absolute -top-6 left-0 right-0 text-xs text-center text-gray-600 font-semibold">
                  原程时间
                </div>
              </div>
            )}

            {/* 目标时间段高亮 - 仅在视图内显示 */}
            {isTargetInView && (
              <div
                className="absolute transition-all duration-300 pointer-events-none overflow-visible"
                style={{
                  left: `${(targetDayIndex / 7) * 100}%`,
                  top: `${(targetHourIndex / 12) * 100}%`,
                  width: `${100 / 7}%`,
                  height: `${100 / 12}%`,
                  zIndex: 10,
                  backgroundColor: 'transparent',
                  outline: `3px dashed ${
                    hoveredRequest === request.id ? 'rgb(239, 68, 68)' : 'rgba(239, 68, 68, 0.5)'
                  }`,
                  outlineOffset: '0px',
                  transform: hoveredRequest === request.id ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: 'center center'
                }}
              >
                <div className="absolute -bottom-6 left-0 right-0 text-xs text-center text-red-600 font-semibold">
                  新课程时间
                </div>
              </div>
            )}

            {/* 连接线和箭头 */}
            <svg 
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 15 }}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id={`arrow-${request.id}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={hoveredRequest === request.id ? '#4F46E5' : '#6B7280'} />
                </marker>
              </defs>

              {/* 交互区域（透明路径） */}
              <path
                d={`M ${startX} ${startY} 
                     C ${controlX} ${controlY1},
                       ${controlX} ${controlY2},
                       ${endX} ${endY}`}
                fill="none"
                stroke="transparent"
                strokeWidth="40"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'stroke'
                }}
                onMouseEnter={() => setHoveredRequest(request.id)}
                onMouseLeave={() => setHoveredRequest(null)}
                onClick={() => {
                  onRequestSelect?.(request.id);
                  setHoveredRequest(request.id);
                }}
              />

              {/* 实际显示的箭头路径 */}
              <path
                d={`M ${startX} ${startY} 
                     C ${controlX} ${controlY1},
                       ${controlX} ${controlY2},
                       ${endX} ${endY}`}
                fill="none"
                stroke={hoveredRequest === request.id ? '#4F46E5' : '#6B7280'}
                strokeWidth={hoveredRequest === request.id ? "4" : "2"}
                markerEnd={`url(#arrow-${request.id})`}
                className="transition-all duration-300"
                style={{ pointerEvents: 'none' }}
              />
            </svg>

            {/* 学生信息提示 */}
            <div
              className={`absolute bg-white px-4 py-2 rounded-full shadow-lg text-sm transition-all duration-300 ${
                hoveredRequest === request.id ? 'scale-110' : ''
              }`}
              style={{
                left: `${((originalDayIndex + targetDayIndex + 1) / 14) * 100}%`,
                top: `${((originalHourIndex + targetHourIndex + 1) / 24) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                borderWidth: '2px',
                borderColor: hoveredRequest === request.id ? '#4F46E5' : '#E5E7EB',
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
              onMouseEnter={() => setHoveredRequest(request.id)}
              onMouseLeave={() => setHoveredRequest(null)}
              onClick={() => {
                onRequestSelect?.(request.id);
                setHoveredRequest(request.id);
              }}
            >
              <span className={`font-medium ${hoveredRequest === request.id ? 'text-indigo-600' : 'text-gray-700'}`}>
                {request.studentName}
              </span>
              <span className="text-gray-500 ml-1">申请调课</span>
            </div>

            {/* 修改方向指示器的位置 */}
            {!isOriginalInView && (
              <div 
                className="absolute left-0 transform -translate-y-1/2 bg-indigo-500 text-white px-2 py-1 rounded-r text-sm"
                style={{
                  top: '25%', // 移到上方四分之一处
                  zIndex: 30
                }}
              >
                ← 原时间段在{originalDate < days[0] ? '前一' : '后一'}页
              </div>
            )}
            
            {!isTargetInView && (
              <div 
                className="absolute right-0 transform -translate-y-1/2 bg-indigo-500 text-white px-2 py-1 rounded-l text-sm"
                style={{
                  top: '75%', // 移到下方四分之三处
                  zIndex: 30
                }}
              >
                目标时间段在{targetDate < days[0] ? '前一' : '后一'}页 →
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">时间段管理</h3>
          <div className="flex space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
              <span>空闲时间段</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-200 rounded mr-2"></div>
              <span>已预约时间段</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-200 rounded mr-2"></div>
              <span>选中区域</span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="font-medium">操作说明：</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>单击空白区域：添加单个时间段</li>
              <li>拖动选择：批量添加时间段</li>
              <li>单击已有时间段：删除该时间段</li>
              <li>按住 Ctrl/Command 键：多选时间段</li>
              <li>拖动选择已有时间段：批量删除时间段</li>
            </ul>
          </div>
        </div>

        {hasPendingRequests && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
            有待处理的调课请求，请先处理完这些请求再进行时间段的添加或删除。
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold">
            {format(currentWeek, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            →
          </button>
        </div>

        <div className="relative border border-gray-200 rounded-lg overflow-hidden">
          {/* 星期标题 */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-2 text-center text-gray-500"></div>
            {days.map(day => (
              <div key={day.toISOString()} className="p-2 text-center border-l border-gray-200">
                <div className="font-medium">{format(day, 'E', { locale: zhCN })}</div>
                <div className="text-sm text-gray-500">{format(day, 'MM/dd')}</div>
              </div>
            ))}
          </div>

          {/* 时间网格 */}
          <div className="grid grid-cols-8">
            {/* 时间标签 */}
            <div className="space-y-0">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-12 flex items-center justify-center text-sm text-gray-500 border-b border-gray-200"
                >
                  {`${hour}:00`}
                </div>
              ))}
            </div>

            {/* 可选择的网格 */}
            <div
              ref={gridRef}
              className="col-span-7 relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsSelecting(false);
                setIsDragging(false);
                mouseDownPos.current = null;
                if (!isMultiSelecting) {
                  setSelectedBlocks([]);
                  setSelectedExistingSlots([]);
                }
              }}
            >
              <div className="grid grid-cols-7 absolute inset-0">
                {days.map((day, dayIndex) => (
                  <div key={day.toISOString()} className="border-l border-gray-200">
                    {hours.map((hour, hourIndex) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="h-12 border-b border-gray-200"
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* 渲已存在的时间段 */}
              {existingSlots
                .filter(slot => {
                  const slotDate = new Date(slot.startTime);
                  return days.some(day => 
                    day.getDate() === slotDate.getDate() &&
                    day.getMonth() === slotDate.getMonth()
                  );
                })
                .map(renderExistingSlot)}

              {/* 渲染选择区域 */}
              {renderSelectionArea()}

              {/* 渲染修改请求箭头和高亮 */}
              {renderModificationArrows()}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          单击添加/删除时间段，拖选或按住 Ctrl/Command 键多选
        </div>
        
        <div className="mt-4 space-y-2">
          {selectedBlocks.length > 0 && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              已选择 {selectedBlocks.length} 个新时间段
              <button
                onClick={handleConfirm}
                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                确认添加
              </button>
            </div>
          )}
          {selectedExistingSlots.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              已选择 {selectedExistingSlots.length} 个要删除的时间段
              <button
                onClick={() => onDeleteSlots?.(selectedExistingSlots.map(slot => slot.id))}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          blocks={selectedBlocks}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* 渲染选中要删除的时间段 */}
      {selectedExistingSlots.map(slot => (
        <div
          key={slot.id}
          className="absolute bg-red-300 opacity-50"
          style={{
            left: `${(days.findIndex(d => 
              d.getDate() === new Date(slot.startTime).getDate() &&
              d.getMonth() === new Date(slot.startTime).getMonth()
            ) / 7) * 100}%`,
            top: `${(hours.indexOf(new Date(slot.startTime).getHours()) / 12) * 100}%`,
            width: `${100 / 7}%`,
            height: `${100 / 12}%`,
          }}
        />
      ))}
    </>
  );
}; 