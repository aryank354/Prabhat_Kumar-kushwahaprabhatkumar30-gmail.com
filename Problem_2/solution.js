#!/usr/bin/env node

/**
 * Problem 2: GPS Smoothing & Idling Detection
 * Author: Prabhat Kumar
 */

const fs = require('fs');
const path = require('path');
// You must run: npm install geolib
const geolib = require('geolib');

// CONFIGURATION
const JITTER_SPEED_THRESHOLD_KMH = 120; // Unrealistic speed
const IDLING_SPEED_THRESHOLD_KMH = 3;   // Almost stopped
const IDLING_TIME_THRESHOLD_SEC = 120;  // 2 minutes stationary

// --- Logic ---

function processGPSData(data) {
    const cleanPath = [];
    const jitters = [];
    const idlingPoints = [];

    // Sort by time just in case
    data.sort((a, b) => new Date(a.gpstime) - new Date(b.gpstime));

    let idleStartTime = null;
    let idleStartPoint = null;

    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        
        // 1. Jitter Detection (Basic speed check against previous valid point)
        if (cleanPath.length > 0) {
            const prev = cleanPath[cleanPath.length - 1];
            
            const distanceMeters = geolib.getDistance(
                { latitude: prev.lat, longitude: prev.lon },
                { latitude: current.lat, longitude: current.lon }
            );
            
            const timeDiffSeconds = (new Date(current.gpstime) - new Date(prev.gpstime)) / 1000;
            
            if (timeDiffSeconds === 0) continue; // Duplicate timestamp

            const speedKmh = (distanceMeters / 1000) / (timeDiffSeconds / 3600);

            // If speed is unrealistic, mark as jitter
            if (speedKmh > JITTER_SPEED_THRESHOLD_KMH) {
                jitters.push(current);
                continue; // Skip adding to clean path
            }

            // 2. Idling Detection
            if (speedKmh < IDLING_SPEED_THRESHOLD_KMH) {
                if (!idleStartTime) {
                    idleStartTime = new Date(prev.gpstime);
                    idleStartPoint = prev;
                }
            } else {
                // Moving again, check if we were idling long enough
                if (idleStartTime) {
                    const idleDuration = (new Date(prev.gpstime) - idleStartTime) / 1000;
                    if (idleDuration >= IDLING_TIME_THRESHOLD_SEC) {
                        idlingPoints.push(idleStartPoint);
                    }
                    idleStartTime = null;
                    idleStartPoint = null;
                }
            }
        }
        
        cleanPath.push(current);
    }

    return { cleanPath, jitters, idlingPoints };
}

function generateMapHTML(original, clean, jitters, idling) {
    const cleanCoords = clean.map(p => [p.lat, p.lon]);
    const jitterCoords = jitters.map(p => [p.lat, p.lon]);
    const idleCoords = idling.map(p => [p.lat, p.lon]);
    
    // Center map on first valid point
    const center = cleanCoords.length > 0 ? cleanCoords[0] : [19.0, 72.8];

    return `
<!DOCTYPE html>
<html>
<head>
    <title>GPS Trajectory Analysis</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <style>#map { height: 100vh; }</style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${center[0]}, ${center[1]}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Blue Line: Clean Path
        var cleanLine = ${JSON.stringify(cleanCoords)};
        L.polyline(cleanLine, {color: 'blue', weight: 4}).addTo(map).bindPopup("Clean Route");

        // Red Dots: Jitters
        var jitters = ${JSON.stringify(jitterCoords)};
        jitters.forEach(j => {
            L.circleMarker(j, {color: 'red', radius: 5}).addTo(map).bindPopup("Jitter (Noise)");
        });

        // Yellow Markers: Idling
        var idling = ${JSON.stringify(idleCoords)};
        idling.forEach(i => {
            L.marker(i).addTo(map).bindPopup("Idling Point");
        });
    </script>
</body>
</html>`;
}

// --- Execution ---
const main = () => {
    try {
        const inputPath = path.join(__dirname, 'sample_input.json');
        if (!fs.existsSync(inputPath)) {
            throw new Error("sample_input.json not found. Please rename your data file.");
        }
        
        const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        const result = processGPSData(rawData);
        
        const htmlContent = generateMapHTML(rawData, result.cleanPath, result.jitters, result.idlingPoints);
        
        const outputPath = path.join(__dirname, 'output_map.html');
        fs.writeFileSync(outputPath, htmlContent);
        
        console.log(`Processing Complete.`);
        console.log(`- Clean points: ${result.cleanPath.length}`);
        console.log(`- Jitters removed: ${result.jitters.length}`);
        console.log(`- Idling events: ${result.idlingPoints.length}`);
        console.log(`Open '${outputPath}' in your browser to see the result.`);

    } catch (err) {
        console.error(err.message);
    }
};

main();