# Digital Campus - Complete Project Analysis

## Project Overview

**Digital Campus** is a comprehensive College ERP (Enterprise Resource Planning) system designed to streamline academic operations for educational institutions. It's a full-stack MERN (MongoDB, Express, React, Node.js) application with real-time communication capabilities and AI-powered features.

---

## 🏗️ Architecture & Tech Stack

### Backend Stack
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time Communication**: Socket.IO
- **File Upload**: Multer
- **Email Service**: Nodemailer
- **AI Integration**: 
  - OpenRouter API (multiple free-tier models)
  - Groq SDK (Compound-beta-mini model)
- **Testing**: Jest, Supertest, MongoDB Memory Server
- **Development**: Nodemon for hot-reloading

### Frontend Stack
- **Framework**: React 19.1.0
- **Routing**: React Router DOM v7.6.2
- **UI Framework**: Bootstrap 5.3.7 + React-Bootstrap 2.10.10
- **Animations**: Framer Motion 12.19.2
- **HTTP Client**: Axios 1.10.0
- **Real-time**: Socket.IO Client 4.8.1
- **Notifications**: React-Toastify 11.0.5
- **Markdown Rendering**: React-Markdown 8.0.7
- **Build Tool**: Create React App (React Scripts 5.0.1)

### Database Architecture
- **MongoDB** running on localhost (port 27017)
- Database Name: `digital_campus`

---

## 👥 User Roles & Hierarchy

The system implements a **4-tier role hierarchy**:

### 1. **Super Admin** (`role: 'admin'`)
   - Highest level of access
   - Manages entire system
   - Creates/manages departments
   - Manages department admins
   - System-wide analytics and oversight
   - Default credentials: admin@gmail.com / admin

### 2. **Department Admin** (`role: 'departmentAdmin'`)
   - Manages a specific department
   - Handles faculty and students within department
   - Creates and manages classes/sections
   - Manages subjects and curriculum
   - Handles department-level grades and results
   - Default temp password: Admin@123

### 3. **Faculty** (`role: 'faculty'`)
   - Teaches specific subjects
   - Can be assigned as class teacher
   - Records attendance
   - Submits and manages grades
   - Accesses timetables
   - Communicates with students
   - Default temp password: Faculty@123

### 4. **Student** (`role: 'student'`)
   - Enrolled in a specific class/section
   - Views attendance and grades
   - Accesses timetable
   - Files complaints
   - Participates in chat
   - Views notices
   - Default temp password: Student@123

---

## 📊 Data Models (12 Schemas)

### 1. **User Model** (`models/User.js`)
**Purpose**: Central user management for all roles

**Key Fields**:
- Basic: name, email, password (hashed), role, status (active/inactive)
- Relations: department, class
- Faculty-specific: phone, qualification, experience, designation, isClassTeacher, subjects[]
- Student-specific: rollNumber, semester, address, parentName, parentPhone
- Academic: grades[] (with semester-wise SGPA), cgpa

**Special Features**:
- `seedAdmin()` method: Auto-creates super admin on startup
- Supports semester-wise grade tracking with SGPA
- Cumulative CGPA calculation

### 2. **Department Model** (`models/Department.js`)
**Purpose**: Organizational units (CSE, ECE, EEE, etc.)

**Key Fields**:
- name, code, description
- admins[], faculty[], students[], classes[]
- status (active/inactive)

### 3. **Class Model** (`models/Class.js`)
**Purpose**: Represents sections/divisions (e.g., CSE-A, ECE-B)

**Key Fields**:
- name (A, B, C), fullName (CSE-A)
- department, classTeacher, timetable
- academicYear, semester
- subjects[] (array of {subject: ObjectId, faculty: ObjectId})
- capacity, currentStrength
- students[]

### 4. **Subject Model** (`models/Subject.js`)
**Purpose**: Academic subjects/courses

**Key Fields**:
- name, code, description
- credits (default: 3)
- semester
- department
- faculty[], classes[]

### 5. **Attendance Model** (`models/Attendance.js`)
**Purpose**: Daily attendance tracking

**Key Fields**:
- subject, class, date, periodIndex
- attendance[] (array of {student: ObjectId, status: 'present'/'absent'})

### 6. **Grade Model** (`models/Grade.js`)
**Purpose**: Student academic performance (R22 Regulation)

