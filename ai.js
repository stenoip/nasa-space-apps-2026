/* A.I config */
var iceBtn = $("#ice-btn");


iceBtn.on("click", function (){
    var iceBox = document.getElementById("ice-info");
   
    if (iceBox.style.display === "flow-root") {
        iceBox.style.display = "none"; // Undo the action
    } else {
        iceBox.style.display = "flow-root"; // Do the action
    }
});

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[character];
    });
}

function renderInlineMarkdown(text) {
    var tokens = [];
    var html = escapeHtml(text);

    function protect(markup) {
        var token = "\u0000" + tokens.length + "\u0000";
        tokens.push(markup);
        return token;
    }

    html = html.replace(/`([^`]+)`/g, function (match, code) {
        return protect("<code>" + code + "</code>");
    });
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, function (match, label, url) {
        return protect('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
            renderInlineMarkdown(label) + "</a>");
    });
    html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, "<strong>$1$2</strong>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
    html = html.replace(/(^|[^\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    html = html.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");

    return html.replace(/\u0000(\d+)\u0000/g, function (match, index) {
        return tokens[Number(index)];
    });
}

function renderMarkdown(markdown) {
    var lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var paragraph = [];
    var listType = "";
    var codeLines = null;

    function flushParagraph() {
        if (paragraph.length) {
            html.push("<p>" + renderInlineMarkdown(paragraph.join(" ")) + "</p>");
            paragraph = [];
        }
    }

    function closeList() {
        if (listType) {
            html.push("</" + listType + ">");
            listType = "";
        }
    }

    lines.forEach(function (line) {
        var trimmed = line.trim();
        var heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        var unorderedItem = trimmed.match(/^[-*+]\s+(.+)$/);
        var orderedItem = trimmed.match(/^\d+\.\s+(.+)$/);
        var item = unorderedItem || orderedItem;
        var nextListType = unorderedItem ? "ul" : "ol";

        if (trimmed.indexOf("```") === 0) {
            if (codeLines === null) {
                flushParagraph();
                closeList();
                codeLines = [];
            } else {
                html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
                codeLines = null;
            }
            return;
        }

        if (codeLines !== null) {
            codeLines.push(line);
            return;
        }

        if (!trimmed) {
            flushParagraph();
            closeList();
            return;
        }

        if (heading) {
            flushParagraph();
            closeList();
            var level = heading[1].length;
            html.push("<h" + level + ">" + renderInlineMarkdown(heading[2]) + "</h" + level + ">");
            return;
        }

        if (item) {
            flushParagraph();
            if (listType !== nextListType) {
                closeList();
                listType = nextListType;
                html.push("<" + listType + ">");
            }
            html.push("<li>" + renderInlineMarkdown(item[1]) + "</li>");
            return;
        }

        closeList();
        paragraph.push(trimmed);
    });

    if (codeLines !== null) {
        html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    }
    flushParagraph();
    closeList();
    return html.join("");
}

function addChatMessage(role, text, isMarkdown) {
    var chatHistory = document.getElementById("chat-history");
    var emptyState = chatHistory.querySelector(".chat-empty");
    var message = document.createElement("div");
    var label = document.createElement("strong");
    var body = document.createElement("div");

    if (emptyState) {
        emptyState.remove();
    }

    message.className = "chat-message chat-message-" + role;
    label.className = "chat-message-label";
    label.textContent = role === "user" ? "You" : "Mart";
    body.className = "chat-message-body";
    if (isMarkdown) {
        body.innerHTML = renderMarkdown(text);
    } else {
        body.textContent = text;
    }

    message.appendChild(label);
    message.appendChild(body);
    chatHistory.appendChild(message);
    scrollChatHistory();
    return body;
}

function scrollChatHistory() {
    var chatHistory = document.getElementById("chat-history");
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


function callPraterichAI() {
    var url = "https://praterich.vercel.app/api/praterich";
    var askAiInput = document.getElementById("ask-ai");
    var userQuery = askAiInput.value;

    if (!userQuery.trim()) return; // Don't send empty queries

   
    var coords = getUserCoords(); 
    var statusText = $("#status").text(); 
    var hazardStatus = typeof isUserInHazard !== 'undefined' ? isUserInHazard : false;

    // 2. Format telemetry into a clear context block for the AI
    var hazardStatusText = "Safe (Outside hazard zones)";
    if (hazardStatus) {
        hazardStatusText = "WARNING: INSIDE A HAZARD ZONE!";
    }

    var telemetryContext = 
        `[LIVE ASTRONAUT TELEMETRY]\n` +
        `- Coordinates: Latitude ` + coords.lat.toFixed(4) + `, Longitude ` + coords.lng.toFixed(4) + `\n` +
        `- Hazard Status: ` + hazardStatusText + `\n` +
        `- Environmental Status: ` + statusText + `\n\n`;

    // 3. Build the payload with system instructions and dynamic context
    var payload = {
        system_instruction: {
            parts: [{ 
                text: "You are an assistant named Mart the Scouter. You have access to real-time telemetry regarding the astronaut's position, environmental conditions and hazard proximity. Always analyze their current location and hazard status when giving advice and assist in finding minerals and signs of life on Mars." 
            }]
        },
        contents: [
            {
                role: "user",
                parts: [{ text: telemetryContext + "Astronaut Question: " + userQuery }]
            }
        ],
        reasoning_effort: "none"
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    var iceBox = document.getElementById("ice-info");
    addChatMessage("user", userQuery, false);
    var assistantMessage = addChatMessage("assistant", "Thinking...", false);
    iceBox.style.display = "flow-root";

    xhr.onload = function () {
        if (xhr.readyState === 4) {
            try {
                var responseData = JSON.parse(xhr.responseText);

                if (xhr.status >= 200 && xhr.status < 300) {
                    var aiText = responseData.text || 
                                 (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) || 
                                 "No response received.";

                    assistantMessage.innerHTML = renderMarkdown(aiText);
                    scrollChatHistory();
                    askAiInput.value = "";
                } else {
                    console.error("Server Error (" + xhr.status + "):", responseData.error || xhr.responseText);
                    assistantMessage.textContent = "The assistant request failed. Please try again.";
                }
            } catch (e) {
                console.error("Failed to parse JSON:", e);
                assistantMessage.textContent = "The assistant response could not be read.";
            }
        }
    };

    xhr.onerror = function () {
        assistantMessage.textContent = "Could not connect to the assistant. Please try again.";
    };

    xhr.send(JSON.stringify(payload));
}

// Add the Enter key listener for the input field
var askAiInput = document.getElementById("ask-ai");
if (askAiInput) {
    askAiInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            callPraterichAI();
        }
    });
}