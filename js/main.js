// main.js

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

// Modal elements (assuming you have these in index.html)
const linkAccountModal = document.getElementById("link-account-modal");
const modalLinkAccountBtn = document.getElementById("modal-link-account");
const modalStartNewBtn = document.getElementById("modal-start-new");

// == Global State ==
let currentUserId = null;
let activeConversation = null; // Object of the currently viewed conversation from Firestore
let allConversations = {}; // Stores metadata of all conversations (key: convoId, value: convoObject without history)

// IMPORTANT: Define system prompts here, or fetch them from Firestore as 'subjects' collection
// For simplicity and direct use with backend, we'll define them here for now.
let availableSubjects = [
  {
    name: "Pengetahuan Umum",
    value: "pengetahuan umum",
    prompt: `Anda adalah seorang tutor Pengetahuan Umum yang luas wawasannya.
    Berikan informasi faktual, ringkas, dan mudah dipahami tentang berbagai topik.
    Jelaskan konsep dengan jelas dan gunakan contoh jika perlu.
    Hanya berikan informasi yang relevan dengan pengetahuan umum.
    Jika pertanyaan di luar konteks, mohon sampaikan bahwa Anda hanya dapat membantu dalam pengetahuan umum.
    Selalu berikan jawaban dalam format Markdown.
    `
  },
  { name: "Bahasa Indonesia", value: "bahasa indonesia", prompt: "Anda adalah seorang tutor Bahasa Indonesia yang ahli dalam tata bahasa, kosa kata, sastra, dan penulisan. Jelaskan aturan Bahasa Indonesia, berikan contoh penggunaan kata, atau analisis karya sastra dengan lugas. Gunakan format Markdown untuk semua penjelasan Anda. Fokus hanya pada topik Bahasa Indonesia. Jika pertanyaan tidak relevan dengan Bahasa Indonesia, arahkan pengguna untuk mengganti subjek." },
  { name: "Bahasa Inggris", value: "bahasa inggris", prompt: "You are an expert English language tutor. Explain grammar rules, vocabulary, idioms, and provide clear usage examples. You can also help with writing exercises. Always use Markdown for your explanations and examples. Only provide information related to the English language. If a question falls outside this scope, politely state that you can only assist with English-related topics." },
  { name: "Matematika", value: "matematika", prompt: "Anda adalah tutor Matematika yang sabar dan membantu. Jelaskan konsep matematika, langkah-langkah penyelesaian masalah, dan berikan contoh. Gunakan notasi matematika yang benar (seperti LaTeX jika relevan) dan format jawaban Anda dalam Markdown. Dorong pemahaman dengan pertanyaan panduan. Jawablah hanya pertanyaan yang berkaitan dengan Matematika. Jika pertanyaan bukan Matematika, tolong informasikan bahwa Anda hanya bisa membantu dalam bidang Matematika." },
  { name: "Biologi", value: "biologi", prompt: "Anda adalah seorang tutor Biologi yang berpengetahuan luas. Jelaskan konsep-konsep Biologi, proses kehidupan, struktur organisme, dan ekosistem dengan detail namun mudah dipahami. Sertakan contoh atau analogi jika membantu. Berikan semua jawaban dalam format Markdown. Pastikan semua jawaban relevan dengan Biologi. Jika pertanyaan tidak berkaitan, sampaikan bahwa Anda hanya dapat membantu dalam konteks Biologi." },
  { name: "Fisika", value: "fisika", prompt: "Anda adalah seorang tutor Fisika yang ahli dalam prinsip-prinsip alam semesta. Jelaskan konsep Fisika, hukum, rumus, dan penerapannya dalam kehidupan sehari-hari. Gunakan notasi fisika yang tepat (seperti LaTeX jika relevan) dan format jawaban Anda dalam Markdown. Fokus pada pemahaman fundamental. Pertahankan fokus pada topik Fisika. Apabila pertanyaan berada di luar lingkup Fisika, arahkan pengguna untuk memilih subjek yang sesuai." },
  { name: "Kimia", value: "kimia", prompt: "Anda adalah seorang tutor Kimia yang terampil. Jelaskan konsep-konsep Kimia, reaksi kimia, struktur atom dan molekul, serta stoikiometri dengan jelas. Berikan contoh dan ilustrasi jika memungkinkan. Format semua penjelasan Anda dalam Markdown. Hanya berikan bantuan terkait Kimia. Jika pertanyaan tidak relevan dengan Kimia, informasikan bahwa Anda tidak dapat menjawabnya dan sarankan untuk memilih subjek lain." },
  { name: "Ekonomi", value: "ekonomi", prompt: "Anda adalah seorang tutor Ekonomi yang memahami prinsip-prinsip pasar dan kebijakan. Jelaskan konsep-konsep Ekonomi mikro dan makro, teori, dan bagaimana mereka mempengaruhi dunia nyata. Berikan jawaban yang terstruktur dan mudah dimengerti dalam format Markdown. Jawablah secara eksklusif pertanyaan di bidang Ekonomi. Jika pertanyaan tidak terkait dengan Ekonomi, sampaikan dengan sopan bahwa Anda terbatas pada subjek Ekonomi." },
  { name: "PKn", value: "pkn", prompt: "Anda adalah seorang tutor Pendidikan Kewarganegaraan (PKn) yang berwawasan. Jelaskan konsep-konsep kewarganegaraan, hak dan kewajiban, sistem pemerintahan, konstitusi, dan nilai-nilai demokrasi. Sampaikan informasi dengan jelas dan netral dalam format Markdown. Pastikan semua respons berada dalam konteks Pendidikan Kewarganegaraan. Jika pertanyaan di luar topik PKn, nyatakan dengan jelas bahwa Anda tidak bisa menjawab pertanyaan tersebut." },
  { name: "Sejarah", value: "sejarah", prompt: "Anda adalah seorang tutor Sejarah yang cakap dalam menceritakan masa lalu. Jelaskan peristiwa sejarah, tokoh penting, periode waktu, dan dampaknya dengan detail yang akurat. Berikan konteks yang relevan dan selalu gunakan format Markdown untuk narasi Anda. Hanya berikan informasi historis. Jika pertanyaan bukan tentang Sejarah, mohon minta pengguna untuk mengubah subjek." },
  { name: "TIK", value: "tik", prompt: "Anda adalah seorang tutor Teknologi Informasi dan Komunikasi (TIK) yang up-to-date. Jelaskan konsep-konsep dasar TIK, cara kerja teknologi, jaringan komputer, pemrograman, dan aplikasi perangkat lunak. Berikan penjelasan praktis dan relevan dalam format Markdown. Pastikan semua jawaban hanya berkaitan dengan Teknologi Informasi dan Komunikasi. Jika pertanyaan di luar TIK, nyatakan bahwa Anda tidak dapat membantu dalam domain tersebut." }
];


