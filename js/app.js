// Main MomCare App JavaScript with PHP API integration and IndexedDB for offline files

// IndexedDB Manager for offline storage
class IndexedDBManager {
    constructor(dbName = 'MomCareDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject("Error opening DB.");
            }; 

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // IndexedDB setup (object stores can be added here if needed)
            };
        });
    }

    async saveData(storeName, data) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getData(storeName, id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAllData(storeName) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteData(storeName, id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}


class MomCareApp {
  constructor() {
    this.currentTab = "home";
    this.userSession = null;
    this.profileData = null;
    this.currentPostId = null;
    this.allergies = [];
    this.dbManager = new IndexedDBManager();
      
    this.AVAILABLE_PDFS = [
        // Add filenames here as you upload PDFs
        'mh1.pdf',
        'mh2.pdf',
        'mh3.pdf',
        'mh4.pdf',
        'mh5.pdf',
        'mh6.pdf',
        'mh7.pdf',
        'mh8.pdf',
        'mh9.pdf',
        'mh10.pdf',
        'ms1.pdf',
        'ms2.pdf',
        'ms3.pdf',
        'ms4.pdf',
        'ms5.pdf',
        'ms6.pdf',
        'ms7.pdf',
        'ms8.pdf',
        'ms9.pdf',
        'ms10.pdf',
        'ms11.pdf',
        'ms12.pdf',
        'ms13.pdf',
        'ms14.pdf',
        'ms15.pdf',
        'ms16.pdf',
        'r1.pdf',
        'r2.pdf',
        'r3.pdf',
        'r4.pdf',
        'r5.pdf',
        'r6.pdf',
        'r7.pdf',
        'r8.pdf',
        'r9.pdf',
        'r10.pdf',
        'r11.pdf',
        'pe1.pdf',
        'pe2.pdf',
        'pe3.pdf',
        'pe4.pdf',
        'pe5.pdf',
        'pe6.pdf',
        'pe7.pdf',
        'pe8.pdf',
        'pe9.pdf',
        'pe10.pdf',
        'pe11.pdf',
        'pe12.pdf'
    ];
    this.init();
  }

// --- Reminder Helpers ---
    async openReminderForNextAppointment() {
        // load appointments and pick next
        const result = await this.apiCall('appointments.php');
        if (!result.success) {
            this.showNotification('Could not load appointments for reminders.', 'error');
            return;
        }
        const appointments = result.appointments || [];
        const upcoming = appointments.filter(apt => new Date(apt.appointment_date.replace(' ', 'T')) > new Date()).sort((a,b) => new Date(a.appointment_date.replace(' ','T')) - new Date(b.appointment_date.replace(' ','T')));
        const nextApt = upcoming[0];
        if (!nextApt) {
            this.showNotification('No upcoming appointment to set a reminder for.', 'info');
            return;
        }

        // Prefill the reminder form
        const form = document.getElementById('reminderForm');
        if (!form) return;
        form.elements['appointment_id'].value = nextApt.id;
        form.elements['offset_minutes'].value = '30';
        document.getElementById('customOffsetGroup').style.display = 'none';
        this.openModal('reminderModal');
    }

    scheduleReminder(appointmentId, appointmentDateISO, minutesBefore) {
        const appointmentTime = new Date(appointmentDateISO.replace(' ', 'T')).getTime();
        const reminderTime = appointmentTime - (minutesBefore * 60 * 1000);
        const now = Date.now();

        // Persist reminder
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        // remove any previous reminder for same appointment
        const filtered = reminders.filter(r => r.appointmentId != appointmentId);
        filtered.push({ appointmentId, appointmentDate: appointmentDateISO, minutesBefore, reminderTime });
        localStorage.setItem('reminders', JSON.stringify(filtered));

        // If reminder time already passed, notify immediately
        if (reminderTime <= now) {
            this.showNotification('Reminder time already passed. Showing now.', 'info');
            this.showNotification('Appointment coming up: ' + appointmentDateISO, 'info');
            return;
        }

        const timeout = reminderTime - now;
        // Schedule in-page notification
        setTimeout(() => {
            this.showNotification('Appointment in ' + minutesBefore + ' minutes', 'info');
            // Optionally, use browser Notification API
            if (window.Notification && Notification.permission === 'granted') {
                new Notification('Appointment Reminder', { body: `Your appointment is in ${minutesBefore} minutes.` });
            }
        }, timeout);
    }

    scheduleRemindersOnInit() {
        try {
            const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
            reminders.forEach(r => {
                const appointmentTime = new Date(r.appointmentDate.replace(' ', 'T')).getTime();
                const reminderTime = r.reminderTime || (appointmentTime - (r.minutesBefore * 60 * 1000));
                const now = Date.now();
                if (reminderTime > now) {
                    setTimeout(() => {
                        this.showNotification('Appointment in ' + r.minutesBefore + ' minutes', 'info');
                        if (window.Notification && Notification.permission === 'granted') {
                            new Notification('Appointment Reminder', { body: `Your appointment is in ${r.minutesBefore} minutes.` });
                        }
                    }, reminderTime - now);
                }
            });
        } catch (e) {
            console.warn('Could not schedule reminders on init', e);
        }
    }
    
    
  async deleteAppointment(appointmentId) {
      console.log('🗑️ deleteAppointment called for ID:', appointmentId);
      
      this.showConfirmation('Delete this pending appointment? This action cannot be undone.', async () => {
          const result = await this.apiCall('appointments.php', 'DELETE', { id: appointmentId });
          
          if (result.success) {
              this.showNotification('Appointment deleted successfully', 'success');
              await this.loadAppointments();
          } else {
              this.showNotification(result.message || 'Failed to delete appointment', 'error');
          }
      });
  }
  
  async editPendingAppointment(appointmentId) {
      console.log('✏️ editPendingAppointment called for ID:', appointmentId);
      
      const result = await this.apiCall('appointments.php');
      if (!result.success) {
          this.showNotification('Could not load appointment details.', 'error');
          return;
      }
      
      const appointment = result.appointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
          this.showNotification('Appointment not found.', 'error');
          return;
      }
      
      const form = document.getElementById('editAppointmentForm');
      if (!form) return;
      
      // Prefill fields
      form.elements['id'].value = appointment.id || '';
      form.elements['title'].value = appointment.title || '';
      form.elements['description'].value = appointment.description || '';
      
      // Convert server DATETIME to datetime-local format
      try {
          const d = new Date(appointment.appointment_date.replace(' ', 'T'));
          const pad = n => String(n).padStart(2, '0');
          const dtLocal = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          form.elements['appointment_date'].value = dtLocal;
      } catch (e) {
          form.elements['appointment_date'].value = '';
      }
      
      if (form.elements['type']) form.elements['type'].value = appointment.type || '';
      
      // Open modal (this will load doctors)
      this.openModal('editAppointmentModal');
      
      // Set doctor_id after a short delay to ensure doctors are loaded
      setTimeout(() => {
          if (form.elements['doctor_id'] && appointment.doctor_id) {
              form.elements['doctor_id'].value = appointment.doctor_id;
          }
      }, 300);
  }
  
  async cancelAppointmentFromReport() {
      console.log('❌ cancelAppointmentFromReport called');
      
      if (!this.reportNextAppointmentId) {
          this.showNotification('No appointment to cancel', 'error');
          return;
      }
      
      this.showConfirmation('Cancel this appointment? It will be marked as cancelled.', async () => {
          const result = await this.apiCall('appointments.php', 'PUT', {
              id: this.reportNextAppointmentId,
              status: 'cancelled'
          });
          
          if (result.success) {
              this.showNotification('Appointment cancelled successfully', 'success');
              
              // Apply grey styling to the appointment
              const containerEl = document.getElementById('next-appointment-report-container');
              const actionEl = document.getElementById('next-appt-action');
              
              if (containerEl) {
                  containerEl.classList.add('appointment-cancelled-report');
              }
              
              // Hide cancel button
              if (actionEl) {
                  actionEl.style.display = 'none';
              }
              
              // Reload report data to update the cancelled count
              setTimeout(() => {
                  loadReportData();
              }, 500);
          } else {
              this.showNotification(result.message || 'Failed to cancel appointment', 'error');
          }
      });
  }
    
  async init() {
    await this.checkAuthentication();
    this.setupEventListeners();
    this.switchTab("home", true); // Initial load
    // run post-init wiring (notifications, reminder scheduling)
    try { if (typeof this.postInit === 'function') this.postInit(); } catch (e) { console.error('postInit failed', e); }
  }

  async checkAuthentication() {
    const session = localStorage.getItem("user_session");
    if (!session) {
      window.location.href = "landing.html";
      return;
    }
    this.userSession = JSON.parse(session);
    if (!this.userSession.session_token) {
        localStorage.removeItem("user_session");
        window.location.href = "landing.html";
    }
  } // <--- Close checkAuthentication HERE

  // Milestones are now predefined - users can only mark them as complete
  async toggleMilestoneStatus(id, currentStatus) {
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete';
    const action = newStatus === 'complete' ? 'complete' : 'uncomplete';
    
    // Show confirmation dialog before marking as complete
    if (action === 'complete') {
      this.showConfirmation('Have you completed this milestone?', async () => {
        await this.completeMilestone(id, true);
      });
    } else {
      // No confirmation needed to unmark
      await this.completeMilestone(id, false);
    }
  }

  async completeMilestone(milestoneId, complete) {
    const result = await this.apiCall('milestones.php', 'POST', {
      action: 'toggle_completion',
      milestone_id: milestoneId,
      complete: complete
    });
    
    if (result.success) {
      this.showNotification(
        complete ? '🎉 Milestone completed!' : 'Milestone marked as pending',
        'success'
      );
      this.loadMilestones();
      
      // Refresh the view all modal if it's open, keeping the current filter
      const viewAllModal = document.getElementById('viewAllModal');
      if (viewAllModal && viewAllModal.classList.contains('active')) {
        // Get current active filter
        const activeTab = document.querySelector('.milestone-tab.active');
        const currentFilter = activeTab ? activeTab.dataset.filter : 'pending';
        
        // Reload all milestones and reapply the current filter
        const milestonesResult = await this.apiCall('milestones.php');
        if (milestonesResult.success) {
          this.allMilestones = milestonesResult.milestones;
          this.filterMilestones(currentFilter);
        }
      }
    } else {
      this.showNotification(result.message || 'Failed to update milestone', 'error');
    }
  }

  // Remove old edit/delete functions - no longer needed

// --- DATA FETCHING --- //
async apiCall(endpoint, method = 'GET', body = null) {
  // Some shared hosts only allow GET and POST — simulate PUT/DELETE as POST
  const isSimulatedMethod = method === 'PUT' || method === 'DELETE';
  const realMethod = isSimulatedMethod ? 'POST' : method;

  const options = {
    method: realMethod,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.userSession?.session_token}`
    },
  };

  // If we're simulating PUT/DELETE, put the original method in _method for the backend
  if (isSimulatedMethod) {
    if (!body || typeof body !== 'object') body = {};
    body._method = method; // 'PUT' or 'DELETE'
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.debug('[API] ', method, endpoint, options);
    const response = await fetch(`api/${endpoint}`, options);
    const status = response.status;

    // Read text first (clone) so we can show raw responses for debugging when JSON parse fails
    const rawText = await response.clone().text();
    let result = null;
    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      console.warn('[API] Response not JSON for', endpoint, 'status', status);
    }

    if (status === 401) { // Unauthorized
      this.showNotification('Session expired. Please log in again.', 'error');
      this.signOut(true);
      return { success: false, message: 'Unauthorized', raw: rawText };
    }

    if (!result) {
      // Non-JSON response
      console.error('[API] Non-JSON response for', endpoint, 'raw:', rawText);
      return { success: false, message: 'Non-JSON response from server', raw: rawText, status };
    }

    if (!response.ok && !result.success) {
      throw new Error(result.message || `HTTP error! status: ${status}`);
    }

    return result;

  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    this.showNotification('An error occurred. Please try again.', 'error');
    return { success: false, message: error.message };
  }
}


  async loadUserProfile() {
    const result = await this.apiCall('profile.php');
    if (result.success) {
      this.profileData = result.profile;
      this.updateProfileUI();
    }
  }

  async loadHomeData() {
      this.loadAppointments();
      this.loadMilestones();
  }

  async loadAppointments() {
    const result = await this.apiCall('appointments.php');
    if (result.success) {
        this.displayAppointments(result.appointments.slice(0, 3));
        this.displayNextAppointment(result.appointments);
    }
  }

    async loadMilestones() {
      try {
        const result = await this.apiCall('milestones.php');
        console.log('Milestones API response:', result);
        
        if(result.success && result.milestones) {
            // Filter to show only pending milestones on home page
            const pendingMilestones = result.milestones.filter(m => m.status === 'pending');
            this.displayMilestones(pendingMilestones.slice(0, 3));

            // Keep milestone stats in case you want to display them elsewhere
            const allMilestones = result.milestones;
            const completedMilestones = allMilestones.filter(m => m.status === 'complete').length;
            const totalMilestones = allMilestones.length;
            
            console.log(`✅ Loaded ${totalMilestones} milestones (${completedMilestones} completed, showing ${pendingMilestones.length} pending)`);
        } else {
            // Handle error or empty state
            console.warn('No milestones returned or API failed:', result);
            this.displayMilestones([]);
        }
      } catch (error) {
        console.error('Error loading milestones:', error);
        this.displayMilestones([]);
      }
    }
  
  async loadEmergencyContacts() {
    const result = await this.apiCall('emergency_contacts.php');
    if(result.success) {
        this.displayEmergencyContacts(result.contacts);
    }
  }
  
  async loadLibraryContent(category = 'all', search = '') {
    const result = await this.apiCall(`library.php?category=${category}&search=${encodeURIComponent(search)}`);
    if(result.success) {
        this.displayLibraryItems(result.content);
    }
  }
  
  async loadForumStats() {
    const result = await this.apiCall('forum_stats.php');
    if (result.success && result.stats) {
        document.getElementById("onlineMothersCount").textContent = (result.stats.active_members);
    }
  }
  
  async loadForumContent(tag = 'all', search = '') {
      let url = `forum.php?action=posts&tag=${tag}&search=${encodeURIComponent(search)}`;
      const result = await this.apiCall(url);
      if (result.success) {
          this.displayForumPosts(result.posts);
          if(tag === 'all' && search === '') {
              this.displayTrendingTags(result.trending_tags);
          }
      }
  }

// ========== PROFILE UI UPDATES ==========

// Replace your updateProfileUI() function:
updateProfileUI() {
  if (!this.profileData) {
    console.warn("⚠️ Profile data not loaded yet");
    return;
  }
  
  const { name, due_date } = this.profileData;
  
  // Calculate current week from due_date
  const currentWeek = this.calculateCurrentWeek(due_date);
  
  console.log("📊 Updating profile UI with:", { name, due_date, currentWeek });
  
  // Update user info
  const userNameEl = document.getElementById("userName");
  const displayNameEl = document.getElementById("displayName");
  const avatarLetterEl = document.getElementById("avatarLetter");
  const currentWeekEl = document.getElementById("currentWeek");
  
  if (userNameEl) userNameEl.textContent = name || "User";
  if (displayNameEl) displayNameEl.textContent = name || "Your Name";
  if (avatarLetterEl) avatarLetterEl.textContent = (name || "U").charAt(0).toUpperCase();
  if (currentWeekEl) currentWeekEl.textContent = currentWeek || 0;
  
  // Update pregnancy progress bar
  this.updatePregnancyProgress(currentWeek);
}

// Add this NEW function to calculate current week from due date:
calculateCurrentWeek(dueDate) {
  if (!dueDate) return 0;
  
  try {
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    
    // Calculate conception date (280 days before due date)
    const conceptionDate = new Date(dueDateObj);
    conceptionDate.setDate(conceptionDate.getDate() - 280);
    
    if (today >= conceptionDate && today <= dueDateObj) {
      // Currently pregnant - calculate week
      const diffTime = Math.abs(today - conceptionDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.floor(diffDays / 7) + 1;
      return Math.min(40, Math.max(1, currentWeek)); // Clamp between 1-40
    } else if (today > dueDateObj) {
      // Past due date
      return 40;
    } else {
      // Before conception date
      return 0;
    }
  } catch (e) {
    console.error("Error calculating current week:", e);
    return 0;
  }
}

// Update your loadUserProfile() function:
async loadUserProfile() {
  try {
    const result = await this.apiCall('profile.php');
    console.log("📥 Profile API response:", result);
    
    if (result.success && result.profile) {
      this.profileData = result.profile;
      console.log("✅ Profile data loaded:", this.profileData);
      this.updateProfileUI();
    } else {
      console.error("❌ Failed to load profile:", result.message);
      this.showNotification('Failed to load profile data', 'error');
    }
  } catch (error) {
    console.error("❌ Error loading profile:", error);
    this.showNotification('Error loading profile', 'error');
  }
}

// Update updatePregnancyProgress (keep it the same):
updatePregnancyProgress(currentWeek) {
  console.log("🟢 updatePregnancyProgress called with week:", currentWeek);
  
  const progressLabel = document.querySelector('.progress-label');
  const progressWeeks = document.getElementById('progressWeeks');
  const progressBar = document.getElementById('progressBar');
  
  if (!progressLabel || !progressWeeks || !progressBar) {
    console.error("❌ Progress elements not found in DOM");
    return;
  }
  
  const totalWeeks = 40;
  const week = Math.min(Math.max(parseInt(currentWeek) || 0, 0), totalWeeks);
  
  if (week > 0) {
    const percentage = (week / totalWeeks) * 100;
    progressLabel.textContent = 'Pregnancy Progress';
    progressWeeks.textContent = `Week ${week} of ${totalWeeks}`;
    progressBar.style.width = `${percentage}%`;
    console.log("✅ Progress updated:", percentage + "%");
  } else {
    progressLabel.textContent = 'Pregnancy Progress';
    progressWeeks.textContent = 'Not started';
    progressBar.style.width = '0%';
    console.log("✅ Progress set to: Not started");
  }
}

// Update openProfileSection to handle date fields properly:
openProfileSection(section) {
  const modalId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Modal`;
  const formId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Form`;
  const form = document.getElementById(formId);
  
  console.log("📝 Opening profile section:", section, "Form ID:", formId);
  
  if (this.profileData && form) {
    console.log("📋 Populating form with data:", this.profileData);
    
    // Populate all matching fields
    Object.keys(this.profileData).forEach(key => {
      const input = form.elements[key];
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = !!parseInt(this.profileData[key], 10);
        } else if (input.type === 'date' && this.profileData[key]) {
          // For date inputs, ensure correct format (YYYY-MM-DD)
          const dateValue = this.profileData[key].split(' ')[0]; // Remove time if present
          input.value = dateValue;
        } else {
          input.value = this.profileData[key] || '';
        }
        console.log(`  ✓ Set ${key} = ${this.profileData[key]}`);
      }
    });
    
    if (section === 'medical-info' && this.profileData.allergies) {
      this.allergies = this.profileData.allergies.split(',').filter(a => a.trim() !== '');
      this.renderAllergies();
    }
  } else {
    console.warn("⚠️ Profile data or form not found");
  }
  
  this.openModal(modalId);
}
  
  
  displayAppointments(appointments, containerId = "appointmentsList") {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    if (!appointments || appointments.length === 0) {
        container.innerHTML = "<p class='no-data'>No appointments scheduled</p>";
        return;
    }
    appointments.forEach(apt => {
        const date = new Date(apt.appointment_date);
        const status = apt.status || 'pending';
        
        // Status badge styling
        let statusBadge = '';
        let statusClass = '';
        if (status === 'pending') {
            statusBadge = '⏳ Pending';
            statusClass = 'status-pending';
        } else if (status === 'approved') {
            statusBadge = '✓ Approved';
            statusClass = 'status-approved';
        } else if (status === 'completed') {
            statusBadge = '✅ Completed';
            statusClass = 'status-completed';
        } else if (status === 'cancelled') {
            statusBadge = '❌ Cancelled';
            statusClass = 'status-cancelled';
        }
        
        // Edit and Delete buttons only for pending appointments
        const editButton = status === 'pending' ? 
            `<button class="btn-edit-appointment" onclick="window.app.editPendingAppointment(${apt.id})" title="Edit pending appointment">✏️</button>` : '';
        const deleteButton = status === 'pending' ? 
            `<button class="btn-delete-appointment" onclick="window.app.deleteAppointment(${apt.id})" title="Delete pending appointment">🗑️</button>` : '';
        
        container.innerHTML += `
            <div class="appointment-item">
                <div class="appointment-item-info">
                    <div class="appointment-item-name">${apt.title}</div>
                    <div class="appointment-item-date">${date.toLocaleString()}</div>
                    <div class="appointment-item-doctor">${apt.doctor_name || 'N/A'}</div>
                </div>
                <div class="appointment-item-actions">
                    <span class="appointment-status-badge ${statusClass}">${statusBadge}</span>
                    ${editButton}
                    ${deleteButton}
                </div>
            </div>`;
    });
  }

displayNextAppointment(appointments) {
    if (!appointments) return;

    // Filter: must be in future, not completed, AND approved
    const upcoming = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date.replace(' ', 'T'));
        const isUpcoming = aptDate > new Date();
        const isNotCompleted = apt.status !== 'completed';
        const isApproved = apt.status === 'approved';
        return isUpcoming && isNotCompleted && isApproved;
    }).sort((a, b) => 
        new Date(a.appointment_date.replace(' ', 'T')) - 
        new Date(b.appointment_date.replace(' ', 'T'))
    );
    
    const nextApt = upcoming[0];
    
    const appointmentTypeEl = document.getElementById("nextAppointmentType");
    const appointmentDateEl = document.getElementById("nextAppointmentDate");
    const appointmentDoctorEl = document.getElementById("nextAppointmentDoctor");

    if (nextApt) {
        appointmentTypeEl.textContent = nextApt.type ? 
            nextApt.type.charAt(0).toUpperCase() + nextApt.type.slice(1) : 
            'Appointment';
        appointmentDateEl.textContent = nextApt.title;
        appointmentDoctorEl.textContent = new Date(nextApt.appointment_date.replace(' ', 'T'))
            .toLocaleString('en-US', {
                month: 'long', 
                day: 'numeric', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit'
            });
    } else {
        appointmentTypeEl.textContent = "No upcoming appointments";
        appointmentDateEl.textContent = "Add one to see it here!";
        appointmentDoctorEl.textContent = "";
    }
    
    // Keep reference to the next appointment
    this.nextAppointment = nextApt || null;
    
    // Enable/disable reschedule button based on next appointment availability
  const rescheduleBtn = document.getElementById('rescheduleBtn');
  const setReminderBtn = document.getElementById('setReminderBtn');
    
    if (rescheduleBtn) {
        rescheduleBtn.disabled = !nextApt;
        rescheduleBtn.style.opacity = nextApt ? '1' : '0.5';
        rescheduleBtn.style.cursor = nextApt ? 'pointer' : 'not-allowed';
    }
    if (setReminderBtn) {
        setReminderBtn.disabled = !nextApt;
        setReminderBtn.style.opacity = nextApt ? '1' : '0.5';
        setReminderBtn.style.cursor = nextApt ? 'pointer' : 'not-allowed';
    }
  // markComplete button removed — completion is handled automatically when appointment datetime passes
    
    console.log('✅ Next appointment updated:', this.nextAppointment ? nextApt.title : 'None');
}
    
displayMilestones(milestones, containerId = "milestonesList") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  
  if (!milestones || milestones.length === 0) {
    container.innerHTML = "<p class='no-data'>No milestones available</p>";
    return;
  }
  
  const isViewAll = containerId === "viewAllBody";
  
  milestones.forEach(m => {
    const statusIcon = m.status === "complete" ? "✓" : "○";
    const statusClass = m.status === "complete" ? "complete" : "pending";
    const statusText = m.status === "complete" ? "Completed" : "Pending";
    const completedDate = m.completed_date ? `<div class="milestone-completed">Completed: ${new Date(m.completed_date).toLocaleDateString()}</div>` : '';
    
    // Determine trimester based on week number
    let trimester = '';
    if (m.week_number <= 13) {
      trimester = '1st Trimester';
    } else if (m.week_number <= 27) {
      trimester = '2nd Trimester';
    } else {
      trimester = '3rd Trimester';
    }
    
    // Category icon mapping
    const categoryIcons = {
      'medical': '🏥',
      'development': '👶',
      'preparation': '🎒',
      'personal': '💝',
      'other': '📋'
    };
    const categoryIcon = categoryIcons[m.category] || '📋';
    const categoryBadge = m.category ? `<span class="milestone-category">${categoryIcon} ${m.category}</span>` : '';
    
    container.innerHTML += `
      <div class="milestone-item" data-id="${m.id}">
        <div class="milestone-icon milestone-icon-${statusClass}">${statusIcon}</div>
        <div class="milestone-info">
          <div class="milestone-name">${m.name}</div>
          <div class="milestone-week">${trimester}${categoryBadge ? ' • ' : ''}${categoryBadge}</div>
          ${m.description ? `<div class="milestone-description">${m.description}</div>` : ''}
          ${completedDate}
          <div class="milestone-status-badge status-${statusClass}">${statusText}</div>
        </div>
        <div class="milestone-actions">
          <button class="milestone-quick-complete ${statusClass}" data-id="${m.id}" data-status="${m.status}" title="${m.status === 'complete' ? 'Mark as Incomplete' : 'Mark as Complete'}">
            ${m.status === 'complete' ? '↶' : '✓'}
          </button>
        </div>
      </div>`;
  });
  
  // Add event listeners for quick complete buttons
  container.querySelectorAll('.milestone-quick-complete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMilestoneStatus(btn.dataset.id, btn.dataset.status);
    });
  });
}
  
  displayEmergencyContacts(contacts) {
    const list = document.getElementById('emergencyContactsList');
    list.innerHTML = '';
    if (!contacts || contacts.length === 0) {
        list.innerHTML = "<p class='no-data'>No contacts added.</p>";
        return;
    }
  contacts.forEach(c => {
    // Hide delete button for emergency hotline entries
    const showDelete = !(c.contact_type && c.contact_type === 'emergency');
    const deleteBtnHtml = showDelete ? `<button class="btn btn-delete" data-id="${c.id}">Delete</button>` : '';

    list.innerHTML += `
      <div class="contact-item">
        <div class="contact-info">
          <div class="contact-name">${c.name} (${c.relationship})</div>
          <div class="contact-phone">${c.phone}</div>
        </div>
        <div class="contact-actions">
          <a class="btn btn-call" href="tel:${c.phone}">Call</a>
          ${deleteBtnHtml}
        </div>
      </div>`;
  });
  // Use the button element itself to read dataset.id (safer than e.target which may be inner text)
  list.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.deleteEmergencyContact(btn.dataset.id);
  }));
  }

  displayTrendingTags(tags) {
    const container = document.querySelector('#trendingTags .tag-list-new');
    container.innerHTML = '<button class="tag-new active" data-tag="all">All</button>'; // Reset with 'All'
    tags.forEach(tag => {
        container.innerHTML += `<button class="tag-new" data-tag="${tag.tag}">${tag.tag.replace(/-/g, ' ').replace(/#/, '')}</button>`;
    });
  }


  displayForumPosts(posts) {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="no-data">No posts found.</p>';
        return;
    }
  const session = localStorage.getItem('user_session');
  const currentUserId = session ? JSON.parse(session).user_id : null;
  posts.forEach(post => {
    const isOwner = currentUserId && String(currentUserId) === String(post.user_id || post.userId || post.user);
    container.innerHTML += `
      <div class="post-item" data-post-id="${post.id}">
        <h4>${post.title}</h4>
        <p>by ${post.author_name} on ${new Date(post.created_at).toLocaleDateString()}</p>
    <div class="post-actions">
      <button class="like-btn" data-post-id="${post.id}">👍 ${post.likes_count || 0}</button>
      <span class="replies-count">💬 ${post.replies_count || 0} Replies</span>
  ${!isOwner ? (post.reported_by_user ? `<button class="report-btn" data-post-id="${post.id}" disabled>Reported${post.reports_count ? ' ('+post.reports_count+')' : ''}</button>` : `<button class="report-btn" data-post-id="${post.id}" title="Report post">Report${post.reports_count ? ' ('+post.reports_count+')' : ''}</button>`) : ''}
      ${isOwner ? `<button class="delete-post-btn post-delete-btn" data-post-id="${post.id}" title="Delete post" aria-label="Delete post">`+
                `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`+
              `</button>` : ''}
    </div>
      </div>`;
  });
    container.querySelectorAll('.post-item').forEach(item => item.addEventListener('click', e => {
        if (!e.target.classList.contains('like-btn')) {
            this.viewPost(item.dataset.postId);
        }
    }));
    container.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        this.likePost(btn.dataset.postId);
    }));
    // wire delete buttons
    container.querySelectorAll('.delete-post-btn').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      this.showConfirmation('Are you sure you want to delete this post?', async () => {
        const res = await this.apiCall('forum.php?action=delete_post', 'POST', { post_id: postId });
        if (res && res.success) {
          this.showNotification('Post deleted', 'success');
          // remove from UI
          const el = document.querySelector(`.post-item[data-post-id='${postId}']`);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        } else {
          this.showNotification(res.message || 'Could not delete post', 'error');
        }
      });
    }));
  // wire report buttons -> open modal
  container.querySelectorAll('.report-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const postId = btn.dataset.postId;
    // open modal and set post id
    const modal = document.getElementById('reportModal');
    document.getElementById('report_post_id').value = postId;
    // clear previous selection
    const form = document.getElementById('reportForm');
    form.reset();
    document.getElementById('report_details').value = '';
    modal.classList.add('active');
  }));
  }
  
  async displayLibraryItems(items) {
      const container = document.getElementById('library-content-area');
      container.innerHTML = '';
      if (!items || items.length === 0) {
          container.innerHTML = '<p class="no-data no-data-dark">No items found.</p>';
          return;
      }

      const iconMap = {
          'recipes': '🍲',
          'mental-health': '🧘',
          'exercise': '🏃‍♀️',
          'medicine-supplements': '💊'
      };

      for (const item of items) {
          const isRecipe = item.category === 'recipes';
          const isHtmlContent = item.file_url && item.file_url.endsWith('.html');
          
          // Determine button text based on category
          let buttonText = 'VIEW PDF';
          if (item.category === 'recipes') {
              buttonText = 'VIEW RECIPE';
          } else if (item.category === 'mental-health') {
              buttonText = 'VIEW RESOURCE';
          } else if (item.category === 'exercise') {
              buttonText = 'VIEW EXERCISE';
          } else if (item.category === 'medicine-supplements') {
              buttonText = 'VIEW GUIDE';
          }
          
          const buttonAction = isHtmlContent ? 'view-html' : 'view-pdf';
          
          container.innerHTML += `
            <div class="dark-card" data-id="${item.id}" data-url="${item.file_url}" data-title="${item.title}" data-category="${item.category}">
                <div class="dark-card-icon ${item.category}">${iconMap[item.category] || '📚'}</div>
                <div class="dark-card-info">
                    <div class="dark-card-title">${item.title}</div>
                    <div class="dark-card-desc">${item.description}</div>
                    <div class="dark-card-stats">
                        <span><i class="fas fa-file-alt"></i> ${item.item_count || 0} ${item.category === 'recipes' ? 'recipes' : 'modules'}</span>
                        <span><i class="fas fa-star"></i> ${item.rating || 0} rating</span>
                    </div>
                </div>
                <div class="dark-card-actions">
                    <button class="dark-card-btn" data-action="${buttonAction}" data-id="${item.id}">${buttonText}</button>
                </div>
            </div>
          `;
      }
  }

  async viewPost(postId) {
    this.currentPostId = postId;
    const result = await this.apiCall(`forum.php?action=post_details&post_id=${postId}`);
  if (result.success) {
    const { post, replies, reported_by_user } = result;
        const modalContent = document.getElementById('viewPostContent');
        
    const session = localStorage.getItem('user_session');
    const currentUserId = session ? JSON.parse(session).user_id : null;

        let repliesHtml = (replies || []).map(reply => {
            const isReplyOwner = currentUserId && String(currentUserId) === String(reply.user_id || reply.userId || reply.user);
            const alreadyReported = reply.reported_by_user === true || false;
            return `
            <div class="reply-item" data-reply-id="${reply.id}">
                <p>${reply.content}</p>
                <div class="post-actions reply-actions">
                  <small class="reply-author">by ${reply.author_name} on ${new Date(reply.created_at).toLocaleDateString()}</small>
                  ${!isReplyOwner ? (alreadyReported ? `<button class="report-btn" data-reply-id="${reply.id}" disabled>Reported${reply.reports_count ? ' ('+reply.reports_count+')' : ''}</button>` : `<button class="report-btn" data-reply-id="${reply.id}">Report${reply.reports_count ? ' ('+reply.reports_count+')' : ''}</button>`) : ''}
                </div>
            </div>
        `}).join('');

  // Determine whether current user owns the post so we can hide the Report button
  const isPostOwner = currentUserId && String(currentUserId) === String(post.user_id);

    modalContent.innerHTML = `
      <h3>${post.title}</h3>
      <p class="modal-post-content">${post.content}</p>
      <small class="modal-post-author">by ${post.author_name} on ${new Date(post.created_at).toLocaleDateString()}</small>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
        ${!isPostOwner ? `<button id="modalReportBtn" ${reported_by_user ? 'disabled' : ''}>${reported_by_user ? 'Reported' : 'Report' }${post.reports_count ? ' ('+post.reports_count+')' : ''}</button>` : ''}
        ${ (function(){
            try { return (currentUserId && String(currentUserId) === String(post.user_id)) ? `<button id="modalDeleteBtn" class="post-delete-btn small" aria-label="Delete post">`+
                        `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`+
                      `</button>` : ''; } catch(e) { return ''; }
          })()
        }
      </div>
      <hr>
      <h4 class="modal-replies-title">Replies:</h4>
      <div id="repliesContainer">${repliesHtml || '<p class="no-data">No replies yet.</p>'}</div>
    `;
        document.getElementById('viewPostTitle').textContent = post.title;
        this.openModal('viewPostModal');
    const modalReportBtn = document.getElementById('modalReportBtn');
    if (modalReportBtn) {
      modalReportBtn.addEventListener('click', (e) => {
        // open full report modal for richer choices
        const modal = document.getElementById('reportModal');
        document.getElementById('report_post_id').value = post.id;
        // clear any reply id when reporting a post
        document.getElementById('report_reply_id').value = '';
        document.getElementById('reportForm').reset();
        document.getElementById('report_details').value = '';
        modal.classList.add('active');
      });
    }
    // wire reply report buttons after rendering (use same .report-btn class)
    const repliesContainer = document.getElementById('repliesContainer');
    if (repliesContainer) {
      repliesContainer.querySelectorAll('.report-btn[data-reply-id]').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        const replyId = btn.dataset.replyId;
        const modal = document.getElementById('reportModal');
        // set reply_id and keep post_id when reporting a reply
        document.getElementById('report_reply_id').value = replyId;
        document.getElementById('report_post_id').value = post.id;
        document.getElementById('reportForm').reset();
        document.getElementById('report_details').value = '';
        modal.classList.add('active');
      }));
    }
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    if (modalDeleteBtn) {
      modalDeleteBtn.addEventListener('click', (e) => {
        this.showConfirmation('Are you sure you want to delete this post?', async () => {
          const res = await this.apiCall('forum.php?action=delete_post', 'POST', { post_id: post.id });
          if (res && res.success) {
            this.showNotification('Post deleted', 'success');
            this.closeModal('viewPostModal');
            // remove from post list if present
            const el = document.querySelector(`.post-item[data-post-id='${post.id}']`);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          } else {
            this.showNotification(res.message || 'Could not delete post', 'error');
          }
        });
      });
    }
    }
  }


