document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    // NEW: Get the file input element
    const attachmentInput = document.getElementById("attachment-input"); 

    const conversationHistory = [
        {
            role: "system",
            content: "You are a helpful assistant."
        }
    ];

    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    // NEW: Event listener for file selection
    attachmentInput.addEventListener("change", handleAttachmentSelection);

    function handleAttachmentSelection() {
        if (attachmentInput.files.length > 0) {
            const fileName = attachmentInput.files[0].name;
            // Display a message to the user that a file has been selected
            displayMessage(`File attached: ${fileName}. Send your message!`, "bot");
            // Optionally, you might change the send button color or input placeholder here
        }
    }


    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === "") {
            // Check if there is an attachment without a message
            if (attachmentInput.files.length > 0) {
                 // Send the file attachment information as the message
                 const fileInfo = `[File Attachment: ${attachmentInput.files[0].name}]`;
                 
                 conversationHistory.push({ role: "user", content: fileInfo });
                 displayMessage(fileInfo, "user");
                 userInput.value = "";
                 getBotResponse(`The user has sent a file named: ${attachmentInput.files[0].name}. Please acknowledge.`);
                 
                 // Clear the file input after sending
                 attachmentInput.value = '';
            }
            return;
        }

        let fullMessage = messageText;
        // Prepend file info to the text message if a file is attached
        if (attachmentInput.files.length > 0) {
            fullMessage = `[File: ${attachmentInput.files[0].name}] ${messageText}`;
        }

        conversationHistory.push({ role: "user", content: fullMessage });
        displayMessage(fullMessage, "user");
        userInput.value = "";
        
        // Clear the file input after sending the message
        if (attachmentInput.files.length > 0) {
            attachmentInput.value = '';
        }

        getBotResponse(fullMessage);
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function getBotResponse(userMessage) {
        // --- THIS IS THE DANGEROUS, INSECURE WAY ---
        // Do NOT use this in a real project. Your key will be stolen.
        
        const API_URL = "https://api.groq.com/openai/v1/chat/completions";
        
        // 🚨 DANGER: DO NOT PUT YOUR REAL KEY HERE IN CLIENT-SIDE CODE
         const API_KEY = "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"; 
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}` // Key is exposed!
                },
                body: JSON.stringify({
                    // === THIS IS THE CORRECTED MODEL NAME ===
                    model: "llama-3.3-70b-versatile", 
                    messages: conversationHistory, 
                    stream: false
                })
            });

            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                const botMessage = data.choices[0].message.content;
                conversationHistory.push({ role: "assistant", content: botMessage });
                displayMessage(botMessage, "bot");
            } else if (data.error) {
                console.error("API Error:", data.error.message);
                displayMessage(`Error: ${data.error.message}`, "bot");
            } else {
                displayMessage("Error: Could not get a response.", "bot");
            }
        } catch (error) {
            console.error("Error calling Groq API:", error);
            displayMessage("Error: Failed to fetch response.", "bot");
        }
    }

});