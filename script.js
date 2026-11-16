// Button actions

var questionBtn = $("#ques-btn");
var aiBar = $("#ask-ai");

questionBtn.on("click", function (){
    var aboutBox = document.getElementById("about-box");
   
    if (aboutBox.style.display === "grid") {
        aboutBox.style.display = "none"; // Undo the action
    } else {
        aboutBox.style.display = "grid"; // Do the action
    }
});








// Leaflet / Mars Map (Jezero Crater Region)

var jezeroBounds = [
    [16.8, 75.8],   // SW corner [lat, lon]
    [20.2, 79.6]    // NE corner
];

var map = L.map('map', {
    crs: L.CRS.EPSG4326,         
    maxBounds: jezeroBounds,   
    maxBoundsViscosity: 1.0,    
    maxZoom: 9,
    minZoom: 5
});

var marsTiles = L.tileLayer(
    'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    {
        attribution: 'NASA / JPL / USGS Mars Trek',
        tms: false,
        noWrap: true,
        bounds: jezeroBounds, 
        maxNativeZoom: 7,        
        maxZoom: 9               
    }
);



marsTiles.addTo(map);





/* Simulated Controls for moving the user arrow */


var userArrow = L.icon({
    iconUrl: 'assets/user-arrow.png',
    iconSize: [38, 95],      
    iconAnchor: [19, 47],    
    popupAnchor: [0, -45]    
});



function updateStatusBar() {
    // 1. Scientific baselines for Jezero Crater (Equatorial region, ancient lake bed)
    var baseTemp = -55.0;   
    var basePressure = 720.0;
    var surfaceGeology = "Clay-Rich";
    
    // 2. Simulate micro-fluctuations for active telemetry feel
    var tempFluctuation = (Math.random() * 2 - 1).toFixed(1);      
    var pressureFluctuation = (Math.random() * 4 - 2).toFixed(1); 
    
    var currentTemp = (baseTemp + parseFloat(tempFluctuation)).toFixed(1);
    var currentPressure = (basePressure + parseFloat(pressureFluctuation)).toFixed(1);
    

    $("#status").html(`
        <span><strong>Site:</strong> Jezero Crater</span> ,
        <span><strong>Geology:</strong> ${surfaceGeology}</span> ,
        <span><strong>Pressure:</strong> ${currentPressure} Pa</span> |,
        <span><strong>Ext. Temp:</strong> ${currentTemp} °C</span>
    `);
}


updateStatusBar();


window.setInterval(updateStatusBar, 5000);




var userMarker = L.marker([18.44, 77.45], { icon: userArrow })
    .addTo(map)
    .bindPopup('<b>Jezero Crater User Location</b>');



function moveUser(newLat, newLng) {
    userMarker.setLatLng([newLat, newLng]);
}


function getUserCoords() {
    var currentPos = userMarker.getLatLng();
    console.log(currentPos.lat, currentPos.lng);
    return currentPos;
}

// Store all real crater hazards in a Leaflet LayerGroup
var hazardGroup = L.layerGroup().addTo(map);
var hazardCircles = [];

function loadRobbinsCraters() {
    var minLat = jezeroBounds[0][0]; 
    var minLng = jezeroBounds[0][1]; 
    var maxLat = jezeroBounds[1][0]; 
    var maxLng = jezeroBounds[1][1]; 
    var bbox = `${minLng},${minLat},${maxLng},${maxLat}`;

    var url = `https://astrogeology.usgs.gov/pygeoapi/collections/mars/robbinsv1/items?f=json&bbox=${bbox}&limit=500`;
    // console.log("Requesting URL:", url); // <--- Check what URL is being generated

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            // console.log("XHR finished with status:", xhr.status); // <--- Check if status is 200
            if (xhr.status >= 200 && xhr.status < 300) {
                var data = JSON.parse(xhr.responseText);
                // console.log("Raw API Response Data:", data); // <--- See if features array is populated
                renderCraterHazards(data.features || []);
            } else {
                console.error("Failed to load Robbins crater data. HTTP Status:", xhr.status);
            }
        }
    };

    xhr.onerror = function () {
        console.error("Network or CORS error while requesting USGS Robbins database.");
    };

    xhr.send();
}

