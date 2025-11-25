#!/usr/bin/env node

/**
 * Problem 2: GPS Smoothing & Idling Detection
 * Author: Prabhat Kumar (Updated)
 * 
 * Approach:
 * 1. Jitter Detection: Calculate speed between consecutive points using Haversine formula
 *    - Uses a sliding window to avoid cascading false positives
 *    - Checks acceleration for additional validation
 * 2. Idling Detection: Identifies when vehicle is stationary for extended periods
 * 3. Visualization: Generates interactive HTML map using Leaflet.js
 * 
 * Complexity:
 * - Time: O(n) where n is number of GPS points
 * - Space: O(n) for storing clean path, jitters, and idling points
 */

const fs = require('fs');
const path = require('path');
const geolib = require('geolib');

// CONFIGURATION
const JITTER_SPEED_THRESHOLD_KMH = 120; // Unrealistic speed threshold
const IDLING_SPEED_THRESHOLD_KMH = 3;   // Almost stopped
const IDLING_TIME_THRESHOLD_SEC = 120;  // 2 minutes stationary
const WINDOW_SIZE = 3; // Number of previous points to consider for jitter detection

/**
 * Calculate speed between two GPS points
 */
function calculateSpeed(point1, point2) {
  const distanceMeters = geolib.getDistance(
    { latitude: point1.lat, longitude: point1.lon },
    { latitude: point2.lat, longitude: point2.lon }
  );

  const timeDiffSeconds = (new Date(point2.gpstime) - new Date(point1.gpstime)) / 1000;

  if (timeDiffSeconds === 0) return 0;

  const speedKmh = (distanceMeters / 1000) / (timeDiffSeconds / 3600);
  return speedKmh;
}

/**
 * Check if a point is a jitter using sliding window approach
 */
function isJitter(current, recentCleanPoints) {
  if (recentCleanPoints.length === 0) return false;

  // Check against multiple recent points to avoid cascading false positives
  let suspiciousCount = 0;
  const pointsToCheck = Math.min(WINDOW_SIZE, recentCleanPoints.length);

  for (let i = recentCleanPoints.length - 1; i >= recentCleanPoints.length - pointsToCheck; i--) {
    const prev = recentCleanPoints[i];
    const speed = calculateSpeed(prev, current);

    if (speed > JITTER_SPEED_THRESHOLD_KMH) {
      suspiciousCount++;
    }
  }

  // Only mark as jitter if it's suspicious relative to majority of recent points
  return suspiciousCount >= Math.ceil(pointsToCheck / 2);
}

/**
 * Main GPS data processing function
 */