// --- EVENT LISTENERS & HANDLERS --- //
setupEventListeners() {
  // Tab Navigation
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => this.switchTab(item.dataset.tab));
  });

  // Modals
  document.querySelectorAll(".modal-close, .btn-cancel").forEach(btn => {
    btn.addEventListener("click", e => this.closeModal(e.target.closest(".modal-overlay").id));
  });
  document.getElementById('confirmCancel').addEventListener('click', () => this.closeModal('confirmModal'));
  
  // Report modal close handler
    const reportModal = document.getElementById('myReportModal');
    if (reportModal) {
        const closeBtn = reportModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                reportModal.classList.remove('active');
            });
        }
    }

  // Report post modal handlers
  const reportModalEl = document.getElementById('reportModal');
  if (reportModalEl) {
    // close buttons inside modal
    reportModalEl.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => btn.addEventListener('click', () => {
      reportModalEl.classList.remove('active');
    }));

    const submitBtn = document.getElementById('reportSubmitBtn');
    if (submitBtn) {
      // disable submit until a reason is selected
      const form = document.getElementById('reportForm');
      const reasonRadios = form.querySelectorAll('input[name="reason"]');
      const detailsInput = document.getElementById('report_details');

      const updateSubmitState = () => {
        const anyChecked = Array.from(reasonRadios).some(r => r.checked);
        submitBtn.disabled = !anyChecked;
      };

      reasonRadios.forEach(r => r.addEventListener('change', updateSubmitState));
      // initialize
      updateSubmitState();

      submitBtn.addEventListener('click', async () => {
        const fd = new FormData(form);
        const post_id = fd.get('post_id');
        const type = fd.get('reason') || null; // selected radio
        const details = fd.get('details') || '';
        if (!post_id) { this.showNotification('Invalid post', 'error'); return; }
        // call API with structured payload
        const res = await this.reportPostStructured(post_id, type, details);
        if (res && res.success) {
          this.showNotification('Report submitted', 'success');
          reportModalEl.classList.remove('active');
          // If reporting a reply, disable the reply button; otherwise disable post report button
          const replyIdEl = document.getElementById('report_reply_id');
          const replyId = replyIdEl ? replyIdEl.value : '';
          if (replyId) {
            const rbtn = document.querySelector(`.report-btn[data-reply-id='${replyId}']`);
            if (rbtn) { rbtn.textContent = 'Reported'; rbtn.disabled = true; }
            // increment visible replies count badge if shown on reply (optional)
          } else {
            const btn = document.querySelector(`.report-btn[data-post-id='${post_id}']`);
            if (btn) { btn.textContent = 'Reported'; btn.disabled = true; }
          }
        } else {
          this.showNotification(res.message || 'Could not submit report', 'error');
        }
      });
    }
  }
    
  // Guidelines Agreement
  document.getElementById('agreeGuidelinesBtn').addEventListener('click', () => {
      localStorage.setItem('forumGuidelinesAgreed', 'true');
      this.closeModal('forumGuidelinesModal');
      this.switchTab('chat');
  });
  document.getElementById('declineGuidelinesBtn').addEventListener('click', () => {
      this.closeModal('forumGuidelinesModal');
      this.switchTab('home'); 
  });

  // Home Tab Buttons
  document.getElementById('addAppointmentBtn').addEventListener('click', () => this.openModal('appointmentModal'));
  document.querySelectorAll('.view-all').forEach(el => el.addEventListener('click', e => this.viewAll(e.target.dataset.type)));
  
  // Emergency Tab
  document.getElementById('sosButton').addEventListener('click', () => {
      this.showConfirmation(
        "Are you sure you want to activate the SOS button? This will send an alert with your location to your emergency contacts.",
        () => this.handleSOSActivation()
      );
  });
  document.getElementById('addEmergencyContactBtn').addEventListener('click', () => this.openModal('addContactModal'));

  // Library Tab Actions
  document.getElementById('library-content-area').addEventListener('click', e => this.handleLibraryAction(e));

  // Library Tab
  document.getElementById('librarySearchInput').addEventListener('input', e => this.loadLibraryContent('all', e.target.value));
  document.querySelector('#tab-library .dark-category-tabs').addEventListener('click', e => {
      if(e.target.classList.contains('dark-category-tab')) {
          document.querySelector('#tab-library .dark-category-tab.active').classList.remove('active');
          e.target.classList.add('active');
          this.loadLibraryContent(e.target.dataset.category);
      }
  });

  // Forum Tab
  document.getElementById('createPostBtn').addEventListener('click', () => this.openModal('createPostModal'));
  document.getElementById('savePostBtn').addEventListener('click', () => this.savePost());
  document.getElementById('replyForm').addEventListener('submit', e => {
      e.preventDefault();
      this.saveReply();
  });
  document.getElementById('searchBar').addEventListener('input', e => this.loadForumContent('all', e.target.value));
  document.getElementById('trendingTags').addEventListener('click', e => {
      if(e.target.classList.contains('tag-new')) {
          document.querySelector('#trendingTags .tag-new.active').classList.remove('active');
          e.target.classList.add('active');
          this.loadForumContent(e.target.dataset.tag);
      }
  });

  // Profile Tab