function renderCraterHazards(features) {
    if (features.length > 0) {
        // console.log("Sample crater properties:", features[0].properties);
    }

    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        if (!feature.geometry || !feature.geometry.coordinates) continue;

        var lng = feature.geometry.coordinates[0];
        var lat = feature.geometry.coordinates[1];
        var props = feature.properties || {};

        var diameterKm = props.DIAM_CIRC_IMG || props.diam_circle_image || props.diameter || 2.0;

        if (diameterKm < 2.0) continue;

        var marsScaleFactor = 1.88;
        var radiusMeters = (diameterKm / 2) * 1000 * marsScaleFactor;

        var craterHazard = L.circle([lat, lng], {
            color: 'red',
            weight: 2,
            fillColor: '#f03',
            fillOpacity: 0.3,
            radius: radiusMeters * 5
        })
        .bindPopup(`
            <b>Crater ID:</b> ${props.CRATER_ID || props.crater_id || feature.id}<br>
            <b>Diameter:</b> ${Number(diameterKm).toFixed(2)} km
        `)
        .addTo(hazardGroup);

        hazardCircles.push(craterHazard);
    }
    
    
}


loadRobbinsCraters();

var num = 0.1; 

window.setInterval(function() {
    num = num + 0.01; 
    moveUser(18.44 + (Math.random() * 0.7 - 0.05) + num, 77.45 + (Math.random() * 0.7 - 0.3) + num);
    checkUserInHazard();
}, 2000);


var isUserInHazard = false; 

function checkUserInHazard() {
    var userPos = getUserCoords();

    var insideAny = hazardCircles.some(function (circle) {
        return map.distance(userPos, circle.getLatLng()) <= circle.getRadius();
    });

    isUserInHazard = insideAny;

    if (insideAny) {
        console.log("User is inside a hazard zone!");
        aiBar.parent().addClass("hazard-alert");
    } else {
        console.log("User is outside a hazard zone.");
        aiBar.parent().removeClass("hazard-alert");
    }
    return insideAny;
}

// Frame the region, then stop users zooming out past it
map.fitBounds(jezeroBounds);
map.setMinZoom(map.getBoundsZoom(jezeroBounds, true));

L.marker([18.38, 77.58])
    .addTo(map)
    .bindPopup('<b>Jezero Crater</b><br>Center Coordinates');






var thermalTiles = L.tileLayer(
    'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    {
        attribution: 'NASA / JPL / ASU / THEMIS',
        noWrap: true,
        bounds: jezeroBounds,
        maxNativeZoom: 8,   // confirm against the last TileMatrix in the capabilities file
        maxZoom: 9,
        opacity: 0.65
    }
);

var thermalLayerActive = false;

// Wire up the thermal layer button toggle action
$('#thermal-btn').on('click', function () {
    var statusBox = $("#status");
    
    if (thermalLayerActive) {
        map.removeLayer(thermalTiles);
        thermalLayerActive = false;
        $(this).css('border', 'none');
        statusBox.html(`<span><strong>Site:</strong> Jezero Crater</span> | <span><strong>Thermal Overlay:</strong> Offline</span>`);
        console.log("Thermal overlay disabled.");
    } else {
        thermalTiles.addTo(map);
        thermalLayerActive = true;
        $(this).css('border', '2px solid #ff4d4d');
        statusBox.html(`<span><strong>Site:</strong> Jezero Crater</span> | <span><strong>Thermal Overlay:</strong> Online (MGS TES)</span>`);
        console.log("Thermal overlay enabled.");
    }
});

var mineralogyMapServiceUrl = 'https://trek.nasa.gov/mars/trekarcgis/rest/services/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer';
var mineralogyOverlay = null;
var mineralogyLayerActive = false;

function updateMineralogyOverlay() {
    if (!mineralogyLayerActive) return;

    var bounds = map.getBounds();
    var mapSize = map.getSize();
    var sizeScale = Math.min(1, 2048 / mapSize.x, 2048 / mapSize.y);
    var width = Math.max(1, Math.round(mapSize.x * sizeScale));
    var height = Math.max(1, Math.round(mapSize.y * sizeScale));
    var bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ].join(',');
    var imageUrl = mineralogyMapServiceUrl + '/export?bbox=' + bbox +
        '&bboxSR=104905&imageSR=104905&size=' + width + ',' + height +
        '&format=png32&transparent=true&f=image';

    if (mineralogyOverlay) {
        mineralogyOverlay.setBounds(bounds);
        mineralogyOverlay.setUrl(imageUrl);
    } else {
        mineralogyOverlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 0.7,
            interactive: false
        }).on('error', function () {
            console.error('Failed to load NASA mineralogy overlay.');
        }).addTo(map);
    }
}

map.on('moveend', updateMineralogyOverlay);


$('#spectral-btn').on('click', function () {
    if (mineralogyLayerActive) {
        map.removeLayer(mineralogyOverlay);
        mineralogyOverlay = null;
        mineralogyLayerActive = false;
        $(this).css('border', 'none');
        console.log("Mineralogy overlay disabled.");
    } else {
        mineralogyLayerActive = true;
        updateMineralogyOverlay();
        $(this).css('border', '2px solid #00ffff');
        console.log("Mineralogy overlay enabled.");
    }
});