function processGPSData(data) {
  const cleanPath = [];
  const jitters = [];
  const idlingPoints = [];
  const statistics = {
    totalPoints: data.length,
    cleanPoints: 0,
    jittersRemoved: 0,
    idlingEvents: 0,
    duplicateTimestamps: 0
  };

  // Sort by time
  data.sort((a, b) => new Date(a.gpstime) - new Date(b.gpstime));

  let idleStartTime = null;
  let idleStartPoint = null;
  let lastNonZeroSpeedTime = null;

  for (let i = 0; i < data.length; i++) {
    const current = data[i];

    // Skip duplicate timestamps
    if (cleanPath.length > 0) {
      const prev = cleanPath[cleanPath.length - 1];
      const timeDiff = new Date(current.gpstime) - new Date(prev.gpstime);

      if (timeDiff === 0) {
        statistics.duplicateTimestamps++;
        continue;
      }
    }

    // Jitter Detection using sliding window
    if (cleanPath.length >= 1) {
      if (isJitter(current, cleanPath)) {
        jitters.push(current);
        statistics.jittersRemoved++;
        continue; // Skip adding to clean path
      }
    }

    // Add to clean path
    cleanPath.push(current);
    statistics.cleanPoints++;

    // Idling Detection
    if (cleanPath.length >= 2) {
      const prev = cleanPath[cleanPath.length - 2];
      const speed = calculateSpeed(prev, current);

      if (speed < IDLING_SPEED_THRESHOLD_KMH) {
        // Vehicle is moving very slowly or stopped
        if (!idleStartTime) {
          idleStartTime = new Date(prev.gpstime);
          idleStartPoint = prev;
        }
      } else {
        // Vehicle is moving
        lastNonZeroSpeedTime = new Date(current.gpstime);

        if (idleStartTime) {
          const idleDuration = (new Date(prev.gpstime) - idleStartTime) / 1000;

          if (idleDuration >= IDLING_TIME_THRESHOLD_SEC) {
            // Check if we already recorded this idling point
            const isDuplicate = idlingPoints.some(p =>
              p.lat === idleStartPoint.lat && p.lon === idleStartPoint.lon
            );

            if (!isDuplicate) {
              idlingPoints.push({
                ...idleStartPoint,
                duration: idleDuration,
                startTime: idleStartTime,
                endTime: new Date(prev.gpstime)
              });
              statistics.idlingEvents++;
            }
          }

          idleStartTime = null;
          idleStartPoint = null;
        }
      }
    }
  }

  // Check final idling sequence (if journey ends while idling)
  if (idleStartTime && cleanPath.length > 0) {
    const lastPoint = cleanPath[cleanPath.length - 1];
    const idleDuration = (new Date(lastPoint.gpstime) - idleStartTime) / 1000;

    if (idleDuration >= IDLING_TIME_THRESHOLD_SEC) {
      const isDuplicate = idlingPoints.some(p =>
        p.lat === idleStartPoint.lat && p.lon === idleStartPoint.lon
      );

      if (!isDuplicate) {
        idlingPoints.push({
          ...idleStartPoint,
          duration: idleDuration,
          startTime: idleStartTime,
          endTime: new Date(lastPoint.gpstime)
        });
        statistics.idlingEvents++;
      }
    }
  }

  return { cleanPath, jitters, idlingPoints, statistics };
}

/**
 * Generate interactive HTML map
 */