// Profile Tab - WITH DEBUG LOGGING
    document.querySelectorAll('.profile-menu-item').forEach(item => {
      console.log('🔧 Attaching listener to:', item.dataset.section);

      // Add both click AND touchend for mobile
      item.addEventListener('click', (e) => {
        console.log('🖱️ CLICK event fired for:', item.dataset.section);
        e.preventDefault();
        e.stopPropagation();
        this.handleProfileMenu(item.dataset.section);
      });

      item.addEventListener('touchend', (e) => {
        console.log('📱 TOUCHEND event fired for:', item.dataset.section);
        e.preventDefault();
        e.stopPropagation();
        this.handleProfileMenu(item.dataset.section);
      });
    });
  
  document.querySelectorAll('.profile-save-btn').forEach(btn => {
      btn.addEventListener('click', e => this.saveProfileSection(e.target.dataset.section));
  });

  document.querySelectorAll('.profile-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => this.toggleProfileEditMode(e.target.closest('.profile-page-content')));
  });
  
  document.querySelector('#medicalInfoModal .profile-add-btn').addEventListener('click', () => this.addAllergy());
  document.getElementById('newAllergyInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          this.addAllergy();
      }
  });

    // Modal Forms
    document.getElementById('saveAppointment').addEventListener('click', () => this.saveForm('appointmentForm', 'appointments.php', this.loadAppointments.bind(this)));
    document.getElementById('saveContact').addEventListener('click', () => this.saveForm('emergencyContactForm', 'emergency_contacts.php', this.loadEmergencyContacts.bind(this)));

    // Save for the dedicated Edit Appointment modal (Reschedule)
    const saveEditBtn = document.getElementById('saveEditAppointment');
    if (saveEditBtn) saveEditBtn.addEventListener('click', () => this.saveForm('editAppointmentForm', 'appointments.php', this.loadAppointments.bind(this)));

    // Reschedule button debug wiring (ensure handler is wired)
    const rescheduleBtn = document.getElementById('rescheduleBtn');
    if (rescheduleBtn) {
        rescheduleBtn.addEventListener('click', () => {
            console.debug('[DEBUG] Reschedule button clicked');
            this.openEditNextAppointmentModal();
        });
    } else {
        console.debug('[DEBUG] Reschedule button not found in DOM');
    }

    // Set Reminder button wiring
    const setReminderBtn = document.getElementById('setReminderBtn');
    if (setReminderBtn) setReminderBtn.addEventListener('click', () => this.openReminderForNextAppointment());

  // Mark Complete button removed — handled automatically when appointment datetime passes
    } // ← Keep this closing brace at the END

    // After DOM content loaded and app init, request notification permission and schedule stored reminders
    async postInit() {
        // Request notifications permission (non-blocking)
        if (window.Notification && Notification.permission !== 'granted') {
            try { Notification.requestPermission(); } catch (e) { /* ignore */ }
        }
        // scheduleRemindersOnInit may not yet be implemented in this file during iterative edits.
        // Call if available; otherwise provide a safe no-op to avoid runtime errors.
        try {
          if (typeof this.scheduleRemindersOnInit === 'function') {
            this.scheduleRemindersOnInit();
          } else {
            console.debug('[DEBUG] scheduleRemindersOnInit not defined yet; skipping scheduling');
          }
        } catch (e) {
          console.error('Error running scheduleRemindersOnInit:', e);
        }

        // Wire reminder form interactions
        const offsetSelect = document.getElementById('offsetSelect');
        const customOffsetGroup = document.getElementById('customOffsetGroup');
    if (offsetSelect) {
      offsetSelect.addEventListener('change', (e) => {
        const isCustom = e.target.value === 'custom';
        if (customOffsetGroup) customOffsetGroup.style.display = isCustom ? '' : 'none';
        const form = document.getElementById('reminderForm');
        if (!form) return;
        const customInput = form.elements.custom_minutes;
        if (customInput) {
          if (isCustom) {
            customInput.removeAttribute('disabled');
            customInput.setAttribute('required', 'required');
            setTimeout(() => { try { customInput.focus(); } catch(e){} }, 50);
          } else {
            customInput.removeAttribute('required');
            customInput.setAttribute('disabled', 'disabled');
            customInput.value = '';
          }
        }
      });
    }

        const saveReminderBtn = document.getElementById('saveReminderBtn');
        if (saveReminderBtn) saveReminderBtn.addEventListener('click', async () => {
            const form = document.getElementById('reminderForm');
      if (!form.checkValidity()) { form.reportValidity(); return; }
            const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      console.debug('[DEBUG] saveReminder clicked, form data:', data);
      const appointmentId = data.appointment_id;
      // NOTE: select in HTML is named 'offset_minutes'
      let minutes;
      if (data.offset_minutes === 'custom') {
        minutes = parseInt(data.custom_minutes || '0', 10);
      } else {
        minutes = parseInt(data.offset_minutes || data.offset || '0', 10);
      }
            if (!appointmentId || !minutes || minutes <= 0) {
                this.showNotification('Please select a valid reminder time.', 'error');
                return;
            }

            // Find appointment to get date
            const result = await this.apiCall('appointments.php');
            if (!result.success) { this.showNotification('Could not load appointments.', 'error'); return; }
            const apt = (result.appointments || []).find(a => String(a.id) === String(appointmentId));
            if (!apt) { this.showNotification('Appointment not found.', 'error'); return; }

      this.scheduleReminder(appointmentId, apt.appointment_date, minutes);
            this.showNotification('Reminder saved.', 'success');
            this.closeModal('reminderModal');
        });
    

} // ← THIS IS THE CLOSING BRACE FOR setupEventListeners
    
  // --- PDF Handlers --- //
        async handleLibraryAction(e) {
          const button = e.target.closest('button');
          if (!button) return;

          const action = button.dataset.action;
          const card = button.closest('.dark-card');
          const id = parseInt(card.dataset.id, 10);
          const url = card.dataset.url;
          const title = card.dataset.title;

          switch (action) {
            case 'view-html':
              this.viewHtmlContent(url, title);
              break;
            case 'view-pdf':
              // Always use embedded viewer (no mobile PDF viewer)
              this.viewPdf(id, title, url);
              break;
          }
        }

        async viewPdf(id, title, url) {
          try {
            if (url) {
              document.getElementById('pdfFrame').src = url;
              document.getElementById('pdfViewerTitle').textContent = title;
              this.openModal('pdfViewerModal');
            } else {
              this.showNotification('Could not find file to view.', 'error');
            }
          } catch (error) {
            console.error('Error viewing PDF:', error);
            this.showNotification('Could not open the PDF.', 'error');
          }
        }

        async viewHtmlContent(url, title) {
          try {
            if (url) {
              // Hide the library list
              const libraryList = document.getElementById('library-content-area');
              const libraryHeader = document.querySelector('#tab-library .header');
              const browseSection = document.querySelector('#tab-library .browse-section');
              
              if (libraryList) libraryList.style.display = 'none';
              if (libraryHeader) libraryHeader.style.display = 'none';
              if (browseSection) browseSection.style.display = 'none';
              
              // Create or get the HTML content container
              let htmlContainer = document.getElementById('html-content-container');
              if (!htmlContainer) {
                htmlContainer = document.createElement('div');
                htmlContainer.id = 'html-content-container';
                htmlContainer.style.width = '100%';
                htmlContainer.style.height = '100%';
                htmlContainer.style.overflow = 'auto';
                document.getElementById('tab-library').appendChild(htmlContainer);
              }
              
              // Load the HTML content
              const response = await fetch(url);
              const htmlContent = await response.text();
              htmlContainer.innerHTML = htmlContent;
              htmlContainer.style.display = 'block';
              
              // Add back button functionality
              const backButtons = htmlContainer.querySelectorAll('.back-button');
              backButtons.forEach(btn => {
                btn.onclick = (e) => {
                  e.preventDefault();
                  this.closeHtmlContent();
                };
              });
              
            } else {
              this.showNotification('Could not find file to view.', 'error');
            }
          } catch (error) {
            console.error('Error viewing HTML content:', error);
            this.showNotification('Could not open the content.', 'error');
          }
        }

        closeHtmlContent() {
          // Show the library list again
          const libraryList = document.getElementById('library-content-area');
          const libraryHeader = document.querySelector('#tab-library .header');
          const browseSection = document.querySelector('#tab-library .browse-section');
          const htmlContainer = document.getElementById('html-content-container');
          
          if (libraryList) libraryList.style.display = 'block';
          if (libraryHeader) libraryHeader.style.display = 'block';
          if (browseSection) browseSection.style.display = 'block';
          if (htmlContainer) htmlContainer.style.display = 'none';
        }

        // --- DEVICE DETECTION --- //
        isMobileDevice() {
          const userAgent = navigator.userAgent || navigator.vendor || window.opera;
          const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

          // Strictly check for mobile devices, not just small screens
          return (
            /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
            && isTouch
          );
        }


        // --- LOAD MOBILE CSS --- //
        loadMobilePdfCss() {
          if (document.getElementById('mobilePdfCss')) return; // avoid duplicates
          const link = document.createElement('link');
          link.id = 'mobilePdfCss';
          link.rel = 'stylesheet';
          link.href = 'css/mobile-pdf-viewer.css'; // your CSS path
          document.head.appendChild(link);
        }

        // --- MOBILE VIEWER --- //
        async viewPdfMobile(url, title) {
          try {
            this.showNotification('Loading PDF...', 'info');

            const viewerHtml = `
              <div class="mobile-pdf-viewer">
                <div class="mobile-pdf-header">
                  <button class="mobile-pdf-close" onclick="app.closeMobilePdfViewer()">&times;</button>
                  <h3>${title}</h3>
                </div>
                <div class="mobile-pdf-controls">
                  <button class="pdf-control-btn" id="prevPage">← Prev</button>
                  <span id="pageInfo">
                    <span id="currentPage">1</span> / <span id="totalPages">--</span>
                  </span>
                  <button class="pdf-control-btn" id="nextPage">Next →</button>
                </div>
                <div class="mobile-pdf-canvas-container">
                  <canvas id="mobilePdfCanvas"></canvas>
                </div>
                <div class="mobile-pdf-loading">Loading PDF...</div>
              </div>
            `;

            const viewerContainer = document.createElement('div');
            viewerContainer.id = 'mobilePdfViewerContainer';
            viewerContainer.innerHTML = viewerHtml;
            document.body.appendChild(viewerContainer);

            await this.loadPdfJs();
            this.initMobilePdfViewer(url);
          } catch (error) {
            console.error('Error viewing PDF on mobile:', error);
            this.showNotification('Could not load PDF. Please try downloading instead.', 'error');
          }
        }

        async loadPdfJs() {
          if (window.pdfjsLib) return;

          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        async initMobilePdfViewer(url) {
          try {
            const loadingEl = document.querySelector('.mobile-pdf-loading');
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            let currentPageNum = 1;
            const totalPages = pdf.numPages;

            document.getElementById('totalPages').textContent = totalPages;
            if (loadingEl) loadingEl.style.display = 'none';

            const renderPage = async (pageNum) => {
              const page = await pdf.getPage(pageNum);
              const canvas = document.getElementById('mobilePdfCanvas');
              const ctx = canvas.getContext('2d');

              const container = document.querySelector('.mobile-pdf-canvas-container');
              const containerWidth = container.clientWidth - 20;
              const viewport = page.getViewport({ scale: 1 });

              const deviceScale = window.devicePixelRatio || 1;
              const scale = (containerWidth / viewport.width) * deviceScale;
              const scaledViewport = page.getViewport({ scale });

              canvas.width = scaledViewport.width;
              canvas.height = scaledViewport.height;
              canvas.style.width = `${scaledViewport.width / deviceScale}px`;
              canvas.style.height = `${scaledViewport.height / deviceScale}px`;

              const renderContext = { canvasContext: ctx, viewport: scaledViewport };
              await page.render(renderContext).promise;
              document.getElementById('currentPage').textContent = pageNum;
            };

            await renderPage(currentPageNum);

            const updateButtons = () => {
              document.getElementById('prevPage').disabled = currentPageNum === 1;
              document.getElementById('nextPage').disabled = currentPageNum === totalPages;
            };
            updateButtons();

            document.getElementById('prevPage').onclick = async () => {
              if (currentPageNum > 1) {
                currentPageNum--;
                await renderPage(currentPageNum);
                updateButtons();
              }
            };

            document.getElementById('nextPage').onclick = async () => {
              if (currentPageNum < totalPages) {
                currentPageNum++;
                await renderPage(currentPageNum);
                updateButtons();
              }
            };
          } catch (error) {
            console.error('Error loading PDF:', error);
            this.showNotification('Failed to load PDF. Try downloading instead.', 'error');
            this.closeMobilePdfViewer();
          }
        }

        closeMobilePdfViewer() {
          const container = document.getElementById('mobilePdfViewerContainer');
          if (container) container.remove();
        }


    async openEditNextAppointmentModal() {
        console.debug('[DEBUG] openEditNextAppointmentModal called');
        
        // Check if reschedule button is disabled
        const rescheduleBtn = document.getElementById('rescheduleBtn');
        if (rescheduleBtn && rescheduleBtn.disabled) {
            this.showNotification('No upcoming appointment to reschedule.', 'info');
            return;
        }
        
        const result = await this.apiCall('appointments.php');
        console.debug('[DEBUG] appointments API result', result);
        if (!result.success) {
            this.showNotification('Could not load appointments to edit.', 'error');
            return;
        }

        const appointments = result.appointments || [];
        const upcoming = appointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date.replace(' ', 'T'));
            const isUpcoming = aptDate > new Date();
            const isNotCompleted = apt.status !== 'completed';
            const isApproved = apt.status === 'approved';
            return isUpcoming && isNotCompleted && isApproved;
        }).sort((a, b) => new Date(a.appointment_date.replace(' ', 'T')) - new Date(b.appointment_date.replace(' ', 'T')));

        const nextApt = upcoming[0];
        if (!nextApt) {
            this.showNotification('No upcoming appointment to reschedule.', 'info');
            return;
        }

        const form = document.getElementById('editAppointmentForm');
        if (!form) return;

        // Prefill fields
        form.elements['id'].value = nextApt.id || '';
        form.elements['title'].value = nextApt.title || '';
        form.elements['description'].value = nextApt.description || '';
        // Convert server DATETIME (YYYY-MM-DD HH:MM:SS) to datetime-local value (YYYY-MM-DDTHH:MM)
        try {
            const d = new Date(nextApt.appointment_date.replace(' ', 'T'));
            const pad = n => String(n).padStart(2, '0');
            const dtLocal = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            form.elements['appointment_date'].value = dtLocal;
        } catch (e) {
            form.elements['appointment_date'].value = '';
        }
        if (form.elements['type']) form.elements['type'].value = nextApt.type || '';

        // Open modal first (this will load doctors)
        this.openModal('editAppointmentModal');
        
        // Set doctor_id after a short delay to ensure doctors are loaded
        setTimeout(() => {
            if (form.elements['doctor_id'] && nextApt.doctor_id) {
                form.elements['doctor_id'].value = nextApt.doctor_id;
            }
        }, 300);
    }

    async openReminderForNextAppointment() {
      try {
        console.debug('[DEBUG] openReminderForNextAppointment called');
        const result = await this.apiCall('appointments.php');
        let appointments = [];
        if (result && result.success) appointments = result.appointments || [];
        else console.warn('[WARN] appointments API failed or returned no data; will try fallback nextAppointment');

        const upcoming = appointments.filter(apt => new Date(apt.appointment_date.replace(' ', 'T')) > new Date())
          .sort((a,b) => new Date(a.appointment_date.replace(' ', 'T')) - new Date(b.appointment_date.replace(' ', 'T')));
        const nextApt = upcoming[0];

        const finalApt = nextApt || this.nextAppointment;
        if (!finalApt) { this.showNotification('No upcoming appointment to set reminder for', 'error'); return; }

        const form = document.getElementById('reminderForm');
        if (!form) { this.showNotification('Reminder form not found', 'error'); return; }

  form.elements.appointment_id.value = finalApt.id || '';
  // prefer offset_minutes (the select is named offset_minutes in HTML)
  if (form.elements.offset_minutes) form.elements.offset_minutes.value = '30';
  else if (form.elements.offset) form.elements.offset.value = '30';
        const customGroup = document.getElementById('customOffsetGroup');
        if (customGroup) customGroup.style.display = 'none';
  // ensure custom input is cleared and disabled by default (only enabled when user selects Custom)
  const customInput = form.elements.custom_minutes;
  if (customInput) { customInput.value = ''; customInput.setAttribute('disabled', 'disabled'); }

        this.openModal('reminderModal');
      } catch (err) {
        console.error('Error opening reminder modal:', err);
        this.showNotification('Unable to open reminder modal', 'error');
      }
    }

    async saveForm(formId, endpoint, callback) {
        const form = document.getElementById(formId);
        if (!form.checkValidity()) {
                form.reportValidity();
                return;
        }
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // If appointment endpoint, normalize datetime-local to MySQL DATETIME
        if (endpoint === 'appointments.php' && data.appointment_date) {
                // Validate appointment date (minimum 2 days from today)
                if (!this.validateAppointmentDate(data.appointment_date)) {
                    return;
                }
                
                try {
                        const d = new Date(data.appointment_date);
                        const pad = n => String(n).padStart(2, '0');
                        data.appointment_date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
                } catch (e) {
                        console.warn('Could not normalize appointment_date', e);
                }
                
                // Set status to pending for new appointments
                if (!data.id) {
                    data.status = 'pending';
                } else if (typeof data.status === 'undefined') {
                    data.status = '';
                }
                
                // Get doctor name from selected option if doctor_id is present
                if (data.doctor_id) {
                    const selectId = formId === 'editAppointmentForm' ? 'editDoctorSelect' : 'doctorSelect';
                    const selectElement = document.getElementById(selectId);
                    if (selectElement && selectElement.selectedOptions[0]) {
                        data.doctor_name = selectElement.selectedOptions[0].textContent;
                    }
                }
        }

        // Use PUT for updates (when id present) otherwise POST to create
        const method = data.id ? 'PUT' : 'POST';
  console.log(`[DEBUG] saveForm -> endpoint: ${endpoint}, method: ${method}, payload:`, data);
  const result = await this.apiCall(endpoint, method, data);
  console.log('[DEBUG] saveForm -> response:', result);

  if (result.success) {
    this.showNotification(result.message || 'Saved successfully!', 'success');
    this.closeModal(form.closest('.modal-overlay').id);
    form.reset();
    if(callback) callback();
  } else {
    // If server returned raw non-JSON, show it in console and include a short hint to user
    if (result && result.raw) {
        console.error('Server raw response:', result.raw);
        this.showNotification('Save failed: server returned unexpected response. Check console for details.', 'error');
    } else {
        this.showNotification(result.message || 'Failed to save.', 'error');
    }
  }
    }

  async deleteEmergencyContact(id) {
    this.showConfirmation('Are you sure you want to delete this contact?', async () => {
        // Send id in body so apiCall can simulate DELETE via POST + _method
        const result = await this.apiCall('emergency_contacts.php', 'DELETE', { id });
        if (result.success) {
            this.showNotification('Contact deleted', 'success');
            this.loadEmergencyContacts();
        } else {
            console.error('Delete contact failed:', result.raw || result.message);
            this.showNotification('Failed to delete contact', 'error');
        }
    });
  }

    handleProfileMenu(section) {
      console.log('📱 Profile menu clicked:', section); // ADD THIS LINE
      switch (section) {
        case 'signOut':
          this.signOut();
          break;
        case 'my-report':
          console.log('📊 Opening report modal...'); // ADD THIS LINE
          openReportModal();
          break; 
        case 'help-support':
        case 'basic-info':
        case 'medical-info':
        case 'password-security':
          this.openProfileSection(section);
          break;
      }
    }

  openProfileSection(section) {
    const modalId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Modal`;
    const formId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Form`;
    const form = document.getElementById(formId);
    
    if (this.profileData && form) {
        Object.keys(this.profileData).forEach(key => {
            const input = form.elements[key];
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!parseInt(this.profileData[key], 10);
                } else {
                    input.value = this.profileData[key] || '';
                }
            }
        });
        
        if (section === 'medical-info' && this.profileData.allergies) {
            this.allergies = this.profileData.allergies.split(',').filter(a => a.trim() !== '');
            this.renderAllergies();
        }
    }
    this.openModal(modalId);
  }

  async saveProfileSection(section) {
    const formId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Form`;
    const form = document.getElementById(formId);
    
    if (section === 'password-security') {
        const newPass = form.elements.new_password.value;
        const confirmPass = form.elements.confirm_password.value;
        if (newPass && newPass.length < 8) {
            this.showNotification('Password must be at least 8 characters.', 'error');
            return;
        }
        if (newPass !== confirmPass) {
            this.showNotification('New passwords do not match.', 'error');
            return;
        }
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (section === 'medical-info') {
        data.allergies = this.allergies.join(',');
    }
    
    data.two_factor_auth = form.elements.two_factor_auth ? (form.elements.two_factor_auth.checked ? 1 : 0) : 0;

    const payload = { section, data };
    const result = await this.apiCall('profile.php', 'PUT', payload);

    if(result.success) {
        this.showNotification('Profile updated!', 'success');
        const modalId = `${section.replace(/-(\w)/g, (match, letter) => letter.toUpperCase())}Modal`;
        this.closeModal(modalId);
        await this.loadUserProfile(); 
    } else {
        this.showNotification(result.message || 'Update failed.', 'error');
    }
  }

  toggleProfileEditMode(modalContent, forceState = null) {
    const isEditing = modalContent.classList.contains('edit-mode');
    const newState = forceState !== null ? forceState : !isEditing;

    if (newState) {
        modalContent.classList.add('edit-mode');
        modalContent.querySelectorAll('input, textarea').forEach(el => {
            el.removeAttribute('readonly');
            if (el.type === 'checkbox') el.removeAttribute('disabled');
        });
        modalContent.querySelector('.profile-add-btn')?.removeAttribute('disabled');
    } else {
        modalContent.classList.remove('edit-mode');
        modalContent.querySelectorAll('input, textarea').forEach(el => {
            el.setAttribute('readonly', 'true');
            if (el.type === 'checkbox') el.setAttribute('disabled', 'true');
        });
        modalContent.querySelector('.profile-add-btn')?.setAttribute('disabled', 'true');
    }
  }

  addAllergy() {
    const input = document.getElementById('newAllergyInput');
    const allergyText = input.value.trim();
    if (allergyText && !this.allergies.includes(allergyText)) {
        this.allergies.push(allergyText);
        this.renderAllergies();
        input.value = '';
    }
  }

  removeAllergy(allergyText) {
      this.allergies = this.allergies.filter(a => a !== allergyText);
      this.renderAllergies();
  }

  renderAllergies() {
      const container = document.getElementById('allergiesList');
      container.innerHTML = '';
      this.allergies.forEach(allergy => {
          const tag = document.createElement('div');
          tag.className = 'allergy-tag';
          tag.textContent = allergy;
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '&times;';
          removeBtn.onclick = () => this.removeAllergy(allergy);
          tag.appendChild(removeBtn);
          container.appendChild(tag);
      });
  }

    async handleSOSActivation() {
    this.showNotification('Activating SOS... Determining location.', 'info');

    try {
        // --- Part 1: Get Info & Show Modal Immediately ---

      // 1. Get Location & Address
      const position = await this.getCurrentPosition();

      const { latitude, longitude } = position.coords;

const geoResponse = await fetch(`api/reverse_geocode.php?lat=${latitude}&lon=${longitude}`, {
    headers: {
        'Authorization': `Bearer ${this.userSession?.session_token}`
    }
});

const geoData = await geoResponse.json();

// Check the JSON success property instead of HTTP status
if (!geoData.success) throw new Error('Reverse geocoding failed.');
      // Use the address field returned from PHP
      const locationString = 
          geoData.display_name || 
          (geoData.address ? 
              Object.values(geoData.address).join(', ') : 
              `Latitude: ${latitude}, Longitude: ${longitude}`);


        // 2. Get User Name
        if (!this.profileData) {
            await this.loadUserProfile();
        }
        const userName = this.profileData ? this.profileData.name : "A MomCare User";

        // 3. Display the alert modal to the user FIRST
        const sosAlertBody = document.getElementById('sosAlertBody');
        sosAlertBody.innerHTML = `
            <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
                <strong>${userName}</strong> needs IMMEDIATE help!
            </p>
            <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                <strong>LOCATION:</strong><br>${locationString}
            </p>
            <p style="font-size: 14px; color: #777;" id="sos-sending-status">Sending alert to emergency contacts...</p>
        `;
        this.openModal('sosAlertModal');

        // --- Part 2: Send Notification in the Background ---

        // 4. Construct message and send to backend
        const message = `${userName} needs IMMEDIATE help! LOCATION:\n${locationString}`;
        const sosResult = await this.apiCall('send_sos.php', 'POST', {
            message: message
        });
        
        const statusEl = document.getElementById('sos-sending-status');

        if (sosResult.success) {
             this.showNotification('SOS Alert Sent!', 'success');
             if (statusEl) statusEl.textContent = 'Your emergency contacts have been notified.';
        } else {
             // The modal is already shown, so we just update the status inside it.
             this.showNotification(sosResult.message || 'Failed to send SOS alerts.', 'error');
             if (statusEl) statusEl.innerHTML = `<strong style="color: #e74c3c;">Could not notify contacts.</strong> Please call them directly.`;
             throw new Error(sosResult.message || 'Failed to send SOS alerts.');
        }

    } catch (error) {
        // This catch now handles errors from location/geocoding, and also from the API call
        // but the modal will have been shown if the location part succeeded.
        console.error('SOS Activation Error:', error);
        let errorMessage = 'Could not activate SOS. ';
        if (error.message.includes('permission denied')) {
            errorMessage += 'Please enable location services in your browser.';
        } else if (error.message.includes('geocoding failed')) {
            errorMessage += 'Could not determine your address.';
        } else {
            // This is for API errors, which now happen AFTER the modal is shown.
            // We can just log it, as the modal itself will show a failure message.
            console.error("SOS API call failed:", error.message);
            return; 
        }
        this.showNotification(errorMessage, 'error');
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
        }
        // Set a timeout for the location request
        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 0
        };
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }
  
  async viewAll(type) {
    try {
      const result = await this.apiCall(`${type}.php`);
      console.log('View All API response:', result);
      
      if(result.success) {
          document.getElementById('viewAllTitle').textContent = `All ${type.charAt(0).toUpperCase() + type.slice(1)}`;
          
          const milestoneTabs = document.getElementById('milestoneTabs');
          
          if (type === 'appointments') {
              milestoneTabs.style.display = 'none';
              this.displayAppointments(result.appointments, 'viewAllBody');
          } else if (type === 'milestones') {
              milestoneTabs.style.display = 'flex';
              this.allMilestones = result.milestones; // Store all milestones
              this.currentMilestoneFilter = 'pending'; // Reset to default
              
              // Reset tabs to default (Pending active)
              document.querySelectorAll('.milestone-tab').forEach(t => t.classList.remove('active'));
              document.querySelector('.milestone-tab[data-filter="pending"]').classList.add('active');
              
              this.filterMilestones('pending'); // Show incomplete by default
              this.setupMilestoneTabListeners();
          }
          this.openModal('viewAllModal');
      } else {
        console.error('View All failed:', result);
        this.showNotification('Failed to load data', 'error');
      }
    } catch (error) {
      console.error('View All error:', error);
      this.showNotification('Error loading data', 'error');
    }
  }  setupMilestoneTabListeners() {
    document.querySelectorAll('.milestone-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        
        // Update active tab
        document.querySelectorAll('.milestone-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        // Filter milestones
        this.filterMilestones(filter);
      });
    });
  }

  filterMilestones(filter) {
    if (!this.allMilestones) return;
    
    let filtered;
    if (filter === 'complete') {
      filtered = this.allMilestones.filter(m => m.status === 'complete');
    } else {
      filtered = this.allMilestones.filter(m => m.status === 'pending');
    }
    
    this.displayMilestones(filtered, 'viewAllBody');
  }

  async savePost() {
      const form = document.getElementById('createPostForm');
       if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const result = await this.apiCall('forum.php?action=create_post', 'POST', data);
      if(result.success) {
          this.showNotification('Post created!', 'success');
          this.closeModal('createPostModal');
          form.reset();
          this.loadForumContent(); 
      }
  }

  async saveReply() {
      const form = document.getElementById('replyForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.post_id = this.currentPostId;

      const result = await this.apiCall('forum.php?action=create_reply', 'POST', data);
      if(result.success) {
          form.reset();
          this.viewPost(this.currentPostId);
      }
  }

  async likePost(postId) {
      const result = await this.apiCall('forum.php?action=like_post', 'POST', { post_id: postId });
      if(result.success) {
        this.loadForumContent(document.querySelector('#trendingTags .tag-new.active').dataset.tag);
      }
  }

  async reportPost(postId, reason = '') {
    const result = await this.apiCall('forum.php?action=report_post', 'POST', { post_id: postId, reason });
    return result;
  }

  // New structured report API: sends type and details separately
  async reportPostStructured(postId, type = null, details = '') {
    // allow optional reply_id
    const replyIdEl = document.getElementById('report_reply_id');
    const replyId = replyIdEl ? replyIdEl.value : '';
    const payload = { post_id: postId, reply_id: replyId || null, type, details };
    const action = replyId ? 'report_reply' : 'report_post';
    const result = await this.apiCall(`forum.php?action=${action}`, 'POST', payload);
    return result;
  }

  signOut(force = false) {
    const performSignOut = () => {
        localStorage.removeItem("user_session");
        this.apiCall('auth.php?action=logout', 'POST'); 
        window.location.href = "landing.html";
    };

    if (force) {
        performSignOut();
    } else {
        this.showConfirmation("Are you sure you want to sign out?", performSignOut);
    }
  }
  
  switchTab(tab, isInitialLoad = false) {
    if (this.currentTab === tab && !isInitialLoad) return;
    
    if (tab === 'chat' && !isInitialLoad) {
        const agreed = localStorage.getItem('forumGuidelinesAgreed');
        if (agreed !== 'true') {
            this.openModal('forumGuidelinesModal');
            return;
        }
    }

    document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));

    document.getElementById(`tab-${tab}`).style.display = "block";
    document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add("active");
    this.currentTab = tab;
    
    this.loadTabData(tab);
  }
  
  loadTabData(tab) {
    switch (tab) {
      case "home":
        this.loadUserProfile();
        this.loadHomeData();
        break;
      case "emergency":
        this.loadEmergencyContacts();
        break;
      case "library":
        this.loadLibraryContent();
        break;
      case "chat":
        this.loadForumStats();
        this.loadForumContent();
        break;
      case "profile":
        if (!this.profileData) this.loadUserProfile();
        break;
    }
  }
  
  // --- UTILITIES --- //
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Load doctors when opening appointment modals
        if (modalId === 'appointmentModal' || modalId === 'editAppointmentModal') {
            this.loadDoctors(modalId);
            this.setMinimumAppointmentDate(modalId);
        }
        
        modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Specific cleanup for PDF viewer
        if (modalId === 'pdfViewerModal') {
            const frame = document.getElementById('pdfFrame');
            const blobUrl = frame.src;
            if (blobUrl && blobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrl);
            }
            frame.src = 'about:blank';
        }


        const closeModalLogic = () => {
            modal.classList.remove('active');
            const form = modal.querySelector('form');
            if (form) form.reset();
            if (modal.classList.contains('profile-modal')) {
                this.toggleProfileEditMode(modal.querySelector('.profile-page-content'), false);
                 if (this.currentTab === 'profile') {
                    this.loadUserProfile();
                 }
            }
        };

        if (modal.classList.contains('profile-modal')) {
            // Immediately close profile modal without slide-out animation
            const content = modal.querySelector('.profile-page-content');
            modal.classList.remove('active');
            if (content) {
                content.style.transform = '';
                const form = modal.querySelector('form');
                if (form) form.reset();
                this.toggleProfileEditMode(content, false);
            }
            if (this.currentTab === 'profile') {
                this.loadUserProfile();
            }
        } else {
            closeModalLogic();
        }
    }


  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
  
  showConfirmation(message, onConfirm) {
      document.getElementById('confirmMessage').textContent = message;
      const confirmBtn = document.getElementById('confirmOK');
      
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

      newConfirmBtn.addEventListener('click', () => {
          this.closeModal('confirmModal');
          if(onConfirm) onConfirm();
      });
      
      this.openModal('confirmModal');
  }
  
  // Load doctors - simplified to single fixed doctor (Dr. Casallo)
  async loadDoctors(modalId) {
    // Set a single doctor entry so other code that reads this.doctorsData still works
    this.doctorsData = [{ id: 1, name: 'Dr. Casallo', email: null, contact: null }];
    // No dropdown to populate; forms use hidden inputs for doctor_id/doctor_name
    return;
  }
  
  // Set minimum date for appointments (2 days from today)
  setMinimumAppointmentDate(modalId) {
      const now = new Date();
      now.setDate(now.getDate() + 2); // Add 2 days
      
      // Set default time to 8am if before 8am
      if (now.getHours() < 8) {
          now.setHours(8, 0, 0, 0);
      }
      
      // Format date as YYYY-MM-DDTHH:MM for datetime-local input
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      const inputId = modalId === 'editAppointmentModal' ? 'editAppointmentDate' : 'appointmentDate';
      const dateInput = document.getElementById(inputId);
      
      if (dateInput) {
          dateInput.min = minDateTime;
          
          // Add event listener to validate time is between 8am and 6pm
          dateInput.addEventListener('change', (e) => {
              const selectedDateTime = new Date(e.target.value);
              const hours = selectedDateTime.getHours();
              
              if (hours < 8 || hours >= 18) {
                  this.showNotification('Appointment time must be between 8:00 AM and 6:00 PM', 'error');
                  e.target.value = '';
              }
          });
      }
  }
  
  // Validate appointment date before saving
  validateAppointmentDate(dateValue) {
      const selectedDate = new Date(dateValue);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 2);
      
      if (selectedDate < minDate) {
          this.showNotification('Appointment must be at least 2 days from today', 'error');
          return false;
      }
      
      // Validate time is between 8am and 6pm
      const hours = selectedDate.getHours();
      if (hours < 8 || hours >= 18) {
          this.showNotification('Appointment time must be between 8:00 AM and 6:00 PM', 'error');
          return false;
      }
      
      return true;
  }
}

//This is for the report generation
// Function to open report modal
function openReportModal() {
    const reportModal = document.getElementById('myReportModal');
    if (reportModal) {
        reportModal.classList.add('active');
        
        // Add event listener for download button
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        if (downloadReportBtn) {
            // Remove any existing listeners to avoid duplicates
            downloadReportBtn.replaceWith(downloadReportBtn.cloneNode(true));
            // Get the new button reference and add listener
            const newDownloadBtn = document.getElementById('downloadReportBtn');
            newDownloadBtn.addEventListener('click', downloadReport);
            console.log('Download button listener attached');
        }
        
        // Load report data
        loadReportData();
    }
}

// Function to load report data from server
async function loadReportData() {
    const loadingDiv = document.getElementById('report-loading');
    const contentDiv = document.getElementById('report-content');
    
    // Show loading state
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (contentDiv) contentDiv.style.display = 'none';
    
    try {
        // Get session token from user_session
        const sessionData = localStorage.getItem('user_session');
        if (!sessionData) {
            throw new Error('Not authenticated');
        }
        
        const session = JSON.parse(sessionData);
        const token = session.session_token;
        
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        // Fetch report data from PHP
        const response = await fetch('api/get_report_data.php', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Report API error:', response.status, errorText);
            throw new Error(`Failed to fetch report data (${response.status})`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Populate the report with data
            populateReport(result.data);
            
            // Hide loading, show content
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (contentDiv) contentDiv.style.display = 'block';
        } else {
            throw new Error(result.message || 'Failed to load report');
        }
        
    } catch (error) {
        console.error('Error loading report:', error);
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #f44336; margin-bottom: 15px;">⚠️ Failed to load report</p>
                    <p style="color: #666; font-size: 14px;">${error.message}</p>
                    <button onclick="loadReportData()" style="margin-top: 20px; padding: 12px 24px; background: #FF6B9D; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Function to populate report with data
function populateReport(data) {
    const { pregnancy, appointments, milestones } = data;
    
    // ========== PREGNANCY PROGRESS ==========
    if (pregnancy) {
        // Current week
        const currentWeekEl = document.getElementById('report-current-week');
        const totalWeeksEl = document.getElementById('report-total-weeks');
        if (currentWeekEl) currentWeekEl.textContent = pregnancy.currentWeek || 0;
        if (totalWeeksEl) totalWeeksEl.textContent = pregnancy.totalWeeks || 40;
        
        // Trimester
        const trimesterEl = document.getElementById('report-trimester');
        if (trimesterEl) trimesterEl.textContent = pregnancy.trimester || '1st Trimester';
        
        // Progress bar
        const progressPercent = pregnancy.progressPercent || 0;
        const progressFillEl = document.getElementById('report-progress-fill');
        const progressPercentEl = document.getElementById('report-progress-percent');
        if (progressFillEl) progressFillEl.style.width = progressPercent + '%';
        if (progressPercentEl) progressPercentEl.textContent = progressPercent + '%';
        
        // Days pregnant and remaining
        const daysPregnantEl = document.getElementById('report-days-pregnant');
        const daysRemainingEl = document.getElementById('report-days-remaining');
        if (daysPregnantEl) daysPregnantEl.textContent = pregnancy.daysPregnant || 0;
        if (daysRemainingEl) daysRemainingEl.textContent = pregnancy.daysRemaining || 0;
        
        // Due date
        const dueDateEl = document.getElementById('report-due-date');
        if (dueDateEl) {
            if (pregnancy.dueDate) {
                const dueDateObj = new Date(pregnancy.dueDate);
                const formattedDate = dueDateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                dueDateEl.textContent = formattedDate;
            } else {
                dueDateEl.textContent = 'Not set';
            }
        }
    }
    
    // ========== MILESTONES ==========
    if (milestones) {
        // Numbers
        const completedEl = document.getElementById('report-milestones-completed');
        const pendingEl = document.getElementById('report-milestones-pending');
        const totalEl = document.getElementById('report-milestones-total');
        
        if (completedEl) completedEl.textContent = milestones.completed || 0;
        if (pendingEl) pendingEl.textContent = milestones.pending || 0;
        if (totalEl) totalEl.textContent = milestones.total || 0;
        
        // Completion rate
        const milestoneRate = milestones.completionRate || 0;
        const rateEl = document.getElementById('report-milestone-rate');
        const fillEl = document.getElementById('report-milestone-fill');
        
        if (rateEl) rateEl.textContent = milestoneRate + '%';
        if (fillEl) fillEl.style.width = milestoneRate + '%';
        
        // Latest completed milestone
        const nameEl = document.getElementById('latest-milestone-name');
        const dateEl = document.getElementById('latest-milestone-date');
        
        if (milestones.latestCompleted && nameEl) {
            const latest = milestones.latestCompleted;
            nameEl.textContent = latest.name;
            
            if (latest.completed_date && dateEl) {
                const completedDate = new Date(latest.completed_date);
                dateEl.textContent = 'Completed: ' + completedDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
            }
        } else if (nameEl) {
            nameEl.textContent = 'No milestones completed yet';
            if (dateEl) dateEl.textContent = '';
        }
    }
    
    // ========== APPOINTMENTS ==========
    if (appointments) {
        // Numbers
        const pendingCount = appointments.pending || 0;
        const approvedCount = appointments.approved || 0;
        const completedCount = appointments.completed || 0;
        const cancelledCount = appointments.cancelled || 0;
        const totalCount = appointments.total || 0;
        
        const pendingEl = document.getElementById('report-appt-pending');
        const approvedEl = document.getElementById('report-appt-approved');
        const completedEl = document.getElementById('report-appt-completed');
        const cancelledEl = document.getElementById('report-appt-cancelled');
        
        if (pendingEl) pendingEl.textContent = pendingCount;
        if (approvedEl) approvedEl.textContent = approvedCount;
        if (completedEl) completedEl.textContent = completedCount;
        if (cancelledEl) cancelledEl.textContent = cancelledCount;
        
        // Calculate bar widths (percentage of total)
        if (totalCount > 0) {
            const pendingPercent = (pendingCount / totalCount) * 100;
            const approvedPercent = (approvedCount / totalCount) * 100;
            const completedPercent = (completedCount / totalCount) * 100;
            const cancelledPercent = (cancelledCount / totalCount) * 100;
            
            const pendingBarEl = document.getElementById('report-appt-pending-bar');
            const approvedBarEl = document.getElementById('report-appt-approved-bar');
            const completedBarEl = document.getElementById('report-appt-completed-bar');
            const cancelledBarEl = document.getElementById('report-appt-cancelled-bar');
            
            if (pendingBarEl) pendingBarEl.style.width = pendingPercent + '%';
            if (approvedBarEl) approvedBarEl.style.width = approvedPercent + '%';
            if (completedBarEl) completedBarEl.style.width = completedPercent + '%';
            if (cancelledBarEl) cancelledBarEl.style.width = cancelledPercent + '%';
        }
        
        // Attendance rate
        const attendanceRate = appointments.completionRate || 0;
        const rateEl = document.getElementById('report-appt-rate');
        if (rateEl) rateEl.textContent = attendanceRate + '%';
        
        // Next appointment
        const titleEl = document.getElementById('next-appt-title');
        const dateEl = document.getElementById('next-appt-date');
        const doctorEl = document.getElementById('next-appt-doctor');
        const actionEl = document.getElementById('next-appt-action');
        const containerEl = document.getElementById('next-appointment-report-container');
        
        if (appointments.next) {
            const next = appointments.next;
            
            // Store the appointment ID for cancellation
            if (window.app) {
                window.app.reportNextAppointmentId = next.id;
            }
            
            if (titleEl) titleEl.textContent = next.title || 'Appointment';
            
            if (next.appointment_date && dateEl) {
                const apptDate = new Date(next.appointment_date);
                dateEl.textContent = apptDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                });
            }
            
            if (next.doctor_name && doctorEl) {
                doctorEl.textContent = 'Doctor: ' + next.doctor_name;
            }
            
            // Show cancel button
            if (actionEl) {
                actionEl.style.display = 'block';
            }
            
            // Remove cancelled styling if exists
            if (containerEl) {
                containerEl.classList.remove('appointment-cancelled-report');
            }
        } else {
            if (titleEl) titleEl.textContent = 'No upcoming appointments';
            if (dateEl) dateEl.textContent = '';
            if (doctorEl) doctorEl.textContent = 'Schedule your next checkup!';
            
            // Hide cancel button
            if (actionEl) {
                actionEl.style.display = 'none';
            }
        }
    }
    
    // ========== THIS WEEK SUMMARY ==========
    calculateWeekSummary(milestones, appointments);
}

// Function to calculate this week's statistics
function calculateWeekSummary(milestones, appointments) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
    weekEnd.setHours(23, 59, 59, 999);
    
    // Count milestones completed this week
    let milestonesThisWeek = 0;
    if (milestones && milestones.all) {
        milestonesThisWeek = milestones.all.filter(m => {
            if (m.completed_date) {
                const completedDate = new Date(m.completed_date);
                return completedDate >= weekStart && completedDate <= weekEnd;
            }
            return false;
        }).length;
    }
    
    // Count appointments this week
    let appointmentsThisWeek = 0;
    if (appointments && appointments.all) {
        appointmentsThisWeek = appointments.all.filter(a => {
            if (a.appointment_date) {
                const apptDate = new Date(a.appointment_date);
                return apptDate >= weekStart && apptDate <= weekEnd;
            }
            return false;
        }).length;
    }
    
    // Update display
    const milestonesEl = document.getElementById('report-week-milestones');
    const appointmentsEl = document.getElementById('report-week-appointments');
    const encouragementEl = document.getElementById('report-encouragement');
    
    if (milestonesEl) milestonesEl.textContent = milestonesThisWeek;
    if (appointmentsEl) appointmentsEl.textContent = appointmentsThisWeek;
    
    // Encouraging message based on activity
    let message = 'Keep up the great work!';
    if (milestonesThisWeek > 0 && appointmentsThisWeek > 0) {
        message = "Amazing week! You're staying on track! 🌟";
    } else if (milestonesThisWeek > 0) {
        message = "Great job completing milestones! 🎯";
    } else if (appointmentsThisWeek > 0) {
        message = "Good job staying on schedule! 📅";
    } else {
        message = "Take care of yourself and your baby! 💕";
    }
    
    if (encouragementEl) encouragementEl.textContent = message;
}

// Function to download report as PDF
async function downloadReport() {
    console.log('Download report clicked');
    
    // Get the report content
    const reportContent = document.getElementById('report-content');
    if (!reportContent || reportContent.style.display === 'none') {
        if (window.app) {
            window.app.showNotification('Please wait for the report to load before downloading.', 'error');
        } else {
            alert('Please wait for the report to load before downloading.');
        }
        return;
    }
    
    // Check if libraries are loaded
    if (typeof html2canvas === 'undefined') {
        if (window.app) {
            window.app.showNotification('PDF library not loaded. Please refresh the page.', 'error');
        } else {
            alert('PDF library not loaded. Please refresh the page.');
        }
        console.error('html2canvas not loaded');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        if (window.app) {
            window.app.showNotification('PDF library not loaded. Please refresh the page.', 'error');
        } else {
            alert('PDF library not loaded. Please refresh the page.');
        }
        console.error('jsPDF not loaded');
        return;
    }
    
    // Show loading notification
    if (window.app) {
        window.app.showNotification('Generating PDF... Please wait.', 'info');
    }
    
    try {
        // Get user name for filename
        const userName = document.getElementById('userName')?.textContent || 'User';
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const filename = `MomCare_Report_${userName.replace(/\s+/g, '_')}_${dateStr}.pdf`;
        
        console.log('Creating PDF container...');
        
        // Create a container for the report with better styling for PDF
        const pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 800px;
            background: white;
            padding: 40px;
            font-family: Arial, sans-serif;
        `;
        
        // Add title and date
        pdfContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FF6B9D; font-size: 28px; margin-bottom: 10px;">MomCare Pregnancy Report</h1>
                <p style="color: #666; font-size: 14px;">Generated on ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            ${reportContent.innerHTML}
        `;
        
        document.body.appendChild(pdfContainer);
        
        console.log('Converting to canvas...');
        
        // Use html2canvas to convert the content to canvas
        const canvas = await html2canvas(pdfContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        console.log('Canvas created:', canvas.width, 'x', canvas.height);
        
        // Remove the temporary container
        document.body.removeChild(pdfContainer);
        
        console.log('Creating PDF...');
        
        // Create PDF using jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Calculate dimensions to fit the page
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add new pages if content is longer than one page
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        console.log('Saving PDF as:', filename);
        
        // Save the PDF
        pdf.save(filename);
        
        if (window.app) {
            window.app.showNotification('PDF downloaded successfully!', 'success');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        if (window.app) {
            window.app.showNotification('Failed to generate PDF: ' + error.message, 'error');
        } else {
            alert('Failed to generate PDF: ' + error.message);
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {
  window.app = new MomCareApp();
});

const style = document.createElement("style");
style.textContent = `
  .notification {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10001;
    animation: slideInDown 0.5s ease, fadeOut 0.5s ease 2.5s;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }
  .notification-success { background-color: #4CAF50; }
  .notification-error { background-color: #f44336; }
  .notification-info { background-color: #2196F3; }
  
  @keyframes slideInDown {
    from { transform: translate(-50%, -100px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  .post-item {
    background: #ffffffff; padding: 15px; margin-bottom: 10px; border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;
  }
  .post-item:hover { background: #f9f9f9; }
  .post-item h4 { color: #000000ff; margin-bottom: 5px; }
  .post-item p { font-size: 12px; color: #666; margin-bottom: 10px; }
  .like-btn {
    background: #eee; border: 1px solid #ddd; border-radius: 20px; padding: 5px 10px; cursor: pointer;
  }
    .like-btn:hover {
    background: #ff87ab; color: #fff; border: 1px solid #ccc; cursor: pointer;
  }
  .reply-item { color: #000000ff; border-bottom: 1px solid #eee; padding: 10px 0; }
  .download-section { margin-bottom: 20px; }
  .modal-post-content { margin-top: 15px; margin-bottom: 10px; color: #161616ff; }
  .modal-post-author { font-size: 13px; color: #555353ff; display: block; margin-bottom: 20px; }
  .reply-author { font-size: 13px; color: #555353ff; }
    .replies-count { color: #000000; }
    .modal-replies-title { margin-top: 20px; color: #e21370; }
`;
document.head.appendChild(style);

// Help & Support — wire up FAQ / Medical Guidelines to open inside the Help tab
function setupHelpLinks() {
  try {
    // FAQ card (uses <p>FAQ</p>)
    const faqCard = Array.from(document.querySelectorAll('.help-card')).find(c => (c.querySelector('p')?.textContent || '').trim() === 'FAQ');
    if (faqCard) {
      faqCard.style.cursor = 'pointer';
      faqCard.addEventListener('click', () => openHelpOverlay('./help/faq.html'));
    }

    // Medical Guidelines link
    const medLink = document.querySelector('.help-links-container .help-link');
    if (medLink) {
      medLink.style.cursor = 'pointer';
      medLink.addEventListener('click', (e) => {
        e.preventDefault();
        openHelpOverlay('./help/medguide.html');
      });
    }
  } catch (err) {
    console.error('setupHelpLinks error', err);
  }
}

function openHelpOverlay(url) {
  const modal = document.getElementById('helpSupportModal');
  const container = modal ? modal.querySelector('.profile-page-body') : document.querySelector('.profile-page-body');
  if (!container) return;

  let overlay = container.querySelector('#helpContentOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'helpContentOverlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#fff';
    overlay.style.zIndex = '1000';
    overlay.style.overflow = 'hidden';

    overlay.innerHTML = `
      <button id="closeHelpContent" style="position:absolute;top:18px;left:18px;background:#FFF8F8;border:1px solid #e21370;color:#e21370;cursor:pointer;font-size:16px;padding:8px 16px;border-radius:20px;">
        <i class="fas fa-arrow-left"></i> Back
      </button>
      <iframe id="helpContentFrame" style="width:100%;height:100%;border:none;margin-top:0;"></iframe>
    `;

    container.appendChild(overlay);

    overlay.querySelector('#closeHelpContent').addEventListener('click', () => {
      overlay.style.display = 'none';
      // restore scrolling
      container.style.overflowY = 'auto';
    });
  }

  const iframe = overlay.querySelector('#helpContentFrame');
  if (iframe) {
    iframe.src = url;
    overlay.style.display = 'block';
    // prevent the underlying container from scrolling
    container.style.overflowY = 'hidden';
  }
}

// Run wiring once the script loads (elements exist because script is at end of body)
setupHelpLinks();

// LMP Calculator Overlay Control
function showLmpOverlay() {
    const container = document.querySelector('.tab-content');
    const basicInfoForm = document.getElementById('basicInfoForm');
    const helpLink = document.querySelector('.due-date-help-link');
    const overlay = document.getElementById('lmpOverlay');
    
    // Hide the form and help link
    basicInfoForm.style.display = 'none';
    helpLink.style.display = 'none';
    
    // Make container relative if not already
    if (container.style.position !== 'relative') {
        container.style.position = 'relative';
    }
    
    // Show overlay
    overlay.style.display = 'block';
    
    // Reload the calculator
    document.getElementById('lmpFrame').contentWindow.location.reload();
}

function hideLmpOverlay() {
    document.getElementById('lmpOverlay').style.display = 'none';
    document.getElementById('basicInfoForm').style.display = 'block';
    document.querySelector('.due-date-help-link').style.display = 'block';
}
// Expose hideLmpOverlay to iframe parent
window.hideLmpOverlay = hideLmpOverlay;

// Helper: show the Basic Information form, hide the LMP overlay and bring the form into view.
function showBasicInformation() {
  try {
    // ensure overlay is hidden and basic form visible
    hideLmpOverlay();
    const el = document.getElementById('basicInfoForm');
    if (el) {
      // smooth scroll into view on capable browsers
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // focus on the first input if present
      const firstInput = el.querySelector('input, select, textarea, button');
      if (firstInput && typeof firstInput.focus === 'function') {
        firstInput.focus();
      }
    }
  } catch (e) {
    // no-op on error
  }
}
// Expose to iframe
window.showBasicInformation = showBasicInformation;