**Grading System**:
- **Internal Assessment** (40 marks):
  - midExam1 (0-40)
  - midExam2 (0-40)
  - internalMarks: Average of both mid exams
- **External Exam** (60 marks):
  - externalMarks (0-60)
- **Total**: 100 marks
- **Grade Scale**:
  - S: 90-100 (10 GP)
  - A+: 80-89 (9 GP)
  - A: 70-79 (8 GP)
  - B+: 60-69 (7 GP)
  - B: 50-59 (6 GP)
  - P: 40-49 (5 GP)
  - F: <40 (0 GP)

**Special Features**:
- Pre-save hook auto-calculates internal marks, total, grade, and grade points
- Legacy fields for backward compatibility

### 7. **SemesterResult Model** (`models/SemesterResult.js`)
**Purpose**: Comprehensive semester-wise academic results

**Key Fields**:
- student, semester, academicYear, department, class
- totalCredits, earnedCredits, totalGradePoints
- sgpa (Semester GPA: 0-10)
- cumulativeCredits, cumulativeGradePoints, cgpa (Cumulative GPA: 0-10)
- isCompleted, hasBacklog, backlogSubjects[]

**Methods**:
- `calculateResults()`: Computes SGPA from all grades
- `calculateCGPA()`: Computes cumulative GPA from all completed semesters

### 8. **Timetable Model** (`models/Timetable.js`)
**Purpose**: Weekly schedule for classes

**Structure**:
- class, department, academicYear, semester
- schedule[] (array of days):
  - day (monday-saturday)
  - periods[] (array of periods):
    - subject, faculty
    - startTime, endTime
    - room
    - type (class/break/lunch)

### 9. **Notice Model** (`models/Notice.js`)
**Purpose**: Announcements and notices

**Key Fields**:
- title, content, category (General/Academic/Events/Emergency/Department-specific)
- priority (Low/Medium/High/Urgent)
- createdBy, department
- **Targeting**:
  - targetAudience (All/Department/Class/Role)
  - targetDepartments[], targetClasses[], targetRoles[]
- attachments[] (fileName, fileUrl, fileSize, fileType)
- scheduledFor, expiresAt
- isPublished, publishedAt, isArchived
- readBy[] (tracking who read the notice)
- viewCount, emailSent

### 10. **Complaint Model** (`models/Complaint.js`)
**Purpose**: Grievance management system

**Key Fields**:
- trackingNumber (auto-generated: COMP-YYYY-XXXX)
- createdBy, against, department
- category (Academic/Behavioral/Infrastructure/Administrative/Other)
- priority (Low/Medium/High/Critical)
- title, description, isAnonymous
- status (open/in progress/resolved/closed)
- statusHistory[] (audit trail)
- assignedTo, escalatedTo
- responses[], internalNotes[]
- attachments[]
- satisfactionRating (1-5), satisfactionComment
- resolutionTime (in hours)

**Special Features**:
- Pre-save hook generates unique tracking number
- Indexed for efficient querying (trackingNumber, status, priority, assignedTo)

### 11. **Chat Model** (`models/Chat.js`)
**Purpose**: Manages chat rooms/conversations

**Key Fields**:
- chatType (one-on-one/group)
- participants[]
- Group-specific: groupName, groupDescription, groupAdmin
- lastMessage, lastMessageAt
- unreadCount (Map of userId -> count)
- mutedBy[], blockedUsers[]
- monitoredBy (admin oversight)
- encryptionKey
- retentionPolicy (7days/30days/90days/1year/permanent)

### 12. **ChatMessage Model** (`models/ChatMessage.js`)
**Purpose**: Individual chat messages

**Key Fields**:
- sender, receiver, chatRoom
- messageType (text/image/file/emoji)
- content, fileUrl, fileName, fileSize
- status (sent/delivered/read)
- readAt
- isDeleted, deletedAt, deletedBy

---

## 🎯 Core Features & Functionality

### 1. **Authentication & Authorization**
- JWT-based token authentication (1-hour expiry)
- Role-based access control (RBAC)
- First-login password change enforcement
- Protected routes with role validation
- Middleware: `middlewares/auth.js`