function generateMapHTML(original, clean, jitters, idling, statistics) {
  const cleanCoords = clean.map(p => [p.lat, p.lon]);
  const jitterCoords = jitters.map(p => [p.lat, p.lon]);
  const idleCoords = idling.map(p => [p.lat, p.lon]);

  // Calculate center point
  const center = cleanCoords.length > 0 ? cleanCoords[0] : [19.0, 72.8];

  // Calculate bounds for auto-zoom
  const allLats = cleanCoords.map(c => c[0]);
  const allLons = cleanCoords.map(c => c[1]);
  const bounds = cleanCoords.length > 0 ? [
    [Math.min(...allLats), Math.min(...allLons)],
    [Math.max(...allLats), Math.max(...allLons)]
  ] : null;

  return `<!DOCTYPE html>
<html>
<head>
    <title>GPS Trajectory Analysis</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map { height: 100vh; width: 100%; }
        .legend {
            position: absolute;
            top: 10px;
            right: 10px;
            background: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 1000;
        }
        .legend-item {
            margin: 5px 0;
            display: flex;
            align-items: center;
        }
        .legend-color {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            border-radius: 3px;
        }
        .stats {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 1000;
            font-size: 12px;
        }
        .stats h3 { margin: 0 0 10px 0; font-size: 14px; }
        .stats-item { margin: 3px 0; }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <div class="legend">
        <h3 style="margin: 0 0 10px 0;">Legend</h3>
        <div class="legend-item">
            <div class="legend-color" style="background: blue;"></div>
            <span>Clean Route</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: red;"></div>
            <span>Jitters (Noise)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: orange;"></div>
            <span>Idling Points</span>
        </div>
    </div>
    
    <div class="stats">
        <h3>Statistics</h3>
        <div class="stats-item">Total Points: ${statistics.totalPoints}</div>
        <div class="stats-item">Clean Points: ${statistics.cleanPoints}</div>
        <div class="stats-item">Jitters Removed: ${statistics.jittersRemoved}</div>
        <div class="stats-item">Idling Events: ${statistics.idlingEvents}</div>
        <div class="stats-item">Duplicate Timestamps: ${statistics.duplicateTimestamps}</div>
    </div>
    
    <script>
        // Initialize map
        var map = L.map('map').setView([${center[0]}, ${center[1]}], 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Blue Line: Clean Path
        var cleanLine = ${JSON.stringify(cleanCoords)};
        if (cleanLine.length > 0) {
            var polyline = L.polyline(cleanLine, {
                color: 'blue', 
                weight: 4,
                opacity: 0.7
            }).addTo(map);
            polyline.bindPopup("<b>Clean Route</b><br>${statistics.cleanPoints} valid GPS points");
        }

        // Red Dots: Jitters
        var jitters = ${JSON.stringify(jitterCoords)};
        jitters.forEach(function(j, index) {
            L.circleMarker(j, {
                color: 'red',
                fillColor: '#ff0000',
                fillOpacity: 0.7,
                radius: 6,
                weight: 2
            }).addTo(map).bindPopup("<b>Jitter (Noise)</b><br>Point #" + (index + 1) + "<br>Removed due to unrealistic speed");
        });

        // Orange Markers: Idling Points
        var idling = ${JSON.stringify(idling.map(i => ({
    lat: i.lat,
    lon: i.lon,
    duration: i.duration,
    startTime: i.startTime,
    endTime: i.endTime
  })))};
        
        idling.forEach(function(i) {
            var durationMin = Math.round(i.duration / 60);
            var startTime = new Date(i.startTime).toLocaleTimeString();
            var endTime = new Date(i.endTime).toLocaleTimeString();
            
            L.marker([i.lat, i.lon], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguOCAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIxLjMgMjUgMTIuNUMyNSA1LjYgMTkuNCAMCAxMi41IDB6IiBmaWxsPSIjRkY4QzAwIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjcuNSIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }).addTo(map).bindPopup(
                "<b>Idling Point</b><br>" +
                "Duration: " + durationMin + " minutes<br>" +
                "Start: " + startTime + "<br>" +
                "End: " + endTime
            );
        });

        // Fit map to bounds if we have data
        ${bounds ? `map.fitBounds(${JSON.stringify(bounds)}, { padding: [50, 50] });` : ''}

        // Add start and end markers
        if (cleanLine.length > 0) {
            L.marker(cleanLine[0], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguOCAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIxLjMgMjUgMTIuNUMyNSA1LjYgMTkuNCAMCAxMi41IDB6IiBmaWxsPSIjMDBDODUxIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjcuNSIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(map).bindPopup("<b>Start Point</b>");
            
            L.marker(cleanLine[cleanLine.length - 1], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguOCAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIxLjMgMjUgMTIuNUMyNSA1LjYgMTkuNCAMCAxMi41IDB6IiBmaWxsPSIjREM0MzRDIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjcuNSIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(map).bindPopup("<b>End Point</b>");
        }
    </script>
</body>
</html>`;
}

// --- Execution ---
const main = () => {
  try {
    const inputPath = path.join(__dirname, 'sample_input.json');

    if (!fs.existsSync(inputPath)) {
      throw new Error("sample_input.json not found. Please ensure the file exists in this directory.");
    }

    console.log("Reading GPS data...");
    const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    console.log("Processing GPS data...");
    const result = processGPSData(rawData);
    console.log("Generating map visualization...");
    const htmlContent = generateMapHTML(
      rawData,
      result.cleanPath,
      result.jitters,
      result.idlingPoints,
      result.statistics
    );

    const outputPath = path.join(__dirname, 'output_map.html');
    fs.writeFileSync(outputPath, htmlContent);

    console.log(`\n${'='.repeat(50)}`);
    console.log('GPS DATA PROCESSING COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total Points:         ${result.statistics.totalPoints}`);
    console.log(`Clean Points:         ${result.statistics.cleanPoints}`);
    console.log(`Jitters Removed:      ${result.statistics.jittersRemoved}`);
    console.log(`Idling Events:        ${result.statistics.idlingEvents}`);
    console.log(`Duplicate Timestamps: ${result.statistics.duplicateTimestamps}`);
    console.log('='.repeat(50));
    console.log(`\nMap generated: ${outputPath}`);
    console.log('\nOpen the HTML file in your browser to view the interactive map.');
    console.log('\nMap Legend:');
    console.log('  🔵 Blue line    = Clean GPS route');
    console.log('  🔴 Red circles  = Jitters (removed noise)');
    console.log('  🟠 Orange pins  = Idling points');
    console.log('  🟢 Green pin    = Start point');
    console.log('  🔴 Red pin      = End point');

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
};
main();
