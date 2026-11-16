/* A.I config */
var iceBtn = $("#ice-btn");


iceBtn.on("click", function (){
    var iceBox = document.getElementById("ice-info");
   
    if (iceBox.style.display === "grid") {
        iceBox.style.display = "none"; // Undo the action
    } else {
        iceBox.style.display = "grid"; // Do the action
    }
});


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
                text: "You are an advanced Mars Scout assistant. You have access to real-time telemetry regarding the astronaut's position, environmental conditions, and hazard proximity. Always analyze their current location and hazard status when giving advice." 
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

    xhr.onload = function () {
        if (xhr.readyState === 4) {
            try {
                var responseData = JSON.parse(xhr.responseText);

                if (xhr.status >= 200 && xhr.status < 300) {
                    var aiText = responseData.text || 
                                 (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) || 
                                 "No response received.";

                    var iceBox = document.getElementById("ice-info");
                    var responseParagraph = iceBox.querySelector("p");

                    if (responseParagraph) {
                        responseParagraph.innerHTML = aiText;
                    }

                    iceBox.style.display = "grid";
                    askAiInput.value = "";
                } else {
                    console.error("Server Error (" + xhr.status + "):", responseData.error || xhr.responseText);
                }
            } catch (e) {
                console.error("Failed to parse JSON:", e);
            }
        }
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