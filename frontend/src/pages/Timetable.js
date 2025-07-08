import React from 'react';
import '../styles/timetable.css';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function Timetable() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timetable, setTimetable] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user.role === 'student' && user.class) {
      axios.get(`/timetable/class/${user.class}`).then(res => {
        setTimetable(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user.role === 'faculty') {
      axios.get(`/timetable/teacher/${user._id}`).then(res => {
      
        setTimetable(res.data); // This is an array of timetables
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  if (user.role === 'student') {
    return (
      <div className="timetable-container">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="back-btn"
        >
          Back to Dashboard
        </button>
        
        <div className="timetable-header">
          <h1 className="timetable-title">My Timetable</h1>
          <p className="timetable-subtitle">View your class schedule below.</p>
        </div>
        {loading ? <div>Loading...</div> : timetable ? (
          <div className="timetable-card">
            <div className="timetable-card-header">
              <h2 className="timetable-card-title">Weekly Timetable</h2>
            </div>
            <div className="timetable-card-body">
              <div className="timetable-grid">
                <div className="timetable-header-cell">Time</div>
                {['Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                  <div className="timetable-header-cell" key={day}>{day}</div>
                ))}
                {/* Render periods for each day */}
                {timetable && timetable.schedule && timetable.schedule[0]?.periods?.map((_, periodIdx) => (
                  <React.Fragment key={periodIdx}>
                    <div className="timetable-time-cell">{timetable.schedule[0].periods[periodIdx].startTime} - {timetable.schedule[0].periods[periodIdx].endTime}</div>
                    {timetable?.schedule?.map(dayObj => {
                      const period = dayObj.periods[periodIdx];
                      return (
                        <div className={`timetable-slot ${period?.subject ? 'has-class' : 'empty'}`} key={dayObj.day+periodIdx}>
                          {period?.subject ? (
                            <>
                              <span className="timetable-class-name">{period.subject?.name}</span>
                              <span className="timetable-class-teacher">{period.faculty?.name}</span>
                              <span className="timetable-class-room">{period.room || ''}</span>
                            </>
                          ) : '-' }
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : <div>No timetable found.</div>}
      </div>
    );
  } else if (user.role === 'faculty') {
    // Merge all periods from all classes into a single table
    // 1. Collect all unique time slots (start-end) and days
    // 2. For each day and time, if multiple, show last (overlap)
    let allPeriods = [];
    let allDays = ['monday','tuesday','wednesday','thursday','friday','saturday'];
    let timeSlots = [];
    console.log("timetable",timetable)
    if (timetable && timetable.length > 0) {
      console.log("timetable",timetable)
      timetable.forEach(tt => {
        if (tt.schedule) {
          console.log("tt.schedule",tt.schedule)
          tt.schedule.forEach(dayObj => {
            // console.log(dayObj)
            console.log("dayObj",dayObj)
            dayObj.periods.forEach((period, idx) => {
              if (period && period.faculty && (period.faculty._id === user._id || period.faculty === user._id)) {
                console.log("period",period)
                // Find time slot for this period
                const timeSlot = tt.schedule[tt.schedule.findIndex(d => d.day === dayObj.day)].periods[idx];
                console.log("tt.schedule[0].periods[idx]",tt.schedule[tt.schedule.findIndex(d => d.day === dayObj.day)].periods[idx])
                console.log("timeSlot1",timeSlot)
                if (timeSlot) {
                  console.log("timeSlot",timeSlot)
                  allPeriods.push({
                    day: dayObj.day,
                    periodIdx: idx,
                    startTime: timeSlot.startTime,
                    endTime: timeSlot.endTime,
                    subject: period.subject,
                    room: period.room,
                    className: tt.class?.name,
                    classFullName: tt.class?.fullName,
                    department: tt.department?.name,
                    academicYear: tt.academicYear,
                    semester: tt.semester
                  });
                  // Collect unique time slots
                  const slotKey = `${timeSlot.startTime}-${timeSlot.endTime}`;
                  console.log("slotKey",slotKey)
                  if (!timeSlots.some(ts => ts.key === slotKey)) {
                    timeSlots.push({
                      key: slotKey,
                      startTime: timeSlot.startTime,
                      endTime: timeSlot.endTime
                    });
                  }
                }
              }
            });
          });
        }
      });
      // Sort timeSlots by startTime
      console.log("timeSlots",timeSlots)
      timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      console.log("timeSlots",timeSlots)
    }
    // Build a map: { [day]: { [slotKey]: periodData } }
    let periodMap = {};
    allDays.forEach(day => { periodMap[day] = {}; });
  
    allPeriods?.forEach(period => {
      const slotKey = `${period.startTime}-${period.endTime}`;
      // Overwrite if overlap: last one stays
      if (period?.day && periodMap[period?.day]) {
        periodMap[period?.day][slotKey] = period;
      }
    });
    return (
      <div className="timetable-container">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="back-btn"
        >
          Back to Dashboard
        </button>
        <div className="timetable-header">
          <h1 className="timetable-title">My Teaching Timetable</h1>
          <p className="timetable-subtitle">All your assigned periods across all classes are shown below.</p>
        </div>
        {loading ? <div>Loading...</div> : timeSlots.length > 0 ? (
          <div className="timetable-card faculty-timetable-card">
            <div className="timetable-card-header">
              <h2 className="timetable-card-title">Weekly Timetable (All Classes)</h2>
            </div>
            <div className="timetable-card-body">
              <table className="timetable-table enhanced">
                <thead>
                  <tr>
                    <th>Time</th>
                    {allDays.map(day => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
        
                  {timeSlots.map((slot, periodIdx) => (
                    <tr key={slot.key}>
                      <td className="timetable-time-cell">{slot.startTime} - {slot.endTime}</td>
                 
                      {allDays.map(day => {
                        const period = periodMap[day][slot.key];
                        return (
                          <td key={day+slot.key} className={`timetable-slot-table ${period ? 'my-period' : 'not-my-period'}`}>
                            {period ? (
                              <div className="period-details">
                                <span className="timetable-class-name">{period.subject?.name}</span><br/>
                                <span className="timetable-class-room">{period.room || ''}</span><br/>
                                <span className="timetable-class-class">{period.department} - {period.className}</span><br/>
                                <span className="timetable-class-meta">{period.academicYear} | {period.semester}</span>
                              </div>
                            ) : <span className="no-period">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div>No assigned periods found.</div>}
      </div>
    );
  }

  return (
    <div className="timetable-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        Back to Dashboard
      </button>
      
      <div className="timetable-header">
        <h1 className="timetable-title">Timetable</h1>
        <p className="timetable-subtitle">View your class schedule below.</p>
      </div>
      <div className="timetable-card">
        <div className="timetable-card-header">
          <h2 className="timetable-card-title">Weekly Timetable</h2>
        </div>
        <div className="timetable-card-body">
          <div className="timetable-grid">
            <div className="timetable-header-cell">Time</div>
            <div className="timetable-header-cell">Mon</div>
            <div className="timetable-header-cell">Tue</div>
            <div className="timetable-header-cell">Wed</div>
            <div className="timetable-header-cell">Thu</div>
            <div className="timetable-header-cell">Fri</div>
            {/* Example timetable slots */}
            <div className="timetable-time-cell">9:00</div>
            <div className="timetable-slot has-class">
              <span className="timetable-class-name">Math</span>
              <span className="timetable-class-teacher">Mr. Smith</span>
              <span className="timetable-class-room">Room 101</span>
            </div>
            <div className="timetable-slot empty">-</div>
            <div className="timetable-slot has-class">
              <span className="timetable-class-name">Physics</span>
              <span className="timetable-class-teacher">Ms. Lee</span>
              <span className="timetable-class-room">Room 102</span>
            </div>
            <div className="timetable-slot empty">-</div>
            <div className="timetable-slot has-class">
              <span className="timetable-class-name">Chemistry</span>
              <span className="timetable-class-teacher">Dr. Brown</span>
              <span className="timetable-class-room">Room 103</span>
            </div>
            {/* Add more rows as needed */}
          </div>
        </div>
      </div>
    </div>
  );
} 