### 2. **Department Management** (Admin)
**Endpoints**: `/api/department/*`
- Create, update, delete departments
- Assign department admins
- View department overview and statistics
- Manage department status (active/inactive)

**Controllers**: `departmentController.js`, `departmentAdminController.js`

### 3. **Class Management** (Department Admin)
**Endpoints**: `/api/department-admin/*`, `/api/class/*`
- Create classes/sections per department
- Assign class teachers
- Map subjects to classes with faculty assignments
- Manage class capacity and students
- Academic year and semester tracking

**Features**:
- Full name generation (e.g., CSE-A)
- Subject-faculty mapping per class
- Duplicate prevention (name + year + semester)

### 4. **User Management**
**Endpoints**: `/api/user/*`
- CRUD operations for students, faculty, department admins
- Bulk user creation support
- Status management (activate/deactivate)
- Profile management
- Password reset functionality

**Special Features**:
- Faculty can be designated as class teachers
- Students auto-assigned to classes
- Auto-generated temporary passwords

### 5. **Subject Management** (Department Admin)
**Endpoints**: `/api/subject/*`
- Create subjects with codes
- Set credits (default: 3)
- Assign to semesters
- Link to departments
- Map to classes and faculty

### 6. **Attendance System** (Faculty)
**Endpoints**: `/api/attendance/*`

**Features**:
- Period-wise attendance tracking
- Date-based recording
- Bulk attendance submission
- Attendance rate calculation
- Student-wise attendance reports
- Class-wise attendance analytics
- Subject-wise attendance tracking

**Controllers**: `attendanceController.js`

### 7. **Grading System** (Faculty & Department Admin)
**Endpoints**: `/api/grade/*`

**Features**:
- **R22 Regulation Compliance**:
  - Mid Exam 1 & 2 entry (0-40 each)
  - Automatic internal marks calculation (average)
  - External marks entry (0-60)
  - Auto-calculation of total, grade, and grade points
- Grade submission and editing
- Grade release mechanism
- Student-wise grade reports
- Class-wise grade analytics
- Subject-wise performance analysis
- Semester result calculation
- SGPA and CGPA computation

**Controllers**: `gradeController.js`, `departmentAdminController.js` (grades section)

### 8. **Result Management**
**Model**: `SemesterResult`

**Automatic Calculations**:
- SGPA calculation per semester
- CGPA calculation across semesters
- Credit tracking (earned vs total)
- Backlog identification
- Pass/Fail determination

**Methods**:
- `calculateResults()`: Processes all grades for a semester
- `calculateCGPA()`: Computes cumulative performance

### 9. **Timetable Management**
**Endpoints**: `/api/timetable/*`

**Features**:
- Weekly schedule creation (Monday-Saturday)
- Period-wise subject allocation
- Faculty assignment per period
- Room allocation
- Break/Lunch period marking
- Class-wise timetables
- Faculty-wise timetables

**Controllers**: `timetableController.js`

### 10. **Notice Board System**
**Endpoints**: `/api/notice/*`

**Features**:
- Notice creation with rich content
- File attachments support
- **Granular Targeting**:
  - All users
  - Specific departments
  - Specific classes
  - Specific roles
- Priority levels
- Category classification
- Scheduled publishing
- Expiration management
- Read tracking (who read, when)
- View count analytics
- Email notifications (optional)
- Archive functionality

**Controllers**: `noticeController.js`

### 11. **Complaint Management System**
**Endpoints**: `/api/complaint/*`

**Comprehensive Features**:
- Complaint submission with tracking numbers
- Anonymous complaint option
- Priority and category classification
- Status workflow (open → in progress → resolved → closed)
- Status history audit trail
- Assignment to responsible person
- Escalation mechanism
- Response tracking
- Internal notes (admin only)
- File attachments
- Satisfaction rating (1-5) after resolution
- Resolution time tracking
- Advanced filtering and search

**Controllers**: `complaintController.js`

### 12. **Real-time Chat System** (Socket.IO)
**Endpoints**: `/api/chat/*`, WebSocket connection

**Features**:
- One-on-one messaging
- Group chats
- Online/offline status tracking
- Typing indicators
- Read receipts
- Message delivery status
- File sharing (images, documents)
- Message deletion
- Chat muting
- User blocking
- Admin monitoring
- Message retention policies

**Implementation**: `sockets/chat.js`

