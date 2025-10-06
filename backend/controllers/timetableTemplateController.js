const TimetableTemplate = require("../models/TimetableTemplate");
const Timetable = require("../models/Timetable");

// @desc    Create a new timetable template
// @route   POST /api/timetables/templates
// @access  Super Admin, Department Admin
const createTemplate = async (req, res) => {
  try {
    const { name, description, department, schedule } = req.body;

    // Check if template with same name exists in department
    const existingTemplate = await TimetableTemplate.findOne({
      name,
      department,
      status: "active",
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "Template with this name already exists in the department",
      });
    }

    const template = await TimetableTemplate.create({
      name,
      description,
      department,
      schedule,
      createdBy: req.user._id,
    });

    await template.populate([
      { path: "department", select: "name code" },
      { path: "createdBy", select: "name email" },
      { path: "schedule.periods.subject", select: "name code" },
      { path: "schedule.periods.faculty", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create template",
      error: error.message,
    });
  }
};

// @desc    Get all templates for a department
// @route   GET /api/timetables/templates?department=:id
// @access  Super Admin, Department Admin, Faculty
const getTemplates = async (req, res) => {
  try {
    const { department, status = "active" } = req.query;

    const query = {};
    if (department) query.department = department;
    if (status) query.status = status;

    const templates = await TimetableTemplate.find(query)
      .populate("department", "name code")
      .populate("createdBy", "name email")
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.faculty", "name email")
      .sort("-updatedAt");

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
};

// @desc    Get a single template by ID
// @route   GET /api/timetables/templates/:id
// @access  Super Admin, Department Admin, Faculty
const getTemplateById = async (req, res) => {
  try {
    const template = await TimetableTemplate.findById(req.params.id)
      .populate("department", "name code")
      .populate("createdBy", "name email")
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.faculty", "name email");

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message,
    });
  }
};

// @desc    Update a template
// @route   PUT /api/timetables/templates/:id
// @access  Super Admin, Department Admin
const updateTemplate = async (req, res) => {
  try {
    const { name, description, schedule, status } = req.body;

    const template = await TimetableTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Update fields
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (schedule) template.schedule = schedule;
    if (status) template.status = status;

    await template.save();

    await template.populate([
      { path: "department", select: "name code" },
      { path: "createdBy", select: "name email" },
      { path: "schedule.periods.subject", select: "name code" },
      { path: "schedule.periods.faculty", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update template",
      error: error.message,
    });
  }
};

// @desc    Delete a template
// @route   DELETE /api/timetables/templates/:id
// @access  Super Admin, Department Admin
const deleteTemplate = async (req, res) => {
  try {
    const template = await TimetableTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    await template.deleteOne();

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message,
    });
  }
};

// @desc    Apply template to a class
// @route   POST /api/timetables/templates/:id/apply
// @access  Super Admin, Department Admin
const applyTemplate = async (req, res) => {
  try {
    const { classId, academicYear, semester } = req.body;

    const template = await TimetableTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Check if timetable already exists for this class/year/semester
    const existingTimetable = await Timetable.findOne({
      class: classId,
      academicYear,
      semester,
    });

    if (existingTimetable) {
      return res.status(400).json({
        success: false,
        message: "Timetable already exists for this class, year, and semester. Please delete the existing timetable first.",
      });
    }

    // Create new timetable from template
    const timetable = await Timetable.create({
      class: classId,
      department: template.department,
      academicYear,
      semester,
      schedule: template.schedule, // Copy schedule from template
      status: "active",
    });

    // Update template usage statistics
    template.usageCount += 1;
    template.lastUsed = new Date();
    await template.save();

    await timetable.populate([
      { path: "class", select: "name section year" },
      { path: "department", select: "name code" },
      { path: "schedule.periods.subject", select: "name code" },
      { path: "schedule.periods.faculty", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Template applied successfully",
      data: timetable,
    });
  } catch (error) {
    console.error("Error applying template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply template",
      error: error.message,
    });
  }
};

// @desc    Save existing timetable as template
// @route   POST /api/timetables/:id/save-as-template
// @access  Super Admin, Department Admin
const saveAsTemplate = async (req, res) => {
  try {
    const { name, description } = req.body;

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    // Check if template with same name exists
    const existingTemplate = await TimetableTemplate.findOne({
      name,
      department: timetable.department,
      status: "active",
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "Template with this name already exists in the department",
      });
    }

    // Create template from timetable
    const template = await TimetableTemplate.create({
      name,
      description,
      department: timetable.department,
      schedule: timetable.schedule, // Copy schedule
      createdBy: req.user._id,
    });

    await template.populate([
      { path: "department", select: "name code" },
      { path: "createdBy", select: "name email" },
      { path: "schedule.periods.subject", select: "name code" },
      { path: "schedule.periods.faculty", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Timetable saved as template successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error saving as template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save as template",
      error: error.message,
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  saveAsTemplate,
};
