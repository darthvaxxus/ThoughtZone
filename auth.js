const CDN = "https://www.gstatic.com/firebasejs/" +
  "12.19.0/";
const appMod = await import(CDN + "firebase-app.js");
const authMod = await import(CDN + "firebase-auth.js");

const { initializeApp } = appMod;
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} = authMod;

const firebaseConfig = {
  apiKey: "AIzaSyBqge0rMlZpo4iPW5kPzv1wOdZxuVYLals",
  authDomain: "thoughtzone-tk.firebaseapp.com",
  projectId: "thoughtzone-tk",
  storageBucket: "thoughtzone-tk.firebasestorage.app",
  messagingSenderId: "285134975338",
  appId: "1:285134975338:web:db5f6e0c3644481bad7513",
  measurementId: "G-LT2PLWKT0E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let mode = "login";

const $ = function (id) {
  return document.getElementById(id);
};

const authTitle = $("auth-title");
const authForm = $("auth-form");
const authEmail = $("auth-email");
const authPass = $("auth-pass");
const lblPass = $("lbl-pass");
const btnSubmit = $("btn-submit");
const btnToggle = $("btn-toggle");
const btnForgot = $("btn-forgot");
const authMsg = $("auth-msg");

function setMsg(text, isErr) {
  authMsg.textContent = text || "";
  authMsg.className = isErr ? "msg err" : "msg";
}

function friendlyError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/invalid-credential":
      "Wrong email or password.",
    "auth/invalid-email":
      "That email address looks invalid.",
    "auth/email-already-in-use":
      "That email already has an account.",
    "auth/weak-password":
      "Use a password of 6 or more characters.",
    "auth/user-not-found":
      "No account found with this email.",
    "auth/too-many-requests":
      "Too many attempts. Try again later."
  };
  return map[code] || (err && err.message) ||
    "Something went wrong.";
}

function updateMode(newMode) {
  mode = newMode;
  setMsg("");
  if (mode === "login") {
    authTitle.textContent = "Log In";
    btnSubmit.textContent = "Log In";
    btnToggle.textContent = "Need an account? Sign Up";
    lblPass.style.display = "block";
    authPass.style.display = "block";
    authPass.required = true;
    btnForgot.style.display = "inline-block";
  } else if (mode === "signup") {
    authTitle.textContent = "Sign Up";
    btnSubmit.textContent = "Create Account";
    btnToggle.textContent = "Have an account? Log In";
    lblPass.style.display = "block";
    authPass.style.display = "block";
    authPass.required = true;
    btnForgot.style.display = "none";
  } else if (mode === "reset") {
    authTitle.textContent = "Reset Password";
    btnSubmit.textContent = "Send Reset Link";
    btnToggle.textContent = "Back to Log In";
    lblPass.style.display = "none";
    authPass.style.display = "none";
    authPass.required = false;
    btnForgot.style.display = "none";
  }
}

btnToggle.addEventListener("click", function () {
  if (mode === "login") {
    updateMode("signup");
  } else {
    updateMode("login");
  }
});

btnForgot.addEventListener("click", function () {
  updateMode("reset");
});

authForm.addEventListener("submit", function (ev) {
  ev.preventDefault();
  setMsg("");
  const email = authEmail.value.trim();
  const pass = authPass.value;

  if (mode === "login") {
    signInWithEmailAndPassword(auth, email, pass)
      .then(function () {
        window.location.href = "index.html";
      })
      .catch(function (err) {
        setMsg(friendlyError(err), true);
      });
  } else if (mode === "signup") {
    createUserWithEmailAndPassword(auth, email, pass)
      .then(function (cred) {
        return sendEmailVerification(cred.user);
      })
      .then(function () {
        setMsg("Account created! Verification email sent.");
        setTimeout(function () {
          window.location.href = "index.html";
        }, 2000);
      })
      .catch(function (err) {
        setMsg(friendlyError(err), true);
      });
  } else if (mode === "reset") {
    if (!email) {
      setMsg("Please enter your email address.", true);
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(function () {
        setMsg("Password reset email sent! Check inbox.");
      })
      .catch(function (err) {
        setMsg(friendlyError(err), true);
      });
  }
});

onAuthStateChanged(auth, function (user) {
  if (user && mode !== "reset") {
    window.location.href = "index.html";
  }
});