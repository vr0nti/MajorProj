/**
 * Timetable Export Utilities
 * Functions to export timetables to PDF and Excel formats
 */

// PDF Export using browser print with custom styling
export const exportToPDF = (timetableData, fileName = 'timetable') => {
  // Use browser's print functionality which we've already styled
  window.print();
};

// Excel Export using CSV (no external library needed)
export const exportToExcel = (timetableData, fileName = 'timetable') => {
  if (!timetableData || !timetableData.schedule) {
    alert('No timetable data to export');
    return;
  }

  // Build CSV content
  let csvContent = '';
  
  // Add header with timetable info
  csvContent += `Timetable Export\n`;
  csvContent += `Class: ${timetableData.class?.fullName || timetableData.class?.name || 'N/A'}\n`;
  csvContent += `Department: ${timetableData.department?.name || 'N/A'}\n`;
  csvContent += `Semester: ${timetableData.semester || 'N/A'}\n`;
  csvContent += `Academic Year: ${timetableData.academicYear || 'N/A'}\n`;
  csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

  // Get all unique time slots
  const timeSlots = new Set();
  timetableData.schedule.forEach(daySchedule => {
    daySchedule.periods.forEach(period => {
      timeSlots.add(`${period.startTime}-${period.endTime}`);
    });
  });
  const sortedTimeSlots = Array.from(timeSlots).sort();

  // Create header row
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  csvContent += 'Time,' + days.join(',') + '\n';

  // Create data rows
  sortedTimeSlots.forEach(timeSlot => {
    const [startTime, endTime] = timeSlot.split('-');
    let row = `"${timeSlot}"`;

    days.forEach(day => {
      const daySchedule = timetableData.schedule.find(
        s => s.day.toLowerCase() === day.toLowerCase()
      );
      
      if (daySchedule) {
        const period = daySchedule.periods.find(
          p => `${p.startTime}-${p.endTime}` === timeSlot
        );
        
        if (period) {
          if (period.type === 'class' && period.subject) {
            const subject = period.subject.name || period.subject;
            const faculty = period.faculty?.name || period.faculty || '';
            const room = period.room || '';
            row += `,"${subject}\\n${faculty}\\n${room}"`;
          } else if (period.type === 'break') {
            row += ',"BREAK"';
          } else if (period.type === 'lunch') {
            row += ',"LUNCH"';
          } else {
            row += ',""';
          }
        } else {
          row += ',""';
        }
      } else {
        row += ',""';
      }
    });

    csvContent += row + '\n';
  });

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Export analytics data to Excel
export const exportAnalyticsToExcel = (data, type, fileName) => {
  let csvContent = '';
  
  if (type === 'faculty') {
    // Faculty Workload Export
    csvContent += 'Faculty Workload Report\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += 'Faculty Name,Total Hours,Periods Count,Classes Count,Subjects Count,Workload Status\n';
    
    data.forEach(faculty => {
      const status = faculty.totalHours < 10 ? 'Light' : 
                     faculty.totalHours < 20 ? 'Moderate' : 'Heavy';
      csvContent += `"${faculty.facultyName}",${faculty.totalHours},${faculty.periodsCount},${faculty.classesCount},${faculty.subjectsCount},"${status}"\n`;
    });
    
    // Add detailed breakdown
    csvContent += '\n\nDetailed Breakdown\n';
    csvContent += 'Faculty Name,Classes,Subjects\n';
    data.forEach(faculty => {
      csvContent += `"${faculty.facultyName}","${faculty.classes.join('; ')}","${faculty.subjects.join('; ')}"\n`;
    });
    
  } else if (type === 'room') {
    // Room Utilization Export
    csvContent += 'Room Utilization Report\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += 'Room,Total Hours,Periods Count,Classes Count,Utilization %,Status\n';
    
    data.forEach(room => {
      const status = room.utilizationPercentage < 40 ? 'Under-utilized' : 
                     room.utilizationPercentage < 70 ? 'Optimal' : 'Over-utilized';
      csvContent += `"${room.room}",${room.totalHours},${room.periodsCount},${room.classesCount},${room.utilizationPercentage}%,"${status}"\n`;
    });
    
    // Add detailed breakdown
    csvContent += '\n\nDetailed Breakdown\n';
    csvContent += 'Room,Classes Using Room\n';
    data.forEach(room => {
      csvContent += `"${room.room}","${room.classes.join('; ')}"\n`;
    });
  }

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Export faculty timetable to Excel
export const exportFacultyTimetableToExcel = (timetableData, facultyName, fileName = 'faculty_timetable') => {
  let csvContent = '';
  
  csvContent += `Faculty Timetable Export\n`;
  csvContent += `Faculty: ${facultyName}\n`;
  csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

  // Extract all periods for this faculty
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const periods = [];
  
  if (Array.isArray(timetableData)) {
    timetableData.forEach(tt => {
      tt.schedule?.forEach(daySchedule => {
        daySchedule.periods.forEach((period, idx) => {
          if (period.type === 'class' && period.subject) {
            periods.push({
              day: daySchedule.day,
              time: `${period.startTime}-${period.endTime}`,
              subject: period.subject?.name || period.subject,
              class: tt.class?.fullName || tt.class?.name || 'N/A',
              room: period.room || 'N/A',
              department: tt.department?.name || 'N/A'
            });
          }
        });
      });
    });
  }

  // Group by time slots
  const timeSlots = [...new Set(periods.map(p => p.time))].sort();
  
  csvContent += 'Time,' + days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(',') + '\n';
  
  timeSlots.forEach(timeSlot => {
    let row = `"${timeSlot}"`;
    
    days.forEach(day => {
      const period = periods.find(p => p.day === day && p.time === timeSlot);
      if (period) {
        row += `,"${period.subject}\\n${period.class}\\n${period.room}"`;
      } else {
        row += ',""';
      }
    });
    
    csvContent += row + '\n';
  });

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