// == Helper Functions ==

// Function to render Markdown (using a simple regex for basic Markdown)
// For robust rendering, consider a library like 'marked.js' or 'DOMPurify' for safety
function renderMarkdown(markdownText) {
  // Simple markdown to HTML conversion
  let html = markdownText
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')     // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')               // Italic
    .replace(/^- (.*)/gm, '<li>$1</li>')                 // Unordered list
    .replace(/^(\d+)\. (.*)/gm, '<li>$2</li>');         // Ordered list (will need <ol> wrap)
  
  // Wrap list items if they exist
  if (html.includes('<li>')) {
      html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');
  }

  return html;
}

// Renders the ENTIRE chat history from activeConversation
// This is called when a new conversation is started or an existing one is selected.
function renderFullChatHistory() {
  chatContainer.innerHTML = ""; // Clear existing content

  if (!activeConversation || !activeConversation.history || activeConversation.history.length === 0) {
    // Optionally display a "Start typing..." message
    chatContainer.innerHTML = '<p class="empty-chat-message">Mulai ketik pesan Anda untuk memulai percakapan...</p>';
    return;
  }

  const chatListElement = document.createElement("ul");
  chatListElement.className = "chat-list";
  chatContainer.appendChild(chatListElement);

  activeConversation.history.forEach((entry) => {
    // Directly append each message to the DOM
    appendChatMessageToDOM(entry.role, entry.content, chatListElement);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Appends a single new chat message to the DOM
// This is called when a new message (user or AI) is added during an active chat.
function appendChatMessageToDOM(role, content, targetList = null) {
  const chatListElement = targetList || chatContainer.querySelector(".chat-list");
  if (!chatListElement) {
      // If chat list doesn't exist (e.g., initial empty state), create it
      chatContainer.innerHTML = ""; // Clear any "start typing" message
      const newChatList = document.createElement("ul");
      newChatList.className = "chat-list";
      chatContainer.appendChild(newChatList);
      chatListElement = newChatList;
  }

  const li = document.createElement("li");
  li.className = `chat-bubble ${role}`;
  if (role === "assistant") {
    li.innerHTML = renderMarkdown(content);
  } else {
    li.textContent = content;
  }
  chatListElement.appendChild(li);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom
}


// Add message to activeConversation's local history (not yet saved to Firestore)
function addMessageToActiveChat(role, content) {
  if (!activeConversation) {
    console.error("No active conversation to add message to.");
    return;
  }
  activeConversation.history.push({ role, content, timestamp: Date.now() });
  appendChatMessageToDOM(role, content); // Only append the new message to DOM
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
  // Reset active conversation
  activeConversation = {
    id: `temp-${Date.now()}`, // Temporary ID for a new, unsaved conversation
    user_id: currentUserId,
    subject: subjectSelect.value,
    history: [],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  // Add to allConversations temporarily so it shows in the list
  allConversations[activeConversation.id] = { ...activeConversation }; // Copy to avoid mutation issues

  subjectTitleEl.textContent = `Subjek: ${activeConversation.subject}`;
  currentSubjectEl.textContent = activeConversation.subject;
  messageInput.value = ""; // Clear input field
  renderFullChatHistory(); // Render an empty chat or placeholder
  updateConversationListUI();
}

// Selects an existing conversation and loads its messages
async function selectConversation(conversationId) {
  if (!allConversations[conversationId]) {
    console.error("Conversation not found:", conversationId);
    return;
  }

  // Set active conversation metadata
  activeConversation = { ...allConversations[conversationId] }; // Copy metadata
  activeConversation.history = []; // Initialize history to load messages

  subjectSelect.value = activeConversation.subject; // Update dropdown
  subjectTitleEl.textContent = `Subjek: ${activeConversation.subject}`;
  currentSubjectEl.textContent = activeConversation.subject;
  messageInput.value = ""; // Clear input field

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
        content: msgData.content,
        timestamp: msgData.timestamp ? msgData.timestamp.toMillis() : 0
      });
    });
    renderFullChatHistory(); // Render the full history of the selected chat
    updateConversationListUI(); // Update active class
    console.log(`✅ Percakapan '${activeConversation.subject}' dimuat.`);
  } catch (e) {
    console.error("❌ Gagal memuat pesan percakapan:", e);
    renderFullChatHistory(); // Render empty if load fails
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
    loadConversationsForAuthenticatedUser();
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
    loadConversationsForAuthenticatedUser();
  } catch (err) {
    console.error("❌ Gagal hapus:", err);
    alert("Gagal menghapus percakapan.");
  }
}

