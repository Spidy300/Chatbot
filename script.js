document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
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

    attachmentInput.addEventListener("change", handleAttachmentSelection);

    function handleAttachmentSelection() {
        if (attachmentInput.files.length > 0) {
            const fileName = attachmentInput.files[0].name;
            displayMessage(`File attached: ${fileName}. Send your message!`, "bot");
        }
    }

    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === "") {
            if (attachmentInput.files.length > 0) {
                 const fileInfo = `[File Attachment: ${attachmentInput.files[0].name}]`;
                 conversationHistory.push({ role: "user", content: fileInfo });
                 displayMessage(fileInfo, "user");
                 userInput.value = "";
                 getBotResponse(`The user has sent a file named: ${attachmentInput.files[0].name}. Please acknowledge.`);
                 attachmentInput.value = '';
            }
            return;
        }

        let fullMessage = messageText;
        if (attachmentInput.files.length > 0) {
            fullMessage = `[File: ${attachmentInput.files[0].name}] ${messageText}`;
        }

        conversationHistory.push({ role: "user", content: fullMessage });
        displayMessage(fullMessage, "user");
        userInput.value = "";
        
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
        // Better scrolling for mobile
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    async function getBotResponse(userMessage) {
        const API_URL = "https://api.groq.com/openai/v1/chat/completions";
        
        // 🚨 IMPORTANT: Replace this with your NEW key. 
        // For a real mobile app, you should not put the key here.
        const API_KEY = "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"; 

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
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