**WebSocket Events**:
- `connection` / `disconnect`
- `join_chat` / `leave_chat`
- `send_message` / `new_message`
- `typing_start` / `typing_stop`
- `mark_read` / `message_read`
- `user_online` / `user_offline`
- `online_users`

### 13. **AI-Powered Features**

#### A. **Course Recommendation System**
**Endpoint**: `/api/course-ai/recommend`

**How it works**:
1. Takes department and subject interests
2. Uses multi-model fallback strategy:
   - Primary: OpenRouter API with free-tier models
   - Fallback: Groq SDK (compound-beta-mini)
3. Generates 5 real course recommendations
4. Each recommendation includes:
   - Course title
   - Description
   - Instructor/Institution
   - Platform (Coursera, Udemy, edX, Khan Academy)
   - Rating
   - Duration
   - Direct search link

**AI Models Used** (OpenRouter):
- google/gemini-2.0-flash-exp:free
- qwen/qwen-2.5-72b-instruct:free
- meta-llama/llama-3.2-3b-instruct:free
- mistralai/mistral-small-3.1-24b:free
- bytedance/yi-1.5-16k-chat:free
- z-ai/glm-4-32b:free

**Controller**: `courseAiController.js`

#### B. **Academic Doubt Solver (AI ChatBot)**
**Endpoint**: `/api/academic-chat/ask`

**Features**:
- AI-powered Q&A for academic queries
- Restricted to academic topics only
- Politely refuses non-academic questions
- Powered by Groq SDK (compound-beta-mini model)
- Concise, student-friendly responses

**Controller**: `academicChatController.js`

### 14. **Dashboard System**
**Endpoint**: `/api/dashboard/*`

**Role-specific Dashboards**:

**Super Admin Dashboard**:
- Total departments
- Total users (all roles)
- Active complaints count
- Published notices count
- Active users count
- Recent activities

**Department Admin Dashboard**:
- Department faculty count
- Department students count
- Department classes count
- Department subjects count
- Recent classes and faculty

**Faculty Dashboard**:
- My classes count
- My students count
- Attendance rate
- Pending grades
- Today's classes
- Attendance due

**Student Dashboard**:
- My attendance rate
- My classes
- My subjects
- My grades count
- Average grade
- Recent activities

**Controllers**: `dashboardController.js`

### 15. **Email Service** (Nodemailer)
**Service**: `services/emailService.js`

**Email Templates**:
- Welcome email (new user)
- Notice notifications
- Complaint updates
- Password reset
- Grade updates
- Attendance alerts
- System maintenance notices

**Features**:
- Bulk email sending with rate limiting
- Target-specific notifications
- HTML templates
- Attachment support
- SMTP configuration via environment variables

---

## 🗂️ Project Structure

