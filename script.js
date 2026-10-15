/* The Production Feed - Firebase JS SDK 12.19.0 */

const CDN = "https://www.gstatic.com/firebasejs/" +
  "12.19.0/";
const appMod = await import(CDN + "firebase-app.js");
const authMod = await import(CDN + "firebase-auth.js");
const fsMod = await import(CDN + "firebase-firestore.js");

const { initializeApp } = appMod;
const {
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} = authMod;
const {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion
} = fsMod;

const ADMIN_EMAIL = "tharunkarthickdev@icloud.com";

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
const db = getFirestore(app);

let currentUser = null;
let isAdmin = false;
let postDocs = [];
let editingId = null;
let commentUnsubs = [];

const $ = function (id) {
  return document.getElementById(id);
};

const authOut = $("auth-out");
const authIn = $("auth-in");
const btnLogout = $("btn-logout");
const userLabel = $("user-label");
const userBadge = $("user-badge");
const verifyBar = $("verify-bar");
const btnResend = $("btn-resend");
const btnRefresh = $("btn-refresh");
const authMsg = $("auth-msg");
const authorPanel = $("author-panel");
const authorHeading = $("author-heading");
const authorForm = $("author-form");
const postTitle = $("post-title");
const postBody = $("post-body");
const btnPublish = $("btn-publish");
const btnCancel = $("btn-cancel");
const authorMsg = $("author-msg");
const feed = $("feed");

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) {
    node.className = cls;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function btn(label, cls, handler) {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", handler);
  return b;
}

function setMsg(node, text, isErr) {
  node.textContent = text || "";
  node.className = isErr ? "msg err" : "msg";
}

function friendlyError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/too-many-requests":
      "Too many attempts. Try again later.",
    "permission-denied":
      "You do not have permission to do that."
  };
  const key = code.replace("firestore/", "");
  return map[code] || map[key] ||
    (err && err.message) || "Something went wrong.";
}

function formatDate(ts) {
  if (!ts) {
    return "just now";
  }
  let d = null;
  if (typeof ts.toDate === "function") {
    d = ts.toDate();
  } else {
    d = new Date(ts);
  }
  return d.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function canComment() {
  return !!(currentUser && currentUser.emailVerified);
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const TRAIL_RE = /[.,;:!?)\]]+$/;

function linkify(text) {
  let out = "";
  let last = 0;
  let m = null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    let url = m[0];
    let trail = "";
    const t = url.match(TRAIL_RE);
    if (t) {
      trail = t[0];
      url = url.slice(0, url.length - trail.length);
    }
    out += esc(text.slice(last, m.index));
    out += '<a href="' + esc(url) + '"';
    out += ' target="_blank"';
    out += ' rel="noopener">';
    out += esc(url);
    out += "</a>";
    out += esc(trail);
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out;
}

btnLogout.addEventListener("click", function () {
  setMsg(authMsg, "");
  signOut(auth);
});

btnResend.addEventListener("click", function () {
  if (!currentUser) {
    return;
  }
  sendEmailVerification(currentUser)
    .then(function () {
      setMsg(authMsg, "Verification email sent.");
    })
    .catch(function (err) {
      setMsg(authMsg, friendlyError(err), true);
    });
});

btnRefresh.addEventListener("click", function () {
  if (!currentUser) {
    return;
  }
  currentUser.reload()
    .then(function () {
      return currentUser.getIdToken(true);
    })
    .then(function () {
      applyUser(auth.currentUser);
      if (canComment()) {
        setMsg(authMsg, "Email verified. Welcome!");
      } else {
        setMsg(
          authMsg,
          "Not verified yet. Check your inbox.",
          true
        );
      }
    })
    .catch(function (err) {
      setMsg(authMsg, friendlyError(err), true);
    });
});

function applyUser(user) {
  currentUser = user;
  const email = user && user.email
    ? user.email.toLowerCase()
    : "";
  isAdmin = !!(user && user.emailVerified &&
    email === ADMIN_EMAIL.toLowerCase());

  authOut.hidden = !!user;
  authIn.hidden = !user;
  verifyBar.hidden = !(user && !user.emailVerified);
  authorPanel.hidden = !isAdmin;

  if (user) {
    userLabel.textContent = user.email;
    if (isAdmin) {
      userBadge.textContent = "Admin";
      userBadge.className = "badge admin";
    } else if (user.emailVerified) {
      userBadge.textContent = "Verified";
      userBadge.className = "badge ok";
    } else {
      userBadge.textContent = "Unverified";
      userBadge.className = "badge warn";
    }
  }
  if (!isAdmin) {
    resetAuthorForm();
  }
  renderFeed();
}

