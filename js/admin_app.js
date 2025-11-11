class MomCareAdminApp {
    constructor() {
        this.currentTab = "home";
        this.allAppointments = [];
        this.currentAppointmentId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTabData("home");
    }

    async apiCall(action, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: {}
        };

        if (body) {
            options.body = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(`admin.php?action=${action}`, options);

            if (response.status === 401) {
                this.showNotification('Session expired. Logging out.', 'error');
                setTimeout(() => window.location.reload(), 2000);
                return { success: false, message: 'Unauthorized' };
            }
            
            const result = await response.json();
            return result;

        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            this.showNotification('An error occurred. Please try again.', 'error');
            return { success: false, message: error.message };
        }
    }

    setupEventListeners() {
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", () => this.switchTab(item.dataset.tab));
        });

        document.querySelectorAll(".modal-close, .btn-cancel").forEach(btn => {
            btn.addEventListener("click", e => this.closeModal(e.target.closest(".modal-overlay").id));
        });
        document.getElementById('confirmCancel').addEventListener('click', () => this.closeModal('confirmModal'));

        const signOutBtn = document.querySelector('.profile-menu-item[data-section="signOut"]');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                this.showConfirmation("Are you sure you want to sign out?", () => this.signOut());
            });
        }

        document.getElementById('approveBtn').addEventListener('click', () => this.handleAppointmentUpdate('approved'));
        document.getElementById('rejectBtn').addEventListener('click', () => this.handleAppointmentUpdate('cancelled'));
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;

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
                this.loadAppointments();
                break;
            case "chat":
                this.loadForumPosts();
                break;
            case "profile":
                break;
        }
    }

    async signOut() {
        await this.apiCall('logout', 'POST');
        this.showNotification('Logging out...', 'success');
        setTimeout(() => window.location.reload(), 1500);
    }

    async loadAppointments() {
        const result = await this.apiCall('get_appointments');
        if (result.success) {
            this.allAppointments = result.appointments || [];
            this.displayAppointments();
        } else {
            this.showNotification(result.message || 'Failed to load appointments.', 'error');
        }
    }

    displayAppointments() {
        const pendingList = document.getElementById('pendingAppointmentsList');
        const approvedList = document.getElementById('approvedAppointmentsList');
        const cancelledList = document.getElementById('cancelledAppointmentsList');

        pendingList.innerHTML = "";
        approvedList.innerHTML = "";
        cancelledList.innerHTML = "";

        let pendingCount = 0, approvedCount = 0, cancelledCount = 0;

        this.allAppointments.forEach(apt => {
            const date = new Date(apt.appointment_date.replace(' ', 'T'));
            const aptHtml = `
                <div class="appointment-item" data-id="${apt.id}" style="border-left-width: 0; cursor: ${apt.status === 'pending' ? 'pointer' : 'default'};">
                    <div class="appointment-item-info" style="padding-bottom: 5px;">
                        <div class="appointment-item-name">${apt.title} (Patient: ${apt.user_name})</div>
                        <div class="appointment-item-date">${date.toLocaleString()}</div>
                        <div class="appointment-item-doctor" style="color: #333;">Phone: ${apt.user_phone || 'N/A'}</div>
                        ${apt.doctor_comment ? `<div class="milestone-description" style="margin-top: 8px; color: #155724; background: #f0f9f3; padding: 5px 8px; border-radius: 4px;"><strong>Your Note:</strong> ${apt.doctor_comment}</div>` : ''}
                    </div>
                </div>
            `;

            if (apt.status === 'pending') {
                pendingList.innerHTML += aptHtml;
                pendingCount++;
            } else if (apt.status === 'approved') {
                approvedList.innerHTML += aptHtml;
                approvedCount++;
            } else if (apt.status === 'cancelled') {
                cancelledList.innerHTML += aptHtml;
                cancelledCount++;
            }
        });

        if (pendingCount === 0) pendingList.innerHTML = "<p class='no-data'>No pending appointments.</p>";
        if (approvedCount === 0) approvedList.innerHTML = "<p class='no-data'>No approved appointments.</p>";
        if (cancelledCount === 0) cancelledList.innerHTML = "<p class='no-data'>No cancelled appointments.</p>";

        pendingList.querySelectorAll('.appointment-item').forEach(item => {
            item.addEventListener('click', () => {
                const appId = item.dataset.id;
                this.openAppointmentModal(appId);
            });
        });
    }

    openAppointmentModal(appointmentId) {
        const apt = this.allAppointments.find(a => a.id == appointmentId);
        if (!apt) return;

        this.currentAppointmentId = appointmentId;

        document.getElementById('action_appointment_id').value = apt.id;
        document.getElementById('action_user_name').textContent = `Patient: ${apt.user_name}`;
        document.getElementById('action_appointment_title').textContent = apt.title;
        document.getElementById('action_appointment_date').textContent = new Date(apt.appointment_date.replace(' ', 'T')).toLocaleString();
        document.getElementById('doctor_comment').value = apt.doctor_comment || '';
        
        this.openModal('appointmentActionModal');
    }

    async handleAppointmentUpdate(status) {
        const id = this.currentAppointmentId;
        const comment = document.getElementById('doctor_comment').value;

        if (!id) return;

        const confirmMessage = status === 'approved' 
            ? 'Are you sure you want to APPROVE this appointment?'
            : 'Are you sure you want to REJECT this appointment?';

        this.showConfirmation(confirmMessage, async () => {
            const result = await this.apiCall('update_appointment', 'POST', {
                id: id,
                status: status,
                comment: comment
            });

            if (result.success) {
                this.showNotification(`Appointment ${status}.`, 'success');
                this.closeModal('appointmentActionModal');
                this.loadAppointments();
            } else {
                this.showNotification(result.message || 'Failed to update.', 'error');
            }
        });
    }

    async loadForumPosts() {
        const container = document.getElementById('postsContainer');
        container.innerHTML = '<p class="no-data">Loading posts...</p>';
        
        const result = await this.apiCall('get_forum_posts');
        
        if (result.success && result.posts) {
            this.displayForumPosts(result.posts);
        } else {
            container.innerHTML = '<p class="no-data">Could not load posts.</p>';
        }
    }

    displayForumPosts(posts) {
        const container = document.getElementById('postsContainer');
        container.innerHTML = '';
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p class="no-data">No posts found.</p>';
            return;
        }

        posts.forEach(post => {
            container.innerHTML += `
              <div class="post-item" data-post-id="${post.id}">
                <h4>${post.title}</h4>
                <p>by ${post.author_name} on ${new Date(post.created_at).toLocaleDateString()}</p>
                <div class="post-actions">
                    <span class="replies-count">💬 ${post.replies_count || 0} Replies</span>
                    <button class="btn-delete-post" data-post-id="${post.id}" style="margin-left: auto; background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                        DELETE POST
                    </button>
                </div>
              </div>`;
        });

        container.querySelectorAll('.post-item').forEach(item => item.addEventListener('click', e => {
            if (!e.target.classList.contains('btn-delete-post')) {
                console.log('View post details (admin)...');
            }
        }));

        container.querySelectorAll('.btn-delete-post').forEach(btn => btn.addEventListener('click', e => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            this.showConfirmation('Are you sure you want to delete this post? This cannot be undone.', () => {
                this.deletePost(postId);
            });
        }));
    }

    async deletePost(postId) {
        const result = await this.apiCall('delete_post', 'POST', { post_id: postId });
        if (result.success) {
            this.showNotification('Post deleted.', 'success');
            this.loadForumPosts();
        } else {
            this.showNotification(result.message || 'Failed to delete post.', 'error');
        }
    }

    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
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
}

document.addEventListener("DOMContentLoaded", () => {
    window.adminApp = new MomCareAdminApp();
});