/**
 * MOBILE TOUCH ENHANCEMENTS
 * Improves touch interactions and user experience on mobile devices
 */

(function() {
  'use strict';

  // ===== 1. PREVENT DOUBLE-TAP ZOOM ON BUTTONS =====
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      // Check if the target is a button or interactive element
      const target = event.target;
      if (target.tagName === 'BUTTON' || 
          target.classList.contains('btn') ||
          target.classList.contains('tab-item') ||
          target.closest('button') ||
          target.closest('.btn')) {
        event.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, false);

  // ===== 2. HAPTIC FEEDBACK (iOS Safari & Android Chrome) =====
  function triggerHaptic(style = 'light') {
    // For iOS devices with haptic feedback support
    if (window.navigator && window.navigator.vibrate) {
      // Light haptic
      if (style === 'light') {
        navigator.vibrate(10);
      }
      // Medium haptic
      else if (style === 'medium') {
        navigator.vibrate(20);
      }
      // Heavy haptic (for important actions)
      else if (style === 'heavy') {
        navigator.vibrate([30, 10, 30]);
      }
    }
  }

  // Add haptic feedback to buttons
  function addHapticToElement(element, style = 'light') {
    element.addEventListener('touchstart', function() {
      triggerHaptic(style);
    }, { passive: true });
  }

  // Apply haptic feedback to common interactive elements
  document.addEventListener('DOMContentLoaded', function() {
    // Regular buttons
    document.querySelectorAll('button, .btn, .form-btn').forEach(btn => {
      addHapticToElement(btn, 'light');
    });

    // Emergency button - stronger haptic
    document.querySelectorAll('.emergency-button').forEach(btn => {
      addHapticToElement(btn, 'heavy');
    });

    // Tab items
    document.querySelectorAll('.tab-item').forEach(tab => {
      addHapticToElement(tab, 'light');
    });
  });

  // ===== 3. RIPPLE EFFECT ON TOUCH =====
  function createRipple(event) {
    const button = event.currentTarget;
    
    // Don't add ripple if disabled
    if (button.disabled) return;

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.touches ? event.touches[0].clientX - rect.left - size / 2 : event.clientX - rect.left - size / 2;
    const y = event.touches ? event.touches[0].clientY - rect.top - size / 2 : event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');

    // Remove existing ripples
    const existingRipple = button.querySelector('.ripple-effect');
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Add CSS for ripple effect
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `
    .ripple-container {
      position: relative;
      overflow: hidden;
    }
    .ripple-effect {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out;
      pointer-events: none;
    }
    @keyframes ripple-animation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(rippleStyle);

  // Apply ripple to buttons
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('button:not(.no-ripple), .btn:not(.no-ripple)').forEach(button => {
      button.classList.add('ripple-container');
      button.addEventListener('touchstart', createRipple, { passive: true });
    });
  });

  // ===== 4. SMOOTH SCROLL IMPROVEMENTS =====
  document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling to all scrollable containers
    document.querySelectorAll('.tab-content, .modal-content, .library-books, .forum-posts').forEach(container => {
      container.style.webkitOverflowScrolling = 'touch';
      container.style.scrollBehavior = 'smooth';
    });
  });

  // ===== 5. PREVENT MODAL BACKGROUND SCROLL =====
  function preventBackgroundScroll(modalElement) {
    const phoneContainer = document.querySelector('.phone-container');
    const body = document.body;
    
    // When modal opens
    if (modalElement && modalElement.classList.contains('active')) {
      body.classList.add('modal-open');
      if (phoneContainer) {
        phoneContainer.style.overflow = 'hidden';
      }
    }
    // When modal closes
    else {
      body.classList.remove('modal-open');
      if (phoneContainer) {
        phoneContainer.style.overflow = '';
      }
    }
  }

  // Watch for modal changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const modal = mutation.target;
        if (modal.classList.contains('modal')) {
          preventBackgroundScroll(modal);
        }
      }
    });
  });

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal').forEach(modal => {
      observer.observe(modal, { attributes: true });
    });
  });

  // ===== 6. IMPROVE FORM INPUT FOCUS =====
  document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Scroll input into view on focus
      input.addEventListener('focus', function() {
        setTimeout(() => {
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay for keyboard animation
      });

      // Add active class for better styling
      input.addEventListener('focus', function() {
        this.classList.add('input-focused');
      });

      input.addEventListener('blur', function() {
        this.classList.remove('input-focused');
      });
    });
  });

  // ===== 7. FAST CLICK IMPLEMENTATION =====
  // Removes 300ms delay on older iOS devices
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const xDiff = Math.abs(touchEndX - touchStartX);
      const yDiff = Math.abs(touchEndY - touchStartY);
      const timeDiff = touchEndTime - touchStartTime;
      
      // If it's a tap (not a swipe) and quick
      if (xDiff < 10 && yDiff < 10 && timeDiff < 200) {
        const target = e.target;
        if (target.tagName === 'BUTTON' || 
            target.classList.contains('btn') ||
            target.closest('button') ||
            target.closest('.btn')) {
          // Fast tap detected - no need to wait for click event
          triggerHaptic('light');
        }
      }
    }
  }, { passive: true });

  // ===== 8. ACTIVE STATE MANAGEMENT =====
  document.addEventListener('DOMContentLoaded', function() {
    const interactiveElements = document.querySelectorAll('button, .btn, .tab-item, .card, a[role="button"]');
    
    interactiveElements.forEach(element => {
      element.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
      }, { passive: true });

      element.addEventListener('touchend', function() {
        this.classList.remove('touch-active');
      }, { passive: true });

      element.addEventListener('touchcancel', function() {
        this.classList.remove('touch-active');
      }, { passive: true });
    });
  });

  // Add CSS for active states
  const activeStyle = document.createElement('style');
  activeStyle.textContent = `
    .touch-active {
      opacity: 0.8;
      transform: scale(0.98);
    }
    .input-focused {
      border-color: #FF4D8F !important;
      box-shadow: 0 0 0 3px rgba(255, 77, 143, 0.1) !important;
    }
  `;
  document.head.appendChild(activeStyle);

  // ===== 9. PULL-TO-REFRESH DETECTION (Optional) =====
  let pullStartY = 0;
  let isPulling = false;

  document.addEventListener('touchstart', function(e) {
    const tabContent = e.target.closest('.tab-content');
    if (tabContent && tabContent.scrollTop === 0) {
      pullStartY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (isPulling) {
      const pullDistance = e.touches[0].clientY - pullStartY;
      if (pullDistance > 80) {
        // Trigger refresh (you can implement actual refresh logic)
        console.log('Pull to refresh triggered');
        isPulling = false;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', function() {
    isPulling = false;
  }, { passive: true });

  // ===== 10. ORIENTATION CHANGE HANDLER =====
  window.addEventListener('orientationchange', function() {
    // Recalculate viewport height
    setTimeout(() => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, 100);
  });

  // Initial viewport height calculation
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  // ===== 11. CONSOLE LOG FOR DEBUGGING =====
  console.log('🎯 Mobile touch enhancements loaded');
  console.log('📱 Viewport height:', window.innerHeight);
  console.log('🔧 Touch support:', 'ontouchstart' in window);
  console.log('📳 Vibration support:', 'vibrate' in navigator);

})();
