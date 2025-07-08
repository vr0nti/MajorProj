const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const userRouter = require('./user');
const classRouter = require('./class');
const departmentRouter = require('./department');
const subjectRouter = require('./subject');
const timetableRouter = require('./timetable');
const attendanceRouter = require('./attendance');
const noticeRouter = require('./notice');
const complaintRouter = require('./complaint');
const departmentAdminRouter = require('./departmentAdmin');
const gradeRouter = require('./grade');
const chatRouter = require('./chat');
const dashboardRouter = require('./dashboard');
// TODO: Add other routers (class, department, etc.)

router.use('/auth', authRouter);
router.use('/user', userRouter);
router.use('/class', classRouter);
router.use('/department', departmentRouter);
router.use('/subject', subjectRouter);
router.use('/timetable', timetableRouter);
router.use('/attendance', attendanceRouter);
router.use('/notice', noticeRouter);
router.use('/complaint', complaintRouter);
router.use('/department-admin', departmentAdminRouter);
router.use('/grade', gradeRouter);
router.use('/chat', chatRouter);
router.use('/dashboard', dashboardRouter);

module.exports = router; 