onAuthStateChanged(auth, function (user) {
  applyUser(user);
});

function resetAuthorForm() {
  editingId = null;
  authorForm.reset();
  authorHeading.textContent = "Author Entry";
  btnPublish.textContent = "Publish post";
  btnCancel.hidden = true;
}

btnCancel.addEventListener("click", function () {
  resetAuthorForm();
  setMsg(authorMsg, "");
});

authorForm.addEventListener("submit", function (ev) {
  ev.preventDefault();
  if (!isAdmin) {
    return;
  }
  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!title || !body) {
    setMsg(authorMsg, "Title and body required.", true);
    return;
  }
  btnPublish.disabled = true;
  let job = null;
  if (editingId) {
    job = updateDoc(doc(db, "posts", editingId), {
      title: title,
      body: body,
      updatedAt: serverTimestamp()
    });
  } else {
    job = addDoc(collection(db, "posts"), {
      title: title,
      body: body,
      authorEmail: ADMIN_EMAIL,
      createdAt: serverTimestamp()
    });
  }
  job
    .then(function () {
      setMsg(authorMsg, "Saved.");
      resetAuthorForm();
    })
    .catch(function (err) {
      setMsg(authorMsg, friendlyError(err), true);
    })
    .then(function () {
      btnPublish.disabled = false;
    });
});

function startEdit(id, data) {
  editingId = id;
  postTitle.value = data.title || "";
  postBody.value = data.body || "";
  authorHeading.textContent = "Edit post";
  btnPublish.textContent = "Save changes";
  btnCancel.hidden = false;
  setMsg(authorMsg, "");
  authorPanel.scrollIntoView({ behavior: "smooth" });
  postTitle.focus();
}

function removePost(id) {
  if (!isAdmin) {
    return;
  }
  if (!window.confirm("Delete this post and comments?")) {
    return;
  }
  const cRef = collection(db, "posts", id, "comments");
  getDocs(cRef)
    .then(function (snap) {
      return Promise.all(
        snap.docs.map(function (d) {
          return deleteDoc(d.ref);
        })
      );
    })
    .then(function () {
      return deleteDoc(doc(db, "posts", id));
    })
    .catch(function (err) {
      window.alert(friendlyError(err));
    });
}

function clearCommentListeners() {
  commentUnsubs.forEach(function (stop) {
    stop();
  });
  commentUnsubs = [];
}

function renderFeed() {
  clearCommentListeners();
  feed.textContent = "";
  if (postDocs.length === 0) {
    feed.appendChild(
      el("p", "empty", "No posts yet. Check back soon.")
    );
    return;
  }
  postDocs.forEach(function (d) {
    feed.appendChild(buildPost(d.id, d.data()));
  });
}

function buildPost(id, data) {
  const art = el("article", "post");
  art.appendChild(el("h2", "post-title", data.title));

  let meta = "Posted " + formatDate(data.createdAt);
  if (data.updatedAt) {
    meta += " (edited " + formatDate(data.updatedAt) + ")";
  }
  art.appendChild(el("p", "post-meta", meta));

  const body = el("div", "post-body");
  body.innerHTML = linkify(data.body || "");
  art.appendChild(body);

  if (isAdmin) {
    const tools = el("div", "admin-tools");
    tools.appendChild(
      btn("Edit", "ghost", function () {
        startEdit(id, data);
      })
    );
    tools.appendChild(
      btn("Delete", "danger", function () {
        removePost(id);
      })
    );
    art.appendChild(tools);
  }

  art.appendChild(buildCommentsSection(id));
  return art;
}

function buildCommentsSection(postId) {
  const sec = el("section", "comments");
  const heading = el("h3", "", "Comments");
  const list = el("div", "comment-list");
  sec.appendChild(heading);
  sec.appendChild(list);
  sec.appendChild(buildCommentGate(postId));

  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );
  const stop = onSnapshot(
    q,
    function (snap) {
      heading.textContent = "Comments (" + snap.size + ")";
      list.textContent = "";
      snap.docs.forEach(function (d) {
        list.appendChild(
          buildComment(postId, d.id, d.data())
        );
      });
    },
    function (err) {
      list.textContent = friendlyError(err);
    }
  );
  commentUnsubs.push(stop);
  return sec;
}