```
MajorProj/
├── backend/
│   ├── controllers/         # Business logic
│   │   ├── academicChatController.js    # AI doubt solver
│   │   ├── attendanceController.js      # Attendance management
│   │   ├── authController.js            # Auth (login, register)
│   │   ├── chatController.js            # Chat CRUD operations
│   │   ├── classController.js           # Class management
│   │   ├── complaintController.js       # Complaint system
│   │   ├── courseAiController.js        # AI course recommendations
│   │   ├── dashboardController.js       # Role-based dashboards
│   │   ├── departmentAdminController.js # Dept admin operations
│   │   ├── departmentController.js      # Department management
│   │   ├── gradeController.js           # Grade management
│   │   ├── noticeController.js          # Notice board
│   │   ├── subjectController.js         # Subject management
│   │   ├── timetableController.js       # Timetable management
│   │   └── userController.js            # User CRUD operations
│   ├── middlewares/         # Express middleware
│   │   ├── auth.js                      # JWT authentication
│   │   └── upload.js                    # File upload (Multer)
│   ├── models/              # Mongoose schemas (12 models)
│   │   ├── Attendance.js
│   │   ├── Chat.js
│   │   ├── ChatMessage.js
│   │   ├── Class.js
│   │   ├── Complaint.js
│   │   ├── Department.js
│   │   ├── Grade.js
│   │   ├── Notice.js
│   │   ├── SemesterResult.js
│   │   ├── Subject.js
│   │   ├── Timetable.js
│   │   └── User.js
│   ├── routes/              # API routes
│   │   ├── academicChat.js
│   │   ├── attendance.js
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── class.js
│   │   ├── complaint.js
│   │   ├── courseAi.js
│   │   ├── dashboard.js
│   │   ├── department.js
│   │   ├── departmentAdmin.js
│   │   ├── grade.js
│   │   ├── index.js                     # Main router
│   │   ├── notice.js
│   │   ├── subject.js
│   │   ├── timetable.js
│   │   └── user.js
│   ├── services/            # External services
│   │   └── emailService.js              # Nodemailer email service
│   ├── sockets/             # WebSocket handlers
│   │   └── chat.js                      # Socket.IO chat handler
│   ├── uploads/             # File storage directory
│   ├── .env                 # Environment variables
│   ├── .gitignore
│   ├── package.json         # Backend dependencies
│   └── server.js            # Express app entry point
│
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── api/             # API layer
│   │   │   ├── academicChat.js
│   │   │   ├── axios.js                 # Axios config & interceptors
│   │   │   └── courseAi.js
│   │   ├── components/      # Reusable React components
│   │   │   ├── CourseRecommendations.js
│   │   │   └── ProtectedRoute.js        # Route guard
│   │   ├── contexts/        # React Context providers
│   │   │   └── AuthContext.js           # Authentication context
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useAuth.js               # Auth hook
│   │   ├── pages/           # Page components (32 pages)
│   │   │   ├── AddDepartmentAdmin.js
│   │   │   ├── AiChatBot.js             # AI doubt solver UI
│   │   │   ├── Attendance.js
│   │   │   ├── ChangePassword.js
│   │   │   ├── Chat.js
│   │   │   ├── ChatInterface.js         # Real-time chat UI
│   │   │   ├── Classes.js
│   │   │   ├── Complaints.js
│   │   │   ├── CourseRecommendations.js # AI course recommender UI
│   │   │   ├── Dashboard.js             # Role-based dashboard
│   │   │   ├── DepartmentAdminDashboard.js
│   │   │   ├── DepartmentAdminGrades.js
│   │   │   ├── DepartmentClasses.js
│   │   │   ├── DepartmentFaculty.js
│   │   │   ├── DepartmentStudents.js
│   │   │   ├── DepartmentSubjects.js
│   │   │   ├── Departments.js
│   │   │   ├── DepartmentsOverview.js
│   │   │   ├── FacultyGrades.js
│   │   │   ├── Grades.js
│   │   │   ├── Login.js
│   │   │   ├── ManageDepartmentAdmins.js
│   │   │   ├── ManageDepartments.js
│   │   │   ├── NoticeBoard.js
│   │   │   ├── Profile.js
│   │   │   ├── Register.js
│   │   │   ├── SuperAdminDashboard.js
│   │   │   ├── Timetable.js
│   │   │   ├── TimetableForm.js
│   │   │   └── UserManagement.js
│   │   ├── styles/          # CSS files
│   │   │   ├── app.css
│   │   │   ├── components.css
│   │   │   ├── index.css
│   │   │   └── layout.css
│   │   ├── utils/           # Utility functions
│   │   │   └── toast.js                 # Toast notifications
│   │   ├── App.js           # Main App component
│   │   └── index.js         # React entry point
│   ├── .env                 # Frontend environment variables
│   ├── .gitignore
│   └── package.json         # Frontend dependencies
│
├── creds                    # Credentials file (247 bytes)
└── PROJECT_ANALYSIS.md      # This file
```

---

## 🔐 Security Features

1. **Password Hashing**: bcrypt with salt rounds (10)
2. **JWT Tokens**: 1-hour expiry, stored in localStorage
3. **Role-Based Access Control**: Middleware validates roles
4. **Protected Routes**: Frontend route guards
5. **First-login Password Change**: Enforced for new users
6. **Input Validation**: Server-side validation on all endpoints
7. **Status Management**: Active/inactive user control
8. **Session Management**: Token-based with auto-logout on expiry
9. **File Upload Validation**: Multer with file type and size restrictions
10. **Anonymous Complaints**: Privacy protection for grievances

---

## 📡 API Architecture

### Base URL
- Development: `http://localhost:5000/api`
- Configured via: `REACT_APP_API_URL`

