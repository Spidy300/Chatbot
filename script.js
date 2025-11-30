document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const attachmentInput = document.getElementById("attachment-input"); 
    const voiceButton = document.getElementById("voice-button");
    const loadingSpinner = document.getElementById("loading-spinner");

    // --- Configuration ---
    // Using the Gemini API for multimodal (text/image) capabilities and quick response
    const API_MODEL = "gemini-2.5-flash";
    const API_KEY = "AIzaSyCSaw6BPm2q3JwOOkFYPj3WSV2LNZ5ssws"; // Canvas will provide this key at runtime
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${API_KEY}`;
    let isAwaitingResponse = false;

    // The entire conversation history is stored here, including the system instruction
    const conversationHistory = [
        {
            role: "user", // System instructions must be in the 'contents' array, not top level
            parts: [{ 
                text: "I'm NIKA-Ai 1.8 by Sudeep, an advanced, quick-response, multimodal assistant. You support voice, text, and deep-scan image analysis. Respond concisely and professionally. If an image is provided, analyze it thoroughly." 
            }]
        }
    ];

    // --- Event Listeners ---
    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    attachmentInput.addEventListener("change", handleAttachmentSelection);
    voiceButton.addEventListener("click", toggleVoiceInput);

    // --- Utility Functions ---

    /**
     * Converts a File object (image) to a Base64 string.
     * @param {File} file 
     * @returns {Promise<{mimeType: string, data: string}>}
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const [mimeType, base64Data] = reader.result.split(',');
                resolve({
                    mimeType: file.type,
                    data: base64Data
                });
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function setUIState(isLoading) {
        isAwaitingResponse = isLoading;
        userInput.disabled = isLoading;
        sendButton.style.display = isLoading ? 'none' : 'flex';
        loadingSpinner.style.display = isLoading ? 'flex' : 'none';
        attachmentInput.disabled = isLoading;
        voiceButton.disabled = isLoading;
    }
    
    // --- Message Handling ---

    function handleAttachmentSelection() {
        if (attachmentInput.files.length > 0) {
            const file = attachmentInput.files[0];
            if (file.type.startsWith('image/')) {
                displayMessage(`Image attached: ${file.name}. Send your message to analyze!`, "bot");
            } else {
                displayMessage(`File type unsupported for deep scan. Please attach an image.`, "bot");
                attachmentInput.value = ''; // Clear selection
            }
        }
    }

    async function sendMessage() {
        if (isAwaitingResponse) return;

        const messageText = userInput.value.trim();
        const file = attachmentInput.files[0];

        // Do nothing if no text and no file
        if (messageText === "" && !file) return;

        setUIState(true);
        
        let userParts = [];
        let displayMessageText = messageText;

        if (file) {
            if (!file.type.startsWith('image/')) {
                 displayMessage("Error: Only images are supported for Deep Scan.", "bot");
                 setUIState(false);
                 return;
            }
            
            try {
                const base64Data = await fileToBase64(file);
                // 1. Add the image data part
                userParts.push({
                    inlineData: {
                        mimeType: base64Data.mimeType,
                        data: base64Data.data
                    }
                });
                
                // 2. Append text part (if any)
                if (messageText) {
                    userParts.push({ text: messageText });
                } else {
                    userParts.push({ text: `Analyze this image: ${file.name}` });
                    displayMessageText = `Analyze this image: ${file.name}`;
                }

                // Append image info to the display message
                displayMessageText += ` [Image: ${file.name}]`;

            } catch (error) {
                console.error("Error converting file:", error);
                displayMessage("Error: Could not process the attached file.", "bot");
                setUIState(false);
                return;
            }
        } else if (messageText) {
             // Only text input
            userParts.push({ text: messageText });
        } else {
            // Should not happen, but a safeguard
            setUIState(false);
            return;
        }

        // Add user message to the display and full history
        displayMessage(displayMessageText, "user");
        userInput.value = "";
        attachmentInput.value = ''; // Clear attachment

        // History structure for the Gemini API call
        const userMessage = { role: "user", parts: userParts };

        // We use the full history array for the call
        conversationHistory.push(userMessage);

        // Call the AI
        await getBotResponse();
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        // Better scrolling for mobile
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    // --- Voice Input (Speech Recognition) ---
    let recognition = null;
    let isRecording = false;

    // Check for browser support
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false; // Capture a single phrase
        recognition.interimResults = true; // Display results as they arrive
        recognition.lang = 'en-US'; // Default language

        recognition.onstart = () => {
            isRecording = true;
            voiceButton.classList.add('recording');
            userInput.placeholder = "Listening... speak now!";
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Update input field with final or interim text
            userInput.value = finalTranscript || interimTranscript; 
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            displayMessage(`Voice input error: ${event.error}`, "bot");
            isRecording = false;
            voiceButton.classList.remove('recording');
            userInput.placeholder = "Type ur message...";
        };

        recognition.onend = () => {
            isRecording = false;
            voiceButton.classList.remove('recording');
            userInput.placeholder = "Type ur message...";

            // Automatically send the message if final transcript exists
            if (userInput.value.trim() !== "") {
                sendMessage();
            }
        };

    } else {
        // Inform user if voice input is not supported
        voiceButton.style.display = 'none';
        console.warn('Web Speech API is not supported in this browser.');
    }

    function toggleVoiceInput() {
        if (!recognition) return;

        if (isRecording) {
            recognition.stop();
        } else {
            // Clear input before starting to record
            userInput.value = ''; 
            // Check if user is trying to record while an attachment is present
            if (attachmentInput.files.length > 0) {
                 displayMessage("Please send the attached image before starting voice input.", "bot");
                 return;
            }
            recognition.start();
        }
    }


    // --- AI API Call ---

    async function getBotResponse() {
        // Find the last user message to determine what we need to send
        // Since we are using an array structure, we send the whole history.
        // The Gemini API handles context window limitations internally.
        
        // This is the array of contents objects to send (full history)
        const contents = conversationHistory;

        // Simple exponential backoff retry loop
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: contents })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                    const botMessage = data.candidates[0].content.parts[0].text;
                    // Add the full bot response to the complete history
                    conversationHistory.push({ role: "model", parts: [{ text: botMessage }] });
                    displayMessage(botMessage, "bot");
                    
                    // Success, break the loop
                    setUIState(false);
                    return;
                } else {
                    console.error("API Response Error:", data);
                    throw new Error("Invalid response structure from API.");
                }
            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
                } else {
                    displayMessage("Error: Failed to fetch response after multiple retries. Check console for details.", "bot");
                    setUIState(false);
                }
            }
        }
    }

});

