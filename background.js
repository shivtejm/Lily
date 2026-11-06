// Lily AI Assistant - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log("Lily AI Job Assistant installed and ready.");

  // Initialize storage with default user data (all fields)
  chrome.storage.local.get('userInfo', (result) => {
    if (!result.userInfo) {
      chrome.storage.local.set({
        userInfo: {
          // Personal
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dob: "",
          gender: "",
          maritalStatus: "",
          nationality: "",
          fatherName: "",
          motherName: "",
          // Identity Documents
          aadhaar: "",
          pan: "",
          passport: "",
          voterId: "",
          drivingLicense: "",
          // Address
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "",
          // Professional
          linkedin: "",
          portfolio: "",
          company: "",
          jobTitle: "",
          experience: "",
          currentCtc: "",
          expectedCtc: "",
          noticePeriod: "",
          skills: "",
          // Education
          qualification: "",
          university: "",
          passingYear: "",
          cgpa: "",
          specialization: "",
          // Additional
          languages: "",
          bloodGroup: "",
          emergencyName: "",
          emergencyPhone: "",
          resumeUrl: ""
        },
        settings: {
          voice: "Indian Female",
          wakeWordEnabled: true
        }
      });
    }
  });

  // Create context menu
  chrome.contextMenus.create({
    id: "fill-with-lily",
    title: "Fill with Lily",
    contexts: ["page", "editable"]
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fill-with-lily") {
    chrome.tabs.sendMessage(tab.id, { action: "fillForm" });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "wakeLily") {
    console.log("Lily is waking up...");
  }

  if (request.action === "fillForm") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "fillForm" });
      }
    });
  }

  if (request.action === "openSidePanel") {
    chrome.sidePanel.open({ tabId: sender.tab?.id });
  }

  return true;
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "wake-lily") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleLily" });
      }
    });
  }
});
