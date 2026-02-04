module.exports = {
  sheetName: 'Google Workspace', // اسم الورقة
  dataRange: 'A3:D100', // نطاق البيانات (بدءاً من الصف 3)
  columns: {
    platform: 0, // Platform_Name (العمود A)
    link: 1,     // Link_URL (العمود B)
    count: 2,    // Added_Count (العمود C)
    status: 3    // Status (العمود D)
  },
  // حقول إضافية من الصورة
  sections: {
    f4: 'F4',
    pendingTasks: 'Pending_Tasks'
  }
};
