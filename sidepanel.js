// sidepanel.js - Profile data management (40+ fields)
document.addEventListener('DOMContentLoaded', async () => {
  const fields = [
    // Personal
    'firstName', 'lastName', 'email', 'phone', 'dob', 'gender',
    'maritalStatus', 'nationality', 'fatherName', 'motherName',
    // Identity Documents
    'aadhaar', 'pan', 'passport', 'voterId', 'drivingLicense',
    // Address
    'address', 'city', 'state', 'zip', 'country',
    // Professional
    'linkedin', 'portfolio', 'company', 'jobTitle', 'experience',
    'currentCtc', 'expectedCtc', 'noticePeriod', 'skills',
    // Education
    'qualification', 'university', 'passingYear', 'cgpa', 'specialization',
    // Additional
    'languages', 'bloodGroup', 'emergencyName', 'emergencyPhone', 'resumeUrl'
  ];

  const status = document.getElementById('status');

  // Load existing data
  const storage = await chrome.storage.local.get('userInfo');
  const data = storage.userInfo || {};

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && data[f]) el.value = data[f];
  });

  // Save profile
  document.getElementById('saveBtn').onclick = async () => {
    const newData = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      newData[f] = el ? el.value.trim() : '';
    });

    await chrome.storage.local.set({ userInfo: newData });

    status.innerText = "✅ Profile saved! Lily is ready to fill forms.";
    status.className = "status success";
    setTimeout(() => {
      status.innerText = "";
      status.className = "status";
    }, 3000);
  };

  // Clear all fields
  document.getElementById('clearBtn').onclick = () => {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = '';
    });

    status.innerText = "Fields cleared. Don't forget to save!";
    status.className = "status error";
    setTimeout(() => {
      status.innerText = "";
      status.className = "status";
    }, 3000);
  };
});
