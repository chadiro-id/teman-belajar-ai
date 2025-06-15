// == Firebase Modular Imports ==
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// == Firebase Config ==
const firebaseConfig = {
  apiKey: "AIzaSyAp50SILueBPUAZjkhDZi_WwWyoodW2Q-k",
  authDomain: "temanbelajarai-1eaa5.firebaseapp.com",
  projectId: "temanbelajarai-1eaa5"
};

// == Initialize Firebase ==
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId = null;

// == Generate guest ID if not signed in ==
function getOrCreateGuestId() {
  let guestId = localStorage.getItem("guest_id");
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("guest_id", guestId);
  }
  return guestId;
}

// == HTML Element References ==
const subjectSelect = document.getElementById("subject");
const chatContainer = document.getElementById("chat-container");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message");
const newChatBtn = document.getElementById("new-chat-btn");
const currentUserLabel = document.getElementById("current-user");
const conversationList = document.getElementById("conversation-list");

// == Local State ==
let fullHistory = {}; // { subject: [ { role, message } ] }
let currentSubject = subjectSelect.value;

// == Markdown Renderer ==
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

// == Render Chat UI ==
function renderChat() {
  const history = fullHistory[currentSubject] || [];
  const chatList = document.createElement("ul");
  chatList.className = "chat-list";
  chatContainer.innerHTML = "";
  chatContainer.appendChild(chatList);

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = `chat-bubble ${entry.role}`;
    if (entry.role === "assistant") {
      li.innerHTML = renderMarkdown(entry.message);
    } else {
      li.textContent = entry.message;
    }
    chatList.appendChild(li);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// == Add Message to Local ==
function addMessage(role, message) {
  if (!fullHistory[currentSubject]) fullHistory[currentSubject] = [];
  fullHistory[currentSubject].push({ role, message });
  saveToLocalStorage();
  renderChat();
}

// == Save All Chat History to localStorage ==
function saveToLocalStorage() {
  localStorage.setItem("chat_history", JSON.stringify(fullHistory));
}

// == Load from localStorage ==
function loadLocalHistory() {
  const raw = localStorage.getItem("chat_history");
  if (raw) {
    fullHistory = JSON.parse(raw);
  }
}

async function loadSubjects() {
  const subjectSelect = document.getElementById("subject");
  subjectSelect.innerHTML = ""; // kosongkan dulu

  try {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const opt = document.createElement("option");
      opt.value = data.name.toLowerCase();
      opt.textContent = data.name;
      subjectSelect.appendChild(opt);
    });

    // Set subject awal
    currentSubject = subjectSelect.value;
    document.getElementById("current-subject").textContent = currentSubject;
    renderChat();

  } catch (e) {
    console.error("❌ Gagal load subjek dari Firestore:", e);
  }
}

async function loadConversations() {
  if (!userId) return;

  conversationList.innerHTML = "";

  try {
    const q = query(
      collection(db, "conversations"),
      where("user_id", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.classList.add("conversation-item");
      const label = document.createElement("span");
      label.textContent = `${data.subject} - ${doc.id.slice(0, 5)}...`;
      label.className = "clickable-label";
      label.addEventListener("click", () => {
        currentSubject = data.subject;
        fullHistory[currentSubject] = data.chat_history;
        subjectSelect.value = currentSubject;
        document.getElementById("current-subject").textContent = currentSubject;
        renderChat();
      });
      
      const renameBtn = document.createElement("button");
      renameBtn.textContent = "✏️";
      renameBtn.title = "Rename";
      renameBtn.addEventListener("click", () => renameConversation(doc.id));
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete";
      deleteBtn.addEventListener("click", () => deleteConversation(doc.id));
      li.append(label, renameBtn, deleteBtn);

      li.addEventListener("click", () => {
        currentSubject = data.subject;
        fullHistory[currentSubject] = data.chat_history;
        subjectSelect.value = currentSubject;
        document.getElementById("current-subject").textContent = currentSubject;
        renderChat();
      });
      conversationList.appendChild(li);
    });
  } catch (err) {
    console.error("❌ Gagal load conversations:", err);
  }
}

async function renameConversation(convoId) {
  const newSubject = prompt("Ganti nama subjek untuk percakapan ini:");
  if (!newSubject) return;

  try {
    await updateDoc(doc(db, "conversations", convoId), {
      subject: newSubject.toLowerCase(),
      updated_at: serverTimestamp()
    });
    alert("✅ Berhasil di-rename!");
    loadConversations();
  } catch (err) {
    console.error("❌ Gagal rename:", err);
    alert("Gagal rename percakapan.");
  }
}

async function deleteConversation(convoId) {
  const confirmDelete = confirm("Yakin ingin menghapus percakapan ini?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "conversations", convoId));
    alert("🗑️ Percakapan dihapus.");
    loadConversations();
  } catch (err) {
    console.error("❌ Gagal hapus:", err);
    alert("Gagal menghapus percakapan.");
  }
}

// == Send Message Handler ==
sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  messageInput.value = "";

  try {
    const res = await fetch("https://YOUR_BACKEND_URL/api/chat_with_ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        subject: currentSubject,
        chat_history: fullHistory[currentSubject]
      })
    });

    const data = await res.json();

    if (res.ok) {
      addMessage("assistant", data.response);
      await saveConversationToFirestore();
    } else {
      addMessage("assistant", `⚠️ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    addMessage("assistant", "⚠️ Gagal menghubungi server.");
  }
});

// == Save to Firestore ==
async function saveConversationToFirestore() {
  if (!userId) return;

  try {
    await addDoc(collection(db, "conversations"), {
      user_id: userId,
      subject: currentSubject,
      chat_history: fullHistory[currentSubject],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  } catch (e) {
    console.error("❌ Gagal simpan Firestore:", e);
  }
}

// == UI Interactions ==
subjectSelect.addEventListener("change", () => {
  currentSubject = subjectSelect.value;
  document.getElementById("current-subject").textContent = currentSubject;
  renderChat();
});

newChatBtn.addEventListener("click", () => {
  fullHistory[currentSubject] = [];
  saveToLocalStorage();
  renderChat();
});

// == Auth Logic ==
signInAnonymously(auth).catch(console.error);

onAuthStateChanged(auth, (user) => {
  userId = user ? user.uid : getOrCreateGuestId();
  currentUserLabel.textContent = user ? `User: ${user.uid.slice(0, 6)}...` : `Guest: ${userId.slice(0, 6)}...`;
  loadConversations();
});

// == Start ==
loadSubjects()
loadLocalHistory();
renderChat();
