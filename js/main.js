document.addEventListener('DOMContentLoaded', () => {
  const chatHistoryDiv = document.getElementById('chatHistory');
  const userMessageInput = document.getElementById('userMessage');
  const sendMessageButton = document.getElementById('sendMessage');
  const subjectSelect = document.getElementById('subject');
  
  // URL Azure Function Anda. PENTING: Ganti dengan URL fungsi lokal atau yang sudah di-deploy.
  // Jika Anda menjalankan secara lokal, ini biasanya: http://localhost:7071/api/ai_assistant
  // Pastikan nama routernya 'ai_assistant' sesuai dengan `@app.route(route="ai_assistant")`
  const AZURE_FUNCTION_URL = 'https://temanbelajarcr-backend-app.delightfulpebble-0c5b36fd.southeastasia.azurecontainerapps.io/api/ai_assistant'; 
  // const AZURE_FUNCTION_URL = 'http://localhost:5000/api/ai_assistant';

  let currentChatHistory = []; // Untuk menyimpan riwayat chat di sesi frontend

  // Fungsi untuk menampilkan pesan di UI chat
  function displayMessage(role, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.textContent = content;
    chatHistoryDiv.appendChild(messageElement);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Auto-scroll ke bawah
  }

  // Fungsi untuk memuat riwayat chat dari Session Storage
  function loadChatHistory() {
    const storedHistory = sessionStorage.getItem('chatHistory');
    if (storedHistory) {
      currentChatHistory = JSON.parse(storedHistory);
      currentChatHistory.forEach(msg => {
        displayMessage(msg.role, msg.content);
      });
    }
  }

  // Fungsi untuk menyimpan riwayat chat ke Session Storage
  function saveChatHistory() {
    sessionStorage.setItem('chatHistory', JSON.stringify(currentChatHistory));
  }

  // Mengirim pesan ke Azure Function
  sendMessageButton.addEventListener('click', async () => {
    const message = userMessageInput.value.trim();
    const selectedSubject = subjectSelect.value;
    
    if (!message) {
      alert('Pesan tidak boleh kosong!');
      return;
    }
    
    // Tampilkan pesan pengguna di UI
    displayMessage('user', message);
    currentChatHistory.push({ role: 'user', content: message });
    saveChatHistory(); // Simpan riwayat setelah pesan user ditambahkan

    userMessageInput.value = ''; // Kosongkan input

    // Siapkan data untuk dikirim ke Azure Function
    const requestBody = {
      message: message,
      subject: selectedSubject,
      // Kirim riwayat chat yang sudah ada (tanpa system message di sini, backend yang menambahkan)
      chat_history: currentChatHistory
    };
    
    try {
      // Lakukan panggilan API ke Azure Function
	  console.log("try get response");
      const response = await fetch(AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      const aiResponse = data.response;

      // Tampilkan respons AI di UI
      displayMessage('assistant', aiResponse);
      currentChatHistory.push({ role: 'assistant', content: aiResponse });
      saveChatHistory(); // Simpan riwayat setelah pesan AI ditambahkan
    
    } catch (error) {
      console.error('Error calling Azure Function:', error);
      displayMessage('assistant', 'Maaf, terjadi kesalahan. Silakan coba lagi.');
      // Jika ada error, jangan tambahkan pesan AI ke history jika AI tidak berhasil merespons
      // atau tambahkan pesan error agar pengguna tahu
      currentChatHistory.push({ role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' });
      saveChatHistory();
    }
  });
  
  // Mengizinkan kirim pesan dengan menekan Enter
  userMessageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessageButton.click();
    }
  });

  // Muat riwayat chat saat halaman pertama kali dibuka
  loadChatHistory();

});