### API Structure
```
/api
├── /auth                 # Authentication
│   ├── POST /login
│   ├── POST /register
│   ├── GET  /me
│   └── POST /change-password
├── /user                 # User management
├── /department           # Department operations
├── /department-admin     # Dept admin operations
├── /class                # Class management
├── /subject              # Subject management
├── /attendance           # Attendance tracking
├── /grade                # Grade management
├── /timetable            # Timetable operations
├── /notice               # Notice board
├── /complaint            # Complaint system
├── /chat                 # Chat CRUD
├── /dashboard            # Dashboard stats
├── /course-ai            # AI course recommendations
└── /academic-chat        # AI doubt solver
```

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🎨 Frontend Architecture

### State Management
- **Global State**: React Context API (AuthContext)
- **Component State**: useState, useEffect hooks
- **Custom Hooks**: useAuth for authentication

### Routing Strategy
- **Public Routes**: Login, Register (redirect if authenticated)
- **Protected Routes**: All other pages (role-based access)
- **Conditional Redirects**: First-login password change enforcement
- **Animated Transitions**: Framer Motion page transitions

### Component Hierarchy
```
App
├── Navigation (role-based navbar)
├── ErrorBoundary (error handling)
└── Routes
    ├── Public Pages
    │   ├── Login
    │   └── Register
    └── Protected Pages
        ├── Dashboard (role-specific)
        ├── Profile
        ├── [Admin Pages]
        ├── [Department Admin Pages]
        ├── [Faculty Pages]
        └── [Student Pages]
```

### API Integration
- **Axios Instance**: Centralized HTTP client
- **Interceptors**:
  - Request: Auto-attach JWT token
  - Response: Handle 401 (auto-logout), 403, 500 errors
- **Error Handling**: Global error handler with toasts

---

## 🚀 Deployment Configuration

### Environment Variables

**Backend (.env)**:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/digital_campus
JWT_SECRET=digitalcampus1234
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Frontend (.env)**:
```env
STUDENT_TEMP_PASSWORD=Student@123
FACULTY_TEMP_PASSWORD=Faculty@123
DEPARTMENT_ADMIN_TEMP_PASSWORD=Admin@123
REACT_APP_API_URL=http://localhost:5000/api
```

### Scripts

**Backend**:
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --watchAll=false"
}
```

**Frontend**:
```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

### Ports
- **Backend**: 5000 (configurable via PORT env var)
- **Frontend**: 3000 (Create React App default)
- **MongoDB**: 27017

---

## 🧪 Testing

### Backend Testing
- **Framework**: Jest
- **HTTP Testing**: Supertest
- **Database**: MongoDB Memory Server (in-memory testing)
- **Coverage**: Available via `npm run test:coverage`

### Test Structure
```
backend/
└── __tests__/
    ├── auth.test.js
    ├── user.test.js
    ├── class.test.js
    └── ...
```

---

## 📊 Key Business Workflows

### 1. **Student Enrollment Flow**
1. Department admin creates class
2. Admin/Dept admin creates student user
3. Student assigned to class automatically
4. Student receives temp password (Student@123)
5. First login → forced password change
6. Access to dashboard, timetable, grades, attendance

### 2. **Grading Workflow (R22 Regulation)**
1. Faculty enters Mid Exam 1 marks (0-40)
2. Faculty enters Mid Exam 2 marks (0-40)
3. System auto-calculates internal marks (average)
4. Faculty enters external marks (0-60)
5. System auto-calculates:
   - Total marks (internal + external)
   - Grade (S/A+/A/B+/B/P/F)
   - Grade points (10/9/8/7/6/5/0)
6. Department admin releases grades
7. System calculates SGPA per semester
8. System calculates CGPA cumulatively

### 3. **Attendance Workflow**
1. Faculty opens class timetable
2. Selects subject, date, and period
3. Marks students as present/absent
4. System stores attendance record
5. Calculates attendance percentage
6. Student views attendance in dashboard
7. Low attendance triggers email alerts (optional)

### 4. **Complaint Resolution Workflow**
1. Student files complaint (anonymous option available)
2. System generates tracking number (COMP-2025-XXXX)
3. Complaint status: Open
4. Admin/Dept Admin assigns to responsible person
5. Status changes: In Progress
6. Responses added to complaint thread
7. Status changes: Resolved
8. Student rates satisfaction (1-5)
9. Status changes: Closed
10. Resolution time calculated
11. Email notifications sent at each stage