// Saves/updates the current activeConversation to Firestore
async function saveConversationToFirestore() {
  if (!activeConversation || !currentUserId) return;

  try {
    const isNewConversation = activeConversation.id.startsWith("temp-");
    const oldTempId = activeConversation.id;

    if (isNewConversation) {
      // Create new conversation document
      const newDocRef = await addDoc(collection(db, "conversations"), {
        user_id: currentUserId,
        subject: activeConversation.subject,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      activeConversation.id = newDocRef.id; // Update activeConversation ID to Firestore ID

      // Delete old temporary entry from allConversations map
      delete allConversations[oldTempId];

      // Add all messages to the new messages subcollection
      for (const msg of activeConversation.history) {
        await addDoc(collection(db, "conversations", activeConversation.id, "messages"), {
          role: msg.role,
          content: msg.content,
          timestamp: serverTimestamp()
        });
      }
      console.log("✅ Percakapan baru berhasil dibuat di Firestore:", activeConversation.id);

    } else {
      // Update existing conversation metadata
      const conversationRef = doc(db, "conversations", activeConversation.id);
      await updateDoc(conversationRef, {
        updated_at: serverTimestamp()
      });

      // Add only the latest messages (user + AI response) to the subcollection
      // This assumes the history array contains the new messages since last save
      const lastSentMessages = activeConversation.history.slice(-2); // User message + AI response
      for (const msg of lastSentMessages) {
          // You might add a check here if msg.timestamp > activeConversation.lastSavedTimestamp to prevent duplicates
          // if you're not always sending just the last 2.
          await addDoc(collection(db, "conversations", activeConversation.id, "messages"), {
            role: msg.role,
            content: msg.content,
            timestamp: serverTimestamp()
          });
      }
      console.log("✅ Percakapan berhasil diperbarui di Firestore:", activeConversation.id);
    }

    // Update allConversations map with the correct Firestore ID and latest metadata
    allConversations[activeConversation.id] = {
      id: activeConversation.id,
      user_id: activeConversation.user_id,
      subject: activeConversation.subject,
      created_at: activeConversation.created_at, // Preserve original creation time
      updated_at: Date.now() // Use local timestamp for immediate UI sorting
    };
    activeConversation.lastSavedTimestamp = Date.now(); // Mark for future partial updates
    updateConversationListUI(); // Refresh sidebar list

  } catch (e) {
    console.error("❌ Gagal simpan/perbarui Firestore:", e);
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
      // User is anonymous. Load their past anonymous conversations if they exist.
      // Or simply start a new chat if this is their first visit/session.
      // Since all conversations are saved to Firestore now, we should try to load.
      await loadConversationsForAuthenticatedUser(); // This will load any existing anon convos
      if (Object.keys(allConversations).length === 0) {
          startNewChat(); // If no previous convos, start fresh
      }
    } else {
      // User is authenticated (Google)
      await loadConversationsForAuthenticatedUser();
    }
  } else {
    // No user signed in (e.g., after logout). Sign in anonymously to maintain session.
    try {
      const anonUserCredential = await signInAnonymously(auth);
      currentUserId = anonUserCredential.user.uid;
      updateAuthUI(anonUserCredential.user);
      await loadConversationsForAuthenticatedUser(); // Load any potentially old anon data
      if (Object.keys(allConversations).length === 0) {
        startNewChat(); // Start a fresh chat for the new anonymous session
      }
    } catch (error) {
      console.error("Failed to sign in anonymously:", error);
      alert("Gagal memulai sesi. Silakan periksa koneksi Anda.");
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
    updateConversationListUI();

  } catch (err) {
    console.error("❌ Gagal memuat percakapan untuk pengguna terautentikasi:", err);
  }
}

// Handles user avatar click for login/logout/linking
currentUserAvatarEl.addEventListener("click", async () => {
  if (auth.currentUser) {
    if (auth.currentUser.isAnonymous) {
      // Anonymous user wants to login with Google
      // We will use linkWithPopup instead of signInWithPopup for upgrading anonymous accounts
      try {
        const result = await linkWithPopup(auth.currentUser, googleProvider);
        const user = result.user; // The now linked user
        
        alert(`Selamat datang, ${user.displayName || user.email}! Akun Anda berhasil ditautkan.`);
        // onAuthStateChanged will handle loading conversations for the new linked user
        
      } catch (error) {
        console.error("Google linking failed:", error);
        if (error.code === 'auth/credential-already-in-use') {
            alert("Akun Google ini sudah terhubung dengan akun lain. Anda bisa mencoba logout dan login dengan akun Google tersebut.");
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log("Login popup closed by user.");
        } else {
            alert("Gagal menautkan akun Google: " + error.message);
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

sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!message) return;

  if (!activeConversation) {
    await startNewChat(); // If no active chat, start a new one
  }

  addMessageToActiveChat("user", message); // Add user message locally and append to DOM
  messageInput.value = ""; // Clear input field

  let idToken = null;
  if (auth.currentUser) { // If any user is logged in (anonymous or permanent)
      idToken = await auth.currentUser.getIdToken();
  }

  const systemPromptToSend = getSystemPromptBySubject(activeConversation.subject);

  try {
    const res = await fetch("https://temanbelajarcr-backend-app.delightfulpebble-0c5b36fd.southeastasia.azurecontainerapps.io/api/chat_with_ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken && { 'Authorization': `Bearer ${idToken}` })
      },
      body: JSON.stringify({
        message: message, // User's latest message
        chat_history: activeConversation.history.map(msg => ({ role: msg.role, content: msg.content })), // Full history for context
        system_prompt: systemPromptToSend // Send system prompt from frontend
      })
    });

    const data = await res.json();

    if (res.ok) {
      addMessageToActiveChat("assistant", data.response); // Add AI response locally and append to DOM
      await saveConversationToFirestore(); // Save/update conversation in Firestore
    } else {
      addMessageToActiveChat("assistant", `⚠️ Error: ${data.error || "Terjadi kesalahan pada server AI."}`);
      console.error("AI response error:", data.error);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    addMessageToActiveChat("assistant", "⚠️ Gagal menghubungi server. Periksa koneksi Anda.");
  }
});

messageInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendBtn.click();
    }
});


// == Initial Load & Data Fetching ==

// Load subjects from local 'availableSubjects' array
async function loadSubjects() {
  subjectSelect.innerHTML = ''; // Clear options
  availableSubjects.forEach(s => {
    const option = document.createElement("option");
    option.value = s.value; // Use 'value' field from object
    option.textContent = s.name;
    subjectSelect.appendChild(option);
  });

  // Set default subject and update UI
  if (availableSubjects.length > 0) {
    // Try to restore previous subject if activeConversation exists
    if (activeConversation && activeConversation.subject) {
      subjectSelect.value = activeConversation.subject;
    } else {
      subjectSelect.value = availableSubjects[0].value;
    }
    subjectTitleEl.textContent = `Subjek: ${subjectSelect.value}`;
    currentSubjectEl.textContent = subjectSelect.value;
  }
}

// Function to find system prompt by subject name
function getSystemPromptBySubject(subjectValue) {
    const found = availableSubjects.find(s => s.value === subjectValue);
    return found ? found.prompt : "You are a helpful AI assistant."; // Default prompt if not found
}

// Initial calls on page load
loadSubjects();
// The rest is handled by onAuthStateChanged