function buildCommentGate(postId) {
  if (!currentUser) {
    const lockBox = el("p", "lock-note");
    lockBox.appendChild(
      document.createTextNode("Want to join the conversation? ")
    );
    const link = el("a", "", "Log in or sign up here.");
    link.href = "auth.html";
    lockBox.appendChild(link);
    return lockBox;
  }
  if (!currentUser.emailVerified) {
    return el(
      "p",
      "lock-note",
      "Verify your email address to unlock commenting."
    );
  }
  return buildCommentForm(postId);
}

function buildCommentForm(postId) {
  const wrap = el("div", "comment-form");
  const box = el("textarea");
  box.rows = 3;
  box.maxLength = 2000;
  box.placeholder = "Write a comment";
  const send = btn("Post comment", "", function () {
    const text = box.value.trim();
    if (!text || !canComment()) {
      return;
    }
    send.disabled = true;
    addDoc(collection(db, "posts", postId, "comments"), {
      text: text,
      authorEmail: currentUser.email,
      authorUid: currentUser.uid,
      createdAt: serverTimestamp()
    })
      .then(function () {
        box.value = "";
      })
      .catch(function (err) {
        window.alert(friendlyError(err));
      })
      .then(function () {
        send.disabled = false;
      });
  });
  wrap.appendChild(box);
  wrap.appendChild(send);
  return wrap;
}

function buildComment(postId, cid, data) {
  const item = el("div", "comment");
  const head = el("div", "comment-head");
  const who = el("strong", "", data.authorEmail || "user");
  head.appendChild(who);
  head.appendChild(
    document.createTextNode(
      "  " + formatDate(data.createdAt)
    )
  );
  item.appendChild(head);

  const text = el("p", "comment-text");
  text.innerHTML = linkify(data.text || "");
  item.appendChild(text);

  const replies = data.replies || [];
  replies.forEach(function (r) {
    const box = el("div", "reply");
    const tag = el("strong", "", "Admin reply: ");
    box.appendChild(tag);
    box.appendChild(
      document.createTextNode(r.text || "")
    );
    item.appendChild(box);
  });

  if (isAdmin) {
    item.appendChild(
      buildCommentTools(postId, cid, item)
    );
  }
  return item;
}

function buildCommentTools(postId, cid, item) {
  const bar = el("div", "comment-actions");
  const cRef = doc(db, "posts", postId, "comments", cid);
  let form = null;

  const replyBtn = btn("Reply", "link-btn", function () {
    if (form) {
      form.remove();
      form = null;
      return;
    }
    form = buildReplyForm(cRef);
    item.appendChild(form);
    form.querySelector("input").focus();
  });

  const delBtn = btn("Delete", "link-btn danger", function () {
    if (!window.confirm("Delete this comment?")) {
      return;
    }
    deleteDoc(cRef).catch(function (err) {
      window.alert(friendlyError(err));
    });
  });

  bar.appendChild(replyBtn);
  bar.appendChild(delBtn);
  return bar;
}

function buildReplyForm(cRef) {
  const form = el("form", "reply-form");
  const input = el("input");
  input.type = "text";
  input.maxLength = 1000;
  input.placeholder = "Write an admin reply";
  input.required = true;
  const send = el("button", "", "Send");
  send.type = "submit";
  form.appendChild(input);
  form.appendChild(send);

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text || !isAdmin) {
      return;
    }
    send.disabled = true;
    updateDoc(cRef, {
      replies: arrayUnion({
        text: text,
        by: ADMIN_EMAIL,
        createdAt: Date.now()
      })
    })
      .catch(function (err) {
        window.alert(friendlyError(err));
        send.disabled = false;
      });
  });
  return form;
}

const postsQuery = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc")
);

onSnapshot(
  postsQuery,
  function (snap) {
    postDocs = snap.docs;
    renderFeed();
  },
  function (err) {
    feed.textContent = "";
    feed.appendChild(
      el("p", "empty", friendlyError(err))
    );
  }
);
