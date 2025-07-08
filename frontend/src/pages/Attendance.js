import React, { useEffect, useState } from "react";
import "../styles/attendance.css";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import { handleSuccess } from "../utils/toast";

const EditIcon = () => (
  <span role="img" aria-label="edit" style={{ cursor: 'pointer', color: '#1976d2' }}>✏️</span>
);
const SaveIcon = () => (
  <span role="img" aria-label="save" style={{ cursor: 'pointer', color: '#388e3c' }}>✔️</span>
);

export default function Attendance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]); // Assigned classes
  const [selectedClass, setSelectedClass] = useState("");
  const [timetable, setTimetable] = useState(null); // Timetable for selected class
  const [periods, setPeriods] = useState([]); // Periods for selected date
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState("");
  const [students, setStudents] = useState([]); // Students in selected class
  const [attendance, setAttendance] = useState({}); // { studentId: 'present'|'absent' }
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitted, setSubmitted] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState([]); // [{ student, status }]
  const [isEditing, setIsEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [editRow, setEditRow] = useState({}); // { studentId: true/false }
  const [pendingStatus, setPendingStatus] = useState({}); // { studentId: 'present'|'absent' }
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, percentage: 0 });

  useEffect(() => {
    if (user.role === "faculty") {
      fetchAssignedClasses();
    }
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable(selectedClass);
      setSelectedPeriodIndex("");
      setAttendance({});
      setAttendanceSummary([]);
      setSubmitted(false);
    } else {
      setTimetable(null);
      setPeriods([]);
      setStudents([]);
      setAttendance({});
      setAttendanceSummary([]);
      setSubmitted(false);
    }
    // eslint-disable-next-line
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    if (selectedClass && selectedPeriodIndex !== "") {
      fetchStudents(selectedClass);
      fetchExistingAttendance(selectedClass, selectedDate, selectedPeriodIndex);
    } else {
      setAttendance({});
      setAttendanceSummary([]);
      setSubmitted(false);
    }
    // eslint-disable-next-line
  }, [selectedPeriodIndex]);

  useEffect(() => {
    const fetchStudentAttendance = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/attendance/records?student=${user.id}`);
        setStudentAttendance(res.data);
        // Calculate summary
        console.log(res.data);
        let present = 0, absent = 0, total = 0;
        res.data.forEach(record => {
          (record.attendance || []).forEach(a => {
            if (a.student?._id === user.id) {
              total++;
              if (a.status === 'present') present++;
              else absent++;
            }
          });
        });
        setSummary({ present, absent, percentage: total ? Math.round((present / total) * 100) : 0 });
      } catch (err) {
        setStudentAttendance([]);
        setSummary({ present: 0, absent: 0, percentage: 0 });
        setError("Failed to fetch student attendance");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentAttendance();
  }, [user]);

  const fetchAssignedClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/user/faculty/classes");
      setClasses(res.data);
    } catch (err) {
      setError("Failed to fetch assigned classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/timetable/class/${classId}`);
      setTimetable(res.data);
      // Find periods for the selected date (day of week)
      const dateObj = new Date(selectedDate);
      const dayOfWeek = dateObj.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const daySchedule = res.data.schedule.find((s) => s.day === dayOfWeek);
      if (daySchedule) {
        // Only show periods assigned to this faculty
        const facultyPeriods = daySchedule.periods
          .map((period, idx) => ({ ...period, idx }))
          .filter((period) => period.faculty && period.faculty._id === user.id);
        setPeriods(facultyPeriods);
      } else {
        setPeriods([]);
      }
    } catch (err) {
      setError("Failed to fetch timetable");
      setTimetable(null);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/class/${classId}/students`);
      setStudents(res.data);
    } catch (err) {
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async (classId, date, periodIndex) => {
    setLoading(true);
    try {
      const res = await axios.get("/attendance/records", {
        params: { class: classId, date, periodIndex },
      });
      if (res.data && res.data.length > 0 && res.data[0].attendance) {
        console.log(res.data);
        const attObj = {};
        res.data[0].attendance.forEach((a) => {
          console.log(a);
          attObj[a.student?._id] = a.status;
        });
        console.log(attObj);
        setAttendance(attObj);
        setAttendanceSummary(res.data[0].attendance);
        setSubmitted(true);
        setIsEditing(false);
        setLastUpdated(res.data[0].updatedAt || res.data[0].createdAt || "");
      } else {
        setAttendance({});
        setAttendanceSummary([]);
        setSubmitted(false);
        setIsEditing(false);
        setLastUpdated("");
      }
    } catch (err) {
      setAttendance({});
      setAttendanceSummary([]);
      setSubmitted(false);
      setIsEditing(false);
      setLastUpdated("");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async () => {
    setSuccess("");
    setError("");
    setLoading(true);
    const attArr = Object.entries(attendance).map(
      ([student, status]) => ({
        student: typeof student === "object" && student._id ? student._id : student,
        status,
      })
    );
    try {
      await axios.post("/attendance/faculty/mark", {
        timetableId: timetable._id,
        periodIndex: selectedPeriodIndex,
        date: selectedDate,
        attendance: attArr,
      });
      setSuccess("Attendance marked successfully!");
      // Always fetch latest attendance after submit
      await fetchExistingAttendance(selectedClass, selectedDate, selectedPeriodIndex);
      handleSuccess("Attendance marked successfully!");
    } catch (err) {
      setError("Failed to mark attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSuccess("");
    setError("");
    setLoading(true);
    const attArr = Object.entries(attendance).map(
      ([student, status]) => ({
        student: typeof student === "object" && student._id ? student._id : student,
        status,
      })
    );
    try {
      await axios.post("/attendance/faculty/mark", {
        timetableId: timetable._id,
        periodIndex: selectedPeriodIndex,
        date: selectedDate,
        attendance: attArr,
      });
      setSuccess("Attendance updated successfully!");
      setAttendanceSummary(attArr);
      setSubmitted(true);
      setIsEditing(false);
      handleSuccess("Attendance updated successfully!");
    } catch (err) {
      setError("Failed to update attendance");
      if (window && window.toast) window.toast.error("Failed to update attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (studentId) => {
    setEditRow((prev) => ({ ...prev, [studentId]: true }));
    setPendingStatus((prev) => ({ ...prev, [studentId]: attendance[studentId] }));
  };

  const handlePendingStatusChange = (studentId, status) => {
    setPendingStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveRow = async (studentId) => {
    setLoading(true);
    setError("");
    try {
      // Prepare updated attendance array: use pendingStatus for this student, rest from attendance
      const attArr = Object.entries(attendance).map(([id, status]) => ({
        student: typeof id === "object" && id._id ? id._id : id,
        status: id === studentId ? pendingStatus[studentId] : status,
      }));
      await axios.post("/attendance/faculty/mark", {
        timetableId: timetable._id,
        periodIndex: selectedPeriodIndex,
        date: selectedDate,
        attendance: attArr,
      });
      // Update local state
      setAttendance((prev) => ({ ...prev, [studentId]: pendingStatus[studentId] }));
      setAttendanceSummary(attArr);
      setEditRow((prev) => ({ ...prev, [studentId]: false }));
      setPendingStatus((prev) => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
      handleSuccess("Attendance updated for student!");
    } catch (err) {
      setError("Failed to update attendance for student");
    } finally {
      setLoading(false);
    }
  };

  if (user.role === 'student') {
    return (
      <div className="attendance-container">
        <button onClick={() => navigate("/dashboard")} className="back-btn">Back to Dashboard</button>
        <div className="attendance-header">
          <h1 className="attendance-title">My Attendance</h1>
          <p className="attendance-subtitle">View your attendance records and summary.</p>
        </div>
        <div className="attendance-summary">
          <div>Present: {summary.present}</div>
          <div>Absent: {summary.absent}</div>
          <div>Attendance Percentage: {summary.percentage}%</div>
        </div>
        <div className="attendance-card">
          <div className="attendance-card-header"><h2>Attendance Records</h2></div>
          <div className="attendance-card-body">
            {loading ? <div>Loading...</div> : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {console.log(studentAttendance)}
                  {studentAttendance.flatMap(record =>
                    (record.attendance || []).filter(a => a.student?._id === user.id).map(a => (
                      <tr key={record._id + a.student?._id}>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{record.class?.fullName || record.class?.name}</td>
                        <td>{record.subject?.name}</td>
                        <td className={a.status === 'present' ? 'present' : 'absent'}>{a.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "faculty") {
    return (
      <div className="attendance-container">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          Back to Dashboard
        </button>
        <div className="attendance-header">
          <h1 className="attendance-title">Attendance</h1>
          <p className="attendance-subtitle">
            Track and manage your attendance records here.
          </p>
        </div>
        <div className="attendance-card">
          <div className="attendance-card-header">
            <h2 className="attendance-card-title">Attendance</h2>
          </div>
          <div className="attendance-card-body">
            <p>Attendance management is only available for faculty.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-container">
      <button onClick={() => navigate("/dashboard")} className="back-btn">
        Back to Dashboard
      </button>
      <div className="attendance-header">
        <h1 className="attendance-title">Attendance</h1>
        <p className="attendance-subtitle">
          Mark attendance for your assigned classes and periods.
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="attendance-date">Select Date: </label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="styled-select"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="class-select">Select Class: </label>
        <select
          id="class-select"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="styled-select"
        >
          <option value="">-- Select --</option>
          {classes.map((cls) => (
            <option key={cls._id} value={cls._id}>
              {cls.fullName} ({cls.semester})
            </option>
          ))}
        </select>
      </div>
      {selectedClass && periods.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="period-select">Select Period: </label>
          <select
            id="period-select"
            value={selectedPeriodIndex}
            onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
            className="styled-select"
          >
            <option value="">-- Select --</option>
            {periods.map((period, idx) => (
              <option key={period.idx} value={period.idx}>
                {period.subject?.name || "No Subject"} ({period.startTime} - {period.endTime})
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : selectedClass && selectedPeriodIndex !== "" && students.length > 0 ? (
        <div className="attendance-card">
          <div className="attendance-card-header">
            <h2 className="attendance-card-title">
              {classes.find((c) => c._id === selectedClass)?.fullName} - Attendance
            </h2>
            {lastUpdated && (
              <div className="attendance-last-updated">Last updated: {new Date(lastUpdated).toLocaleString()}</div>
            )}
          </div>
          <div className="attendance-card-body">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true, sensitivity: "base" }))
                  .map((student) => {
                    const status = attendance[student._id];
                    const isRowEditing = !!editRow[student._id];
                    return (
                      <tr key={student._id}>
                        <td>
                          {student.name} ({student.rollNumber})
                        </td>
                        <td>
                          <input
                            type="radio"
                            name={`att_${student._id}`}
                            checked={(!submitted ? status === "present" : isRowEditing ? pendingStatus[student._id] === "present" : status === "present")}
                            disabled={submitted ? !isRowEditing : false}
                            onChange={() =>
                              !submitted
                                ? handleAttendanceChange(student._id, "present")
                                : handlePendingStatusChange(student._id, "present")
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="radio"
                            name={`att_${student._id}`}
                            checked={(!submitted ? status === "absent" : isRowEditing ? pendingStatus[student._id] === "absent" : status === "absent")}
                            disabled={submitted ? !isRowEditing : false}
                            onChange={() =>
                              !submitted
                                ? handleAttendanceChange(student._id, "absent")
                                : handlePendingStatusChange(student._id, "absent")
                            }
                          />
                        </td>
                        {console.log(status)}
                        <td>
                          {status ? (
                            <span className={`badge badge-${status === "present" ? "present" : "absent"}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          ) : "-"}
                        </td>
                        <td>
                          {submitted && (
                            !isRowEditing ? (
                              <button
                                className="row-edit-btn"
                                onClick={() => handleEditRow(student._id)}
                                title="Edit Attendance"
                              >
                                <EditIcon />
                              </button>
                            ) : (
                              <button
                                className="row-save-btn"
                                onClick={() => handleSaveRow(student._id)}
                                title="Save Attendance"
                                disabled={!pendingStatus[student._id]}
                              >
                                <SaveIcon />
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedClass && selectedPeriodIndex !== "" ? (
        <div>No students found for this class.</div>
      ) : null}
      {selectedClass && selectedPeriodIndex !== "" && students.length > 0 && !submitted && (
        <button
          onClick={handleSubmit}
          className="attendance-submit-btn"
          disabled={Object.keys(attendance).length !== students.length}
        >
          Submit Attendance
        </button>
      )}
    </div>
  );
}
