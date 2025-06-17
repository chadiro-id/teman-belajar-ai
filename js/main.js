// Import Firebase instances from window (exposed by index.html)
const app = window.firebaseApp;
const auth = window.firebaseAuth;
const db = window.firebaseDb;
const googleProvider = window.googleAuthProvider;
const serverTimestamp = window.firebaseServerTimestamp;
const getDoc = window.firebaseGetDoc;
const doc = window.firebaseDoc;
const updateDoc = window.firebaseUpdateDoc;
const deleteDoc = window.firebaseDeleteDoc;
const query = window.firebaseQuery;
const where = window.firebaseWhere;
const orderBy = window.firebaseOrderBy;
const getDocs = window.firebaseGetDocs;
const collection = window.firebaseCollection;
const addDoc = window.firebaseAddDoc;
const signInAnonymously = window.firebaseSignInAnonymously;
const onAuthStateChanged = window.firebaseOnAuthStateChanged;
const signInWithPopup = window.firebaseSignInWithPopup;
const signOut = window.firebaseSignOut;
const linkWithPopup = window.firebaseLinkWithPopup;


// == DOM Elements ==
const currentUserAvatarEl = document.getElementById("current-user-avatar");
const currentUserLabelEl = document.getElementById("current-user-label");
const subjectSelect = document.getElementById("subject");
const chatContainer = document.getElementById("chat-container");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const newChatBtn = document.getElementById("new-chat-btn");
const conversationList = document.getElementById("conversation-list");
const subjectTitleEl = document.getElementById("subject-title");
const currentSubjectEl = document.getElementById("current-subject");

// Modal elements
const linkAccountModal = document.getElementById("link-account-modal");
const modalLinkAccountBtn = document.getElementById("modal-link-account");
const modalStartNewBtn = document.getElementById("modal-start-new");

// == Global State ==
let currentUserId = null;
let activeConversation = null; // Object of the currently viewed conversation from Firestore
let allConversations = {}; // Stores metadata of all conversations (key: convoId, value: convoObject without history)
let availableSubjects = []; // Stores subjects fetched from Firestore

// == Helper Functions ==

// Function to render Markdown (if you have one, otherwise just return text)
function renderMarkdown(markdownText) {
  // Implement a markdown renderer library (e.g., marked.js) if needed.
  // For now, a basic placeholder.
  return markdownText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
}

