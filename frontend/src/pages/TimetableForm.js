import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import "../styles/department-classes.css";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TimetableForm = ({
  classId,
  departmentId,
  semester,
  academicYear,
  className,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [timetableId, setTimetableId] = useState(null);
  const [schedule, setSchedule] = useState(() => {
    const initial = {};
    days.forEach((day) => {
      initial[day.toLowerCase()] = [];
    });
    return initial;
  });
  const [classSubjects, setClassSubjects] = useState([]);

  useEffect(() => {
    if (user?.role !== "departmentAdmin") return;
    fetchSubjects();
    fetchFaculty();
    fetchTimetable();
    if (classId) {
      fetchClassSubjects();
    }
  }, [user, departmentId, classId]);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(
        `/department-admin/subjects-list?departmentId=${departmentId}`
      );
      setSubjects(res.data);
    } catch (err) {
      setSubjects([]);
    }
  };
  const fetchFaculty = async () => {
    try {
      const res = await axios.get(
        `/department-admin/faculty?departmentId=${departmentId}`
      );
      setFaculty(res.data);
    } catch (err) {
      setFaculty([]);
    }
  };
  const fetchTimetable = async () => {
    try {
      const res = await axios.get(`/timetable/class/${classId}`);
      if (res.data && res.data.schedule) {
        setTimetableId(res.data._id);
        // Convert schedule array to object by day
        const sch = {};
        days.forEach((day) => {
          const found = res.data.schedule.find(
            (s) => s.day.toLowerCase() === day.toLowerCase()
          );
          // Normalize period.subject and period.faculty to be IDs
          sch[day.toLowerCase()] = found
            ? found.periods.map((period) => ({
                ...period,
                subject: period.subject?._id || period.subject || "",
                faculty: period.faculty?._id || period.faculty || "",
              }))
            : [];
        });
        setSchedule(sch);
      } else {
        setTimetableId(null);
        setSchedule(() => {
          const initial = {};
          days.forEach((day) => {
            initial[day.toLowerCase()] = [];
          });
          return initial;
        });
      }
    } catch (err) {
      setTimetableId(null);
      setSchedule(() => {
        const initial = {};
        days.forEach((day) => {
          initial[day.toLowerCase()] = [];
        });
        return initial;
      });
    }
  };

  const fetchClassSubjects = async () => {
    try {
      const res = await axios.get(`/class/${classId}`);
      console.log(res.data);
      setClassSubjects(res.data.subjects || []);
    } catch (err) {
      setClassSubjects([]);
    }
  };

  const addPeriod = (day) => {
    setSchedule((sch) => ({
      ...sch,
      [day]: [
        ...sch[day],
        {
          type: "class",
          subject: "",
          faculty: "",
          room: "",
          startTime: "",
          endTime: "",
        },
      ],
    }));
  };
  const removePeriod = (day, idx) => {
    setSchedule((sch) => {
      const arr = [...sch[day]];
      arr.splice(idx, 1);
      return { ...sch, [day]: arr };
    });
  };
  const updatePeriod = (day, idx, field, value) => {
    setSchedule((sch) => {
      const arr = [...sch[day]];
      arr[idx] = { ...arr[idx], [field]: value };
      // If subject changed, auto-fill faculty
      console.log(classSubjects);
      if (field === "subject") {
        const found = classSubjects.find(
          (s) => (s.subject._id || s.subject) === value
        );
        arr[idx].faculty = found ? found.faculty._id || found.faculty : "";
      }
      return { ...sch, [day]: arr };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (timetableId) {
        await axios.put(`/timetable/${timetableId}`, {
          schedule: Object.entries(schedule).map(([day, periods]) => ({
            day,
            periods,
          })),
        });
        setSuccess("Timetable updated successfully!");
      } else {
        await axios.post("/timetable/add", {
          class: classId,
          department: departmentId,
          semester,
          academicYear,
          schedule: Object.entries(schedule).map(([day, periods]) => ({
            day,
            periods,
          })),
        });
        setSuccess("Timetable created successfully!");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!timetableId) return;
    if (!window.confirm("Are you sure you want to delete this timetable?"))
      return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.delete(`/timetable/delete/${timetableId}`);
      setSuccess("Timetable deleted successfully!");
      setTimetableId(null);
      setSchedule(() => {
        const initial = {};
        days.forEach((day) => {
          initial[day.toLowerCase()] = [];
        });
        return initial;
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete timetable");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "departmentAdmin") return <div>Access denied.</div>;

  return (
    <div className="timetable-form-container">
      <h2>
        {timetableId ? "Edit" : "Create"} Timetable for {className} ({semester},{" "}
        {academicYear})
        <br />
        <p style={{ color: "red" }}>Note: select time in 24 hour format</p>
      </h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleSubmit}>
        {days.map((day) => (
          <div key={day} className="day-schedule">
            <h4>{day } <span style={{ color: "gray" }}>    (select time in 24 hour format)</span></h4>
            {schedule[day.toLowerCase()].map((period, idx) => (
              <div key={idx} className="period-row">
                <select
                  value={period.type}
                  onChange={(e) =>
                    updatePeriod(day.toLowerCase(), idx, "type", e.target.value)
                  }
                >
                  <option value="class">Class</option>
                  <option value="break">Break</option>
                  <option value="lunch">Lunch</option>
                </select>
                <input
                  type="time"
                  value={period.startTime}
                  onChange={(e) =>
                    updatePeriod(
                      day.toLowerCase(),
                      idx,
                      "startTime",
                      e.target.value
                    )
                  }
                  required
                />
                <input
                  type="time"
                  value={period.endTime}
                  onChange={(e) =>
                    updatePeriod(
                      day.toLowerCase(),
                      idx,
                      "endTime",
                      e.target.value
                    )
                  }
                  required
                />
                {console.log(period)}
                {period.type === "class" && (
                  <>
                    <select
                      value={period.subject}
                      onChange={(e) =>
                        updatePeriod(
                          day.toLowerCase(),
                          idx,
                          "subject",
                          e.target.value
                        )
                      }
                      required
                    >
                      {console.log(classSubjects)}
                      <option value="">Select Subject</option>
                      {classSubjects.map((s) => (
                        <option key={s.subject} value={s.subject}>
                          {subjects.find((sub) => sub._id === s.subject)
                            ?.name || s.subject}
                        </option>
                      ))}
                    </select>
                    {/* Faculty is auto-filled, show as read-only */}
                    {period.subject && period.subject !== "" && (
                      <input
                        type="text"
                        value={(() => {
                          const found = classSubjects.find(
                            (s) =>
                              (s.subject._id || s.subject) === period.subject
                          );
                          return (
                            faculty?.find((f) => f._id === found?.faculty)
                              ?.name || ""
                          );
                        })()}
                        readOnly
                        placeholder="Faculty"
                        style={{ width: 120, background: "#f0f0f0" }}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Room"
                      value={period.room}
                      onChange={(e) =>
                        updatePeriod(
                          day.toLowerCase(),
                          idx,
                          "room",
                          e.target.value
                        )
                      }
                      required
                    />
                  </>
                )}
                {(period.type === "break" || period.type === "lunch") && (
                  <span className="break-label">
                    {period.type === "break" ? "Break" : "Lunch"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePeriod(day.toLowerCase(), idx)}
                >
                  Remove
                </button>
              </div>
            ))}
            {schedule[day.toLowerCase()].length < 8 && (
              <button
                type="button"
                onClick={() => addPeriod(day.toLowerCase())}
              >
                Add Period
              </button>
            )}
          </div>
        ))}
        <button type="submit" disabled={loading}>
          {loading
            ? timetableId
              ? "Updating..."
              : "Saving..."
            : timetableId
            ? "Update Timetable"
            : "Create Timetable"}
        </button>
        {timetableId && (
          <button
            type="button"
            style={{
              marginLeft: 12,
              background: "#dc3545",
              color: "#fff",
              padding: 10,
              margin: "auto",
            }}
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Timetable
          </button>
        )}
      </form>
    </div>
  );
};

export default TimetableForm;
