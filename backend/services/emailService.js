const nodemailer = require('nodemailer');
const User = require('../models/User');
const Notice = require('../models/Notice');
const Complaint = require('../models/Complaint');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to Digital Campus Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Welcome to Digital Campus!</h2>
        <p>Hello ${userName},</p>
        <p>Welcome to the Digital Campus Management System. Your account has been successfully created.</p>
        <p>You can now access all the features available to your role.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  notice: (notice, userName) => ({
    subject: `New Notice: ${notice.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">New Notice</h2>
        <p>Hello ${userName},</p>
        <p>A new notice has been published:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${notice.title}</h3>
          <p><strong>Category:</strong> ${notice.category}</p>
          <p><strong>Priority:</strong> ${notice.priority}</p>
          <p>${notice.content}</p>
        </div>
        <p>Please log in to your account to view the complete notice.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  complaintUpdate: (complaint, userName, updateType) => ({
    subject: `Complaint Update: ${complaint.trackingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Complaint Update</h2>
        <p>Hello ${userName},</p>
        <p>Your complaint has been updated:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${complaint.title}</h3>
          <p><strong>Tracking Number:</strong> ${complaint.trackingNumber}</p>
          <p><strong>Status:</strong> ${complaint.status}</p>
          <p><strong>Update:</strong> ${updateType}</p>
        </div>
        <p>Please log in to your account to view the complete details.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  passwordReset: (userName, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You have requested to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  gradeUpdate: (grade, userName) => ({
    subject: `Grade Update: ${grade.subject.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Grade Update</h2>
        <p>Hello ${userName},</p>
        <p>Your grade has been updated:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${grade.subject.name}</h3>
          <p><strong>Grade:</strong> ${grade.grade}</p>
          <p><strong>Type:</strong> ${grade.type}</p>
          <p><strong>Comments:</strong> ${grade.comments || 'No comments'}</p>
        </div>
        <p>Please log in to your account to view all your grades.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  attendanceAlert: (userName, className, date) => ({
    subject: 'Attendance Alert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Attendance Alert</h2>
        <p>Hello ${userName},</p>
        <p>This is a reminder about your attendance:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Class:</strong> ${className}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p>Please ensure regular attendance to maintain good academic standing.</p>
        </div>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  }),

  systemMaintenance: (userName, maintenanceInfo) => ({
    subject: 'System Maintenance Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">System Maintenance Notice</h2>
        <p>Hello ${userName},</p>
        <p>The Digital Campus system will be under maintenance:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Date:</strong> ${maintenanceInfo.date}</p>
          <p><strong>Time:</strong> ${maintenanceInfo.time}</p>
          <p><strong>Duration:</strong> ${maintenanceInfo.duration}</p>
          <p><strong>Reason:</strong> ${maintenanceInfo.reason}</p>
        </div>
        <p>We apologize for any inconvenience caused.</p>
        <p>Best regards,<br>Digital Campus Team</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data = {}) => {
  try {
    const transporter = createTransporter();
    const emailContent = emailTemplates[template](data);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients, template, data = {}) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendEmail(recipient.email, template, { ...data, userName: recipient.name });
    results.push({ recipient, result });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

// Send notice notifications
const sendNoticeNotifications = async (notice) => {
  try {
    let recipients = [];
    
    // Determine recipients based on target audience
    if (notice.targetAudience === 'All') {
      recipients = await User.find({ status: 'active' }).select('email name');
    } else if (notice.targetAudience === 'Department' && notice.targetDepartments) {
      recipients = await User.find({
        department: { $in: notice.targetDepartments },
        status: 'active'
      }).select('email name');
    } else if (notice.targetAudience === 'Class' && notice.targetClasses) {
      recipients = await User.find({
        class: { $in: notice.targetClasses },
        status: 'active'
      }).select('email name');
    } else if (notice.targetAudience === 'Role' && notice.targetRoles) {
      recipients = await User.find({
        role: { $in: notice.targetRoles },
        status: 'active'
      }).select('email name');
    }

    // Send emails
    const results = await sendBulkEmails(recipients, 'notice', notice);
    
    console.log(`Notice notifications sent to ${results.length} recipients`);
    return results;
  } catch (error) {
    console.error('Error sending notice notifications:', error);
    throw error;
  }
};

// Send complaint notifications
const sendComplaintNotifications = async (complaint, updateType = 'created') => {
  try {
    // Get admins and department admins
    const admins = await User.find({
      role: { $in: ['admin', 'departmentAdmin'] },
      status: 'active'
    }).select('email name');

    // Send notifications
    const results = await sendBulkEmails(admins, 'complaintUpdate', { complaint, updateType });
    
    console.log(`Complaint notifications sent to ${results.length} admins`);
    return results;
  } catch (error) {
    console.error('Error sending complaint notifications:', error);
    throw error;
  }
};

// Send grade notifications
const sendGradeNotifications = async (grade) => {
  try {
    const student = await User.findById(grade.student).select('email name');
    if (!student) return;

    const result = await sendEmail(student.email, 'gradeUpdate', { grade, userName: student.name });
    return result;
  } catch (error) {
    console.error('Error sending grade notification:', error);
    throw error;
  }
};

// Send attendance alerts
const sendAttendanceAlerts = async (studentId, className, date) => {
  try {
    const student = await User.findById(studentId).select('email name');
    if (!student) return;

    const result = await sendEmail(student.email, 'attendanceAlert', {
      userName: student.name,
      className,
      date
    });
    return result;
  } catch (error) {
    console.error('Error sending attendance alert:', error);
    throw error;
  }
};

// Send system maintenance notifications
const sendMaintenanceNotifications = async (maintenanceInfo) => {
  try {
    const users = await User.find({ status: 'active' }).select('email name');
    const results = await sendBulkEmails(users, 'systemMaintenance', maintenanceInfo);
    
    console.log(`Maintenance notifications sent to ${results.length} users`);
    return results;
  } catch (error) {
    console.error('Error sending maintenance notifications:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  try {
    const result = await sendEmail(user.email, 'welcome', user.name);
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const result = await sendEmail(user.email, 'passwordReset', {
      userName: user.name,
      resetLink
    });
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendNoticeNotifications,
  sendComplaintNotifications,
  sendGradeNotifications,
  sendAttendanceAlerts,
  sendMaintenanceNotifications,
  sendWelcomeEmail,
  sendPasswordResetEmail
}; 