// Update UI based on activeConversation
function renderChat() {
  chatContainer.innerHTML = "";
  const chatListElement = document.createElement("ul");
  chatListElement.className = "chat-list";
  chatContainer.appendChild(chatListElement);

  const historyToRender = activeConversation ? activeConversation.history : [];

  historyToRender.forEach((entry) => {
    const li = document.createElement("li");
    li.className = `chat-bubble ${entry.role}`;
    if (entry.role === "assistant") {
      li.innerHTML = renderMarkdown(entry.content); // Use .content
    } else {
      li.textContent = entry.content; // Use .content
    }
    chatListElement.appendChild(li);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add message to activeConversation's local history (not yet saved to Firestore)
function addMessageToActiveChat(role, content) {
  if (!activeConversation) {
    console.error("No active conversation to add message to.");
    return;
  }
  activeConversation.history.push({ role, content, timestamp: Date.now() }); // Use .content
  renderChat();
}

// Update UI for list of conversations in sidebar
function updateConversationListUI() {
  conversationList.innerHTML = "";
  const conversationsArray = Object.values(allConversations);

  conversationsArray
    .sort((a, b) => b.updated_at - a.updated_at) // Sort by most recent update
    .forEach((convo) => {
      const li = document.createElement("li");
      li.classList.add("conversation-item");
      if (activeConversation && activeConversation.id === convo.id) {
        li.classList.add("active");
      }

      const label = document.createElement("span");
      label.textContent = `${convo.subject} - ${new Date(convo.updated_at).toLocaleTimeString()}`;
      label.className = "clickable-label";
      label.addEventListener("click", () => selectConversation(convo.id));

      const renameBtn = document.createElement("button");
      renameBtn.textContent = "✏️";
      renameBtn.title = "Rename";
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        renameConversation(convo.id);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(convo.id);
      });

      li.append(label, renameBtn, deleteBtn);
      conversationList.appendChild(li);
    });
}

// == Core Chat & Conversation Management ==

// Starts a new chat session (locally)
async function startNewChat() {
  activeConversation = {
    id: `temp-${Date.now()}`, // Temporary ID for a new, unsaved conversation
    user_id: currentUserId,
    subject: subjectSelect.value,
    history: [],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  // Add to allConversations temporarily so it shows in the list
  allConversations[activeConversation.id] = activeConversation;

  subjectTitleEl.textContent = `Subjek: ${activeConversation.subject}`;
  currentSubjectEl.textContent = activeConversation.subject;
  renderChat();
  updateConversationListUI();
}

// Selects an existing conversation and loads its messages
async function selectConversation(conversationId) {
  if (!allConversations[conversationId]) {
    console.error("Conversation not found:", conversationId);
    return;
  }

  activeConversation = { ...allConversations[conversationId] }; // Copy metadata
  activeConversation.history = []; // Initialize history to load messages

  subjectSelect.value = activeConversation.subject; // Update dropdown
  subjectTitleEl.textContent = `Subjek: ${activeConversation.subject}`;
  currentSubjectEl.textContent = activeConversation.subject;

  // Load messages from subcollection
  try {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc")
    );
    const messageSnapshot = await getDocs(messagesQuery);
    messageSnapshot.forEach((msgDoc) => {
      const msgData = msgDoc.data();
      activeConversation.history.push({
        role: msgData.role,
        content: msgData.content, // Use .content
        timestamp: msgData.timestamp ? msgData.timestamp.toMillis() : 0
      });
    });
    renderChat();
    updateConversationListUI(); // Update active class
    console.log(`✅ Percakapan '${activeConversation.subject}' dimuat.`);
  } catch (e) {
    console.error("❌ Gagal memuat pesan percakapan:", e);
  }
}

// Saves/updates the current activeConversation to Firestore
async function saveConversationToFirestore() {
  if (!activeConversation || !currentUserId) return;

  try {
    let conversationRef;
    if (activeConversation.id.startsWith("temp-")) {
      // This is a new conversation (first message sent)
      const newDocRef = await addDoc(collection(db, "conversations"), {
        user_id: currentUserId,
        subject: activeConversation.subject,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      activeConversation.id = newDocRef.id; // Update temp ID to actual Firestore ID
      conversationRef = newDocRef;

      // Now add all messages from local history to the new subcollection
      for (const msg of activeConversation.history) {
        await addDoc(collection(db, "conversations", activeConversation.id, "messages"), {
          role: msg.role,
          content: msg.content, // Use .content
          timestamp: serverTimestamp()
        });
      }
      console.log("✅ Percakapan baru berhasil dibuat di Firestore:", activeConversation.id);

    } else {
      // Existing conversation: update metadata and add only the new messages
      conversationRef = doc(db, "conversations", activeConversation.id);
      await updateDoc(conversationRef, {
        updated_at: serverTimestamp()
      });

      // Add only the very last message(s) to the subcollection
      // (assuming activeConversation.history has new messages since last save)
      const lastSentMessages = activeConversation.history.slice(-2); // User message + AI response
      for (const msg of lastSentMessages) {
        if (msg.timestamp > (activeConversation.lastSavedTimestamp || 0)) { // Only save new ones
          await addDoc(collection(db, "conversations", activeConversation.id, "messages"), {
            role: msg.role,
            content: msg.content, // Use .content
            timestamp: serverTimestamp()
          });
        }
      }
      console.log("✅ Percakapan berhasil diperbarui di Firestore:", activeConversation.id);
    }

    // Update allConversations and UI after successful save
    allConversations[activeConversation.id] = {
      id: activeConversation.id,
      user_id: activeConversation.user_id,
      subject: activeConversation.subject,
      created_at: activeConversation.created_at, // Keep original creation time
      updated_at: Date.now() // Use local timestamp for sorting UI immediately
    };
    activeConversation.lastSavedTimestamp = Date.now(); // Mark last saved time for partial updates
    updateConversationListUI();

  } catch (e) {
    console.error("❌ Gagal simpan/perbarui Firestore:", e);
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
    // loadConversations();
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
    // loadConversations();
  } catch (err) {
    console.error("❌ Gagal hapus:", err);
    alert("Gagal menghapus percakapan.");
  }
}

// == Authentication & User Management ==

// Handles UI updates for user status
function updateAuthUI(user) {
  if (user) {
    currentUserId = user.uid;
    if (user.isAnonymous) {
      currentUserAvatarEl.innerHTML = `<img src="https://api.dicebear.com/7.x/icons/svg?seed=${user.uid}" alt="Guest" class="avatar" title="Klik untuk login" />`;
      currentUserLabelEl.textContent = "Tamu";
    } else {
      const photo = user.photoURL || `https://api.dicebear.com/7.x/icons/svg?seed=${user.uid}`;
      currentUserAvatarEl.innerHTML = `<img src="${photo}" alt="User" class="avatar" title="Klik untuk logout" />`;
      currentUserLabelEl.textContent = user.displayName || user.email || "Pengguna";
    }
  } else {
    // Should not happen if signInAnonymously is called on app load
    currentUserAvatarEl.innerHTML = `<img src="https://api.dicebear.com/7.x/icons/svg?seed=fallback" alt="Guest" class="avatar" />`;
    currentUserLabelEl.textContent = "Offline";
  }
}

// Main Auth State Listener
onAuthStateChanged(auth, async (user) => {
  updateAuthUI(user);

  if (user) {
    currentUserId = user.uid;

    if (user.isAnonymous) {
      // User is anonymous, load from Firestore if any anonymous data exists
      // (this assumes you might have saved anonymous data directly to Firestore before,
      // or if using cloud functions to process anon data)
      // For now, we will simply start a new clean chat if no prior session selected
      if (!activeConversation || activeConversation.user_id !== currentUserId) {
        startNewChat();
      }
    } else {
      // User is authenticated (Google)
      await loadConversationsForAuthenticatedUser();
    }
  } else {
    // No user signed in (e.g., after logout). Sign in anonymously.
    try {
      const anonUserCredential = await signInAnonymously(auth);
      currentUserId = anonUserCredential.user.uid;
      updateAuthUI(anonUserCredential.user);
      startNewChat(); // Start a fresh chat for the new anonymous session
    } catch (error) {
      console.error("Failed to sign in anonymously:", error);
      alert("Failed to start session. Please check your connection.");
    }
  }
});

// Load conversations for authenticated user from Firestore
async function loadConversationsForAuthenticatedUser() {
  if (!currentUserId) return;

  allConversations = {}; // Clear previous conversations
  conversationList.innerHTML = ""; // Clear UI

  try {
    const q = query(
      collection(db, "conversations"),
      where("user_id", "==", currentUserId),
      orderBy("updated_at", "desc")
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      allConversations[docSnap.id] = {
        id: docSnap.id,
        user_id: data.user_id,
        subject: data.subject,
        created_at: data.created_at ? data.created_at.toMillis() : 0,
        updated_at: data.updated_at ? data.updated_at.toMillis() : 0,
        history: [] // History will be loaded on demand when selected
      };
    });

    if (Object.keys(allConversations).length > 0) {
      // Select the most recently updated conversation
      const latestConvoId = Object.keys(allConversations).reduce((a, b) => {
        return allConversations[a].updated_at > allConversations[b].updated_at ? a : b;
      }, Object.keys(allConversations)[0]);
      await selectConversation(latestConvoId);
    } else {
      startNewChat(); // If no conversations, start a new one
    }
    updateConversationListUI(); // Update UI with loaded conversations

  } catch (err) {
    console.error("❌ Gagal memuat percakapan untuk pengguna terautentikasi:", err);
  }
}

// Handles user avatar click for login/logout/linking
currentUserAvatarEl.addEventListener("click", async () => {
  if (auth.currentUser) {
    if (auth.currentUser.isAnonymous) {
      // Anonymous user wants to login with Google
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user; // New authenticated user

        // Check if there's an existing anonymous session's data
        // For current model, anonymous data is already in Firestore
        // This is where you'd prompt to link or start fresh if the anonymous user
        // had specific unsaved data you wanted to explicitly link.
        // Given we directly save to Firestore, the data is linked by UID if upgraded correctly.

        // Firebase Auth automatically attempts to link if the anonymous user signs in.
        // If not linked (e.g., Google user already exists), a modal to link will appear.
        if (result.operationType === 'link' || result.operationType === 'signIn') {
            alert(`Selamat datang, ${user.displayName || user.email}! Akun Anda berhasil ditautkan/login.`);
            // onAuthStateChanged will handle loading conversations
        }
        
      } catch (error) {
        console.error("Google login failed:", error);
        // Handle specific errors like 'auth/credential-already-in-use' if needed
        if (error.code === 'auth/credential-already-in-use') {
            // This means the Google account is already linked to another Firebase account.
            // You might offer to sign in with the existing Google account instead.
            alert("Akun Google ini sudah terhubung dengan akun lain.");
            // Further logic for re-authentication or asking user to sign in with existing Google account
            // For hackathon, just alerting is fine.
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log("Login popup closed by user.");
        } else {
            alert("Login Google gagal: " + error.message);
        }
      }
    } else {
      // Authenticated user wants to logout
      if (confirm("Yakin ingin keluar dari akun Anda?")) {
        try {
          await signOut(auth);
          alert("Anda telah logout. Sekarang Anda adalah tamu.");
          // onAuthStateChanged will handle signing in anonymously again and starting a new chat
        } catch (error) {
          console.error("Logout failed:", error);
          alert("Gagal logout: " + error.message);
        }
      }
    }
  }
});

// == Event Listeners ==
subjectSelect.addEventListener("change", () => {
  if (activeConversation) {
    activeConversation.subject = subjectSelect.value;
    subjectTitleEl.textContent = `Subjek: ${activeConversation.subject}`;
    currentSubjectEl.textContent = activeConversation.subject;
    // For existing conversations, update subject in Firestore
    if (!activeConversation.id.startsWith("temp-")) {
        updateDoc(doc(db, "conversations", activeConversation.id), {
            subject: activeConversation.subject,
            updated_at: serverTimestamp()
        }).then(() => {
            console.log("Subject updated in Firestore.");
            // Update the entry in allConversations as well
            if (allConversations[activeConversation.id]) {
                allConversations[activeConversation.id].subject = activeConversation.subject;
                allConversations[activeConversation.id].updated_at = Date.now();
                updateConversationListUI();
            }
        }).catch(e => console.error("Error updating subject:", e));
    } else {
        // If it's a new (temp) conversation, just update locally
        if (allConversations[activeConversation.id]) {
             allConversations[activeConversation.id].subject = activeConversation.subject;
             allConversations[activeConversation.id].updated_at = Date.now();
             updateConversationListUI();
        }
    }
  }
});

newChatBtn.addEventListener("click", startNewChat);

// == Send Message Handler ==
sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessageToActiveChat("user", message);
  messageInput.value = "";

  const systemPromptToSend = getSystemPromptBySubject(activeConversation.subject);

  try {
    const res = await fetch("https://temanbelajarcr-backend-app.delightfulpebble-0c5b36fd.southeastasia.azurecontainerapps.io/api/chat_with_ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ...(idToken && { 'Authorization': `Bearer ${idToken}`})
      },
      body: JSON.stringify({
        message,
        chat_history: activeConversation.history.map(msg => ({ role: msg.role, content: msg.content })),
        system_prompt: systemPromptToSend
      })
    });

    const data = await res.json();
    console.log(data.response);

    if (res.ok) {
      addMessageToActiveChat("assistant", data.response);
      await saveConversationToFirestore();
    } else {
      addMessageToActiveChat("assistant", `⚠️ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    addMessageToActiveChat("assistant", "⚠️ Gagal menghubungi server.");
  }
});

// == Initial Load & Data Fetching ==

// Load subjects from Firestore
async function loadSubjects() {
  try {
    const subjectsCollection = collection(db, "subjects");
    const q = query(subjectsCollection, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    availableSubjects = []; // Clear existing
    subjectSelect.innerHTML = ''; // Clear options

    querySnapshot.forEach((doc) => {
      const subjectData = doc.data();
      if (subjectData.name) {
        availableSubjects.push({ name: subjectData.name, prompt: subjectData.prompt });
        const option = document.createElement("option");
        option.value = subjectData.name.toLowerCase();
        option.textContent = subjectData.name;
        subjectSelect.appendChild(option);
      }
    });

    // Set default subject and update UI
    if (availableSubjects.length > 0) {
      if (!subjectSelect.value) { // Only set if not already set by activeConversation
        subjectSelect.value = availableSubjects[0].name.toLowerCase();
      }
      subjectTitleEl.textContent = `Subjek: ${subjectSelect.value}`;
      currentSubjectEl.textContent = subjectSelect.value;
    }

  } catch (err) {
    console.error("❌ Gagal memuat subjek:", err);
    // Fallback if subjects cannot be loaded (e.g., add hardcoded options)
    availableSubjects = [
        { name: "Matematika", prompt: "You are a helpful math tutor. Explain concepts clearly and ask guiding questions." },
        { name: "Bahasa Indonesia", prompt: "Anda adalah tutor Bahasa Indonesia yang membantu. Berikan penjelasan tata bahasa dan kosa kata." },
        { name: "Pengetahuan Umum", prompt: "Anda adalah ensiklopedia berjalan. Jawab pertanyaan umum dengan singkat dan jelas." }
    ];
    subjectSelect.innerHTML = '';
    availableSubjects.forEach(s => {
        const option = document.createElement("option");
        option.value = s.name.toLowerCase();
        option.textContent = s.name;
        subjectSelect.appendChild(option);
    });
    subjectSelect.value = availableSubjects[0].name.toLowerCase();
    subjectTitleEl.textContent = `Subjek: ${subjectSelect.value}`;
    currentSubjectEl.textContent = subjectSelect.value;
  }
}

// Function to find system prompt by subject name
function getSystemPromptBySubject(subjectName) {
    const found = availableSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
    return found ? found.prompt : "You are a helpful AI assistant."; // Default prompt
}

loadSubjects();