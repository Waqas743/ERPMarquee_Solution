import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, X, Trash2, Edit2, ArrowLeft, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Lock, Unlock, Printer } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { getTenantId } from '../utils/session';

const HallBookingCalendar = () => {
  const { hallId } = useParams();
  const navigate = useNavigate();
  const tenantId = getTenantId();
  const [events, setEvents] = useState([]);
  const [hall, setHall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const [formData, setFormData] = useState({
    eventDate: '',
    startTime: '09:00',
    endTime: '23:00',
    isBlocked: true,
    blockReason: '',
    tentativeExpiryTime: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const hallsRes = await fetch(`/api/halls?tenantId=${tenantId}`);
      const halls = await hallsRes.json();
      const currentHall = halls.find((h: any) => h.id === hallId);
      setHall(currentHall);

      const calendarRes = await fetch(`/api/hall-calendar?hallId=${hallId}`);
      const calendarData = await calendarRes.json();
      setEvents(calendarData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hallId]);

  const handleOpenModal = (event: any = null, date: string = '') => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        eventDate: event.eventDate || '',
        startTime: event.startTime || '09:00',
        endTime: event.endTime || '23:00',
        isBlocked: !!event.isBlocked,
        blockReason: event.blockReason || '',
        tentativeExpiryTime: event.tentativeExpiryTime || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        eventDate: date || new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '23:00',
        isBlocked: true,
        blockReason: '',
        tentativeExpiryTime: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingEvent ? `/api/hall-calendar/${editingEvent.id}` : '/api/hall-calendar';
    const method = editingEvent ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, hallId: hallId }),
    });

    if (response.ok) {
      setIsModalOpen(false);
      fetchData();
    } else {
      const data = await response.json();
      alert(data.message || 'Failed to save calendar entry');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.id) {
      const response = await fetch(`/api/hall-calendar/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, id: null });
        fetchData();
      }
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-slate-100 bg-slate-50/30"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter((e: any) => e.eventDate === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div 
          key={day} 
          className={`h-32 border border-slate-100 p-2 relative group hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-indigo-50/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>{day}</span>
            <button 
              onClick={() => handleOpenModal(null, dateStr)}
              className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
            {dayEvents.map((event: any) => (
              <div 
                key={event.id}
                onClick={() => handleOpenModal(event)}
                className={`text-[10px] p-1 rounded border cursor-pointer truncate flex items-center gap-1 ${
                  event.isBlocked 
                    ? 'bg-red-50 border-red-100 text-red-700' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}
              >
                {event.isBlocked ? <Lock size={10} /> : <CalendarIcon size={10} />}
                {event.isBlocked ? (event.blockReason || 'Blocked') : `Booking #${event.bookingId}`}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/halls')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-slate-600 sm:w-6 sm:h-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 truncate">{hall?.hallName} - Calendar</h1>
            <p className="text-xs sm:text-sm text-slate-500">View bookings and manage blocked dates.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
          >
            <Printer size={18} />
            Print Calendar
          </button>
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-white p-1.5 sm:p-1 rounded-xl border border-slate-200 shadow-sm w-full lg:w-auto">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <span className="text-sm font-bold text-slate-900 min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="min-w-[700px] print:min-w-full">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100 print:bg-white print:border-slate-300">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-900">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {renderCalendar()}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEvent ? 'Edit Calendar Entry' : 'Block Date / Add Event'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date</label>
                <input
                  required
                  type="date"
                  value={formData.eventDate}
                  onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Start Time</label>
                  <input
                    required
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">End Time</label>
                  <input
                    required
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-red-500" />
                  <span className="text-sm font-medium text-slate-700">Block this date?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isBlocked: !prev.isBlocked }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    formData.isBlocked 
                      ? 'bg-red-600 text-white shadow-sm' 
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {formData.isBlocked ? <Lock size={16} /> : <Unlock size={16} />}
                  <span className="text-xs font-bold uppercase">{formData.isBlocked ? 'Blocked' : 'Open'}</span>
                </button>
              </div>

              {formData.isBlocked && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Block Reason</label>
                  <input
                    type="text"
                    value={formData.blockReason}
                    onChange={e => setFormData({ ...formData, blockReason: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Maintenance, Personal Event"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation({ isOpen: true, id: editingEvent.id })}
                    className="mr-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingEvent ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Calendar Entry"
        message="Are you sure you want to remove this entry from the calendar?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default HallBookingCalendar;
