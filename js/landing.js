// Landing page JavaScript with PHP API integration
class LandingPageManager {
  constructor() {
    this.currentPage = "landing"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupFormValidation()
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById("signUpBtn").addEventListener("click", () => {
      this.showPage("signup")
    })

    document.getElementById("logInBtn").addEventListener("click", () => {
      this.showPage("login")
    })

    document.getElementById("goToSignUp").addEventListener("click", (e) => {
      e.preventDefault()
      this.showPage("signup")
    })

    document.getElementById("goToLogin").addEventListener("click", (e) => {
      e.preventDefault()
      this.showPage("login")
    })

    // Back buttons
    document.getElementById("loginBackBtn").addEventListener("click", () => {
      this.showPage("landing")
    })

    document.getElementById("signUpBackBtn").addEventListener("click", () => {
      this.showPage("landing")
    })

    // Form submissions
    document.getElementById("loginForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    document.getElementById("signUpForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleSignUp()
    })
  }

  setupFormValidation() {
    // Real-time validation for signup form
    const dobMonth = document.getElementById("dobMonth")
    const dobDay = document.getElementById("dobDay")
    const dobYear = document.getElementById("dobYear")
    const birthdateHidden = document.getElementById("birthdate")
    ;[dobMonth, dobDay, dobYear].forEach((field) => {
      field.addEventListener("change", () => {
        this.updateBirthdate()
      })
    })

    // Password confirmation validation
    const password1 = document.getElementById("password1")
    const password2 = document.getElementById("password2")

    password2.addEventListener("input", () => {
      if (password1.value !== password2.value) {
        password2.setCustomValidity("Passwords do not match")
      } else {
        password2.setCustomValidity("")
      }
    })
  }

  updateBirthdate() {
    const month = document.getElementById("dobMonth").value
    const day = document.getElementById("dobDay").value
    const year = document.getElementById("dobYear").value

    if (month && day && year) {
      const birthdate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      document.getElementById("birthdate").value = birthdate
    }
  }

  showPage(page) {
    // Hide all pages
    document.getElementById("landingPage").classList.add("hidden")
    document.getElementById("loginPage").classList.add("hidden")
    document.getElementById("signUpPage").classList.add("hidden")

    // Show selected page
    switch (page) {
      case "landing":
        document.getElementById("landingPage").classList.remove("hidden")
        break
      case "login":
        document.getElementById("loginPage").classList.remove("hidden")
        break
      case "signup":
        document.getElementById("signUpPage").classList.remove("hidden")
        break
    }

    this.currentPage = page
  }

  async handleLogin() {
    const form = document.getElementById("loginForm")
    const formData = new FormData(form)

    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    }

    try {
      const response = await fetch("api/auth.php?action=login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      })

      let result = null
      try {
        result = await response.json()
      } catch (e) {
        // Response was not valid JSON (possibly a PHP error/500). Try to read plain text
        const text = (await response.text()).trim()
        // Show the server text as an error to help debugging (kept safe via textContent)
        this.showError(text || 'Registration failed. Server returned an unexpected response.')
        return
      }

      if (result && result.success) {
        // Store session info
        localStorage.setItem(
          "user_session",
          JSON.stringify({
            user_id: result.user.id,
            session_token: result.session_token,
            user_name: result.user.name,
          }),
        )

        // Redirect to main app
        window.location.href = "index.html"
      } else {
        // If the error references the email, highlight the email field for clarity
        const msg = (result.message || '').toString();
        if (/email/i.test(msg) && /used|already|registered|exists|in use/i.test(msg)) {
          this.showError(msg, 'email')
        } else {
          this.showError(msg)
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      this.showError("Login failed. Please try again.")
    }
  }

  async handleSignUp() {
    const form = document.getElementById("signUpForm")
    const formData = new FormData(form)

    // Validate passwords match
    const password1 = document.getElementById("password1").value
    const password2 = document.getElementById("password2").value

    if (password1 !== password2) {
      this.showError("Passwords do not match")
      return
    }

    // Update birthdate before submission
    this.updateBirthdate()

    const signUpData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: password1,
      birthdate: formData.get("birthdate"),
      sex: formData.get("sex"),
      address_line1: formData.get("address_line1"),
      address_line2: formData.get("address_line2"),
      barangay: formData.get("barangay"),
      city: formData.get("city"),
      zip_code: formData.get("zip_code"),
    }

    try {
      const response = await fetch("api/auth.php?action=signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signUpData),
      })

      const result = await response.json()

      if (result.success) {
        // Store session info
        localStorage.setItem(
          "user_session",
          JSON.stringify({
            user_id: result.user_id,
            session_token: result.session_token,
            user_name: signUpData.name,
          }),
        )

        // Redirect to main app
        window.location.href = "index.html"
      } else {
        this.showError(result.message)
      }
    } catch (error) {
      console.error("Signup error:", error)
      this.showError("Registration failed. Please try again.")
    }
  }

  showError(message, fieldName = null) {
    // Create or update error message
    let errorDiv = document.querySelector(".error-message")
    if (!errorDiv) {
      errorDiv = document.createElement("div")
      errorDiv.className = "error-message"
      errorDiv.style.cssText = `
                background: #ff4757;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
                text-align: center;
                font-size: 14px;
            `
    }

    errorDiv.textContent = message

    // Insert at the top of the current form
    const currentForm = document.querySelector(`#${this.currentPage}Page .auth-content`)
    if (currentForm) {
      currentForm.insertBefore(errorDiv, currentForm.firstChild)

      // If a field name was provided, try to highlight and focus it
      if (fieldName) {
        const input = currentForm.querySelector(`[name="${fieldName}"]`)
        if (input) {
          const origBorder = input.style.border
          input.style.border = '2px solid #ff4757'
          try { input.focus(); } catch (e) {}
          // Remove highlight after 5s
          setTimeout(() => { input.style.border = origBorder; }, 5000)
        }
      }

      // Remove error after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv)
        }
      }, 5000)
    }
  }
}

// Password toggle function
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId)
  const button = field.nextElementSibling

  if (field.type === "password") {
    field.type = "text"
    button.textContent = "🙈"
  } else {
    field.type = "password"
    button.textContent = "👁"
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LandingPageManager()
})