### 5. **Notice Broadcasting Workflow**
1. Admin/Dept Admin creates notice
2. Selects target audience:
   - All users
   - Specific departments
   - Specific classes
   - Specific roles
3. Adds attachments (optional)
4. Sets priority and expiration
5. Publishes notice
6. System sends email notifications (if enabled)
7. Users see notice on dashboard
8. System tracks who read the notice
9. Notice expires or archived automatically

---

## 🔄 Real-time Features (Socket.IO)

### WebSocket Architecture
- **Connection**: Authenticated via JWT
- **Rooms**: User-specific, department-specific, role-specific, chat-specific
- **Online Status**: Tracked in Map (userId → userInfo)
- **Socket Mapping**: userId → [socketIds] (multiple devices support)

### Events Implemented
1. **Connection Management**:
   - `connection` → join rooms (user, department, role)
   - `disconnect` → broadcast offline status
   - `online_users` → send online users list

2. **Chat Events**:
   - `join_chat` → join specific chat room
   - `leave_chat` → leave chat room
   - `send_message` → create and broadcast message
   - `new_message` → receive message in chat room
   - `typing_start` / `typing_stop` → typing indicators
   - `mark_read` → mark messages as read
   - `message_read` → notify sender of read receipt

3. **Notice Events**:
   - `subscribe_notices` → subscribe to notice updates
   - `new_notice` → receive notice notification

4. **Status Events**:
   - `user_online` → user came online
   - `user_offline` → user went offline
   - `user_typing` → someone is typing
   - `user_stopped_typing` → typing stopped

---

## 🎯 Unique Selling Points

1. **Comprehensive Role Hierarchy**: 4-tier system with granular permissions
2. **AI Integration**: Course recommendations + Academic doubt solver
3. **R22 Regulation Grading**: Automatic SGPA/CGPA calculation
4. **Real-time Communication**: Instant messaging with status indicators
5. **Complaint Management**: Full-featured ticketing system with tracking
6. **Granular Notice Targeting**: Department/class/role-specific notices
7. **Attendance Tracking**: Period-wise, subject-wise tracking
8. **Email Notifications**: Automated alerts for all major events
9. **Timetable Management**: Weekly schedules with room allocation
10. **Multi-device Support**: Multiple simultaneous sessions

---

## 📈 Scalability Considerations

### Current Limitations
- MongoDB local instance (not clustered)
- File uploads stored locally (not cloud storage)
- Email service SMTP (not queue-based)
- Socket.IO in-memory storage (not Redis-backed)

### Recommended Improvements for Production
1. **Database**: MongoDB Atlas (cloud cluster)
2. **File Storage**: AWS S3 / Azure Blob Storage
3. **Email Queue**: Bull + Redis for background jobs
4. **Socket Storage**: Redis adapter for multi-server support
5. **Caching**: Redis for frequently accessed data
6. **Load Balancing**: Nginx reverse proxy
7. **Session Store**: Redis for distributed sessions
8. **Logging**: Winston + ELK stack
9. **Monitoring**: Prometheus + Grafana
10. **CI/CD**: GitHub Actions / Jenkins

---

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (v5+)
- Git

### Installation Steps

1. **Clone Repository**:
```bash
cd S:\MAJ\MajorProj
```

2. **Backend Setup**:
```bash
cd backend
npm install
# Configure .env file
npm run dev
```

3. **Frontend Setup**:
```bash
cd ../frontend
npm install
# Configure .env file
npm start
```

4. **MongoDB**:
```bash
# Start MongoDB service
# Database: digital_campus
# Port: 27017
```

### First Run
1. Backend auto-creates admin user (admin@gmail.com / admin)
2. Login as admin
3. Create departments
4. Add department admins
5. Let dept admins manage faculty, students, classes

---

## 🐛 Known Issues & TODOs

### Current Gaps
1. **No Email Verification**: Users created without email verification
2. **No Password Recovery**: Forgot password feature missing
3. **Limited File Types**: File upload restricted to images/PDFs
4. **No Bulk Upload**: CSV/Excel import for bulk user creation
5. **No Reports**: PDF/Excel export for grades, attendance
6. **No Calendar Integration**: Events not synced to Google Calendar
7. **No Mobile App**: Web-only, no native mobile apps
8. **No SMS Notifications**: Email only, no SMS alerts
9. **No Payment Integration**: Fee management not implemented
10. **No Exam Module**: Exam scheduling and hall tickets missing

### Potential Enhancements
1. Add forgot password with OTP
2. Implement email verification on registration
3. Add bulk import via CSV/Excel
4. Generate PDF reports (grades, attendance, timetable)
5. Create mobile app (React Native)
6. Integrate SMS gateway for alerts
7. Add fee management module
8. Implement exam module with hall tickets
9. Add calendar integration (Google/Outlook)
10. Implement library management
11. Add hostel/transport management
12. Implement event management
13. Add placement cell module
14. Implement project management
15. Add alumni portal

---

## 📝 Code Quality & Best Practices

### Implemented
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ Input validation
✅ Error handling middleware
✅ CORS enabled
✅ Environment variables
✅ Role-based access control
✅ MongoDB indexes for performance
✅ React Context for state management
✅ Custom hooks for reusability
✅ Axios interceptors
✅ Toast notifications
✅ Animated page transitions
✅ Responsive design (Bootstrap)
✅ WebSocket authentication

### Areas for Improvement
⚠️ Missing API rate limiting
⚠️ No request logging
⚠️ Limited error logging
⚠️ No API documentation (Swagger)
⚠️ Missing unit test coverage
⚠️ No code linting configuration
⚠️ No pre-commit hooks
⚠️ Missing TypeScript types
⚠️ No docker-compose setup
⚠️ No CI/CD pipeline

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

1. **Full-stack Development**: MERN stack mastery
2. **Authentication & Authorization**: JWT, RBAC, protected routes
3. **Real-time Communication**: Socket.IO implementation
4. **Database Design**: 12 interrelated schemas with references
5. **RESTful API Design**: CRUD operations, proper HTTP methods
6. **File Handling**: Multer for uploads
7. **Email Integration**: Nodemailer with templates
8. **AI Integration**: OpenRouter API + Groq SDK
9. **State Management**: React Context API
10. **Responsive Design**: Bootstrap + custom CSS
11. **Error Handling**: Global error handlers
12. **Middleware**: Authentication, file upload
13. **Complex Business Logic**: Grading system, attendance tracking
14. **Automated Calculations**: SGPA/CGPA, grade points
15. **Multi-role System**: 4-tier role hierarchy

---

## 📞 System Access

### Default Credentials
- **Super Admin**: admin@gmail.com / admin

### Temporary Passwords (First Login)
- **Student**: Student@123
- **Faculty**: Faculty@123
- **Department Admin**: Admin@123

### API Base URL
- Development: http://localhost:5000/api
- Frontend: http://localhost:3000

---

## 📚 Dependencies Summary

### Backend (25 dependencies)
- **Core**: express, mongoose, dotenv
- **Auth**: bcrypt, jsonwebtoken
- **Real-time**: socket.io
- **File Upload**: multer
- **Email**: nodemailer
- **AI**: groq-sdk, axios (for OpenRouter)
- **Web Scraping**: cheerio
- **Dev**: jest, mongodb-memory-server, nodemon, supertest

### Frontend (16 dependencies)
- **Core**: react, react-dom, react-router-dom
- **UI**: bootstrap, react-bootstrap, framer-motion
- **HTTP**: axios
- **Real-time**: socket.io-client
- **Notifications**: react-toastify
- **Markdown**: react-markdown
- **Build**: react-scripts

---

## 🏁 Conclusion

**Digital Campus** is a feature-rich, production-ready College ERP system that handles all aspects of academic administration. It's built with modern technologies, follows best practices, and includes innovative AI-powered features. The modular architecture allows for easy maintenance and future enhancements.

The project successfully demonstrates:
- Complex database relationships and data modeling
- Role-based access control with 4-tier hierarchy
- Real-time communication with WebSocket
- AI integration for educational recommendations
- Comprehensive academic workflows (attendance, grades, results)
- Full-featured complaint management
- Granular notice targeting
- Automated email notifications
- Responsive and animated UI

**Technology Maturity**: Production-ready with room for scalability improvements.

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
**Maintainer**: Shaik Saalam
