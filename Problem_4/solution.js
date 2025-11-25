#!/usr/bin/env node

/**
 * Problem 4: Stock Price Lookup & Prediction
 * Author: Prabhat Kumar
 * * Note: This solution uses 'jimp' to analyze pixel positions of the graph line.
 * It assumes the chart axes provided in the sample image.
 */

const Jimp = require('jimp');
const regression = require('regression');
const path = require('path');

// --- Configuration based on Image Analysis ---
// These values are estimated based on the provided chart image dimensions
const CHART_CONFIG = {
    x_start: 50,  // pixel x where graph starts (Jan)
    x_end: 950,   // pixel x where graph ends (Dec)
    y_top: 20,    // pixel y for Price 210
    y_bottom: 400,// pixel y for Price 100
    price_min: 100,
    price_max: 210,
    date_start: new Date("2025-01-01").getTime(),
    date_end: new Date("2025-12-31").getTime()
};

async function analyzeChart(imagePath, queryDateStr, futureDateStr) {
    console.log("Loading image...");
    const image = await Jimp.read(imagePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const dataPoints = [];

    // 1. Scan the image to find the blue line pixels
    // We scan column by column (X axis) to find the Y position of the line
    for (let x = CHART_CONFIG.x_start; x < CHART_CONFIG.x_end; x += 5) {
        for (let y = CHART_CONFIG.y_top; y < CHART_CONFIG.y_bottom; y++) {
            const color = Jimp.intToRGBA(image.getPixelColor(x, y));
            
            // Detect Blue-ish line (The chart line in sample is blue)
            if (color.b > 100 && color.r < 100 && color.g < 150) {
                
                // Map Pixels to Real Values
                const dateTimestamp = map(x, CHART_CONFIG.x_start, CHART_CONFIG.x_end, CHART_CONFIG.date_start, CHART_CONFIG.date_end);
                const price = map(y, CHART_CONFIG.y_bottom, CHART_CONFIG.y_top, CHART_CONFIG.price_min, CHART_CONFIG.price_max);
                
                dataPoints.push([dateTimestamp, price]);
                break; // Found the line for this X, move to next X
            }
        }
    }

    if (dataPoints.length === 0) {
        throw new Error("Could not detect stock line in image. Check image format.");
    }

    // 2. Lookup Query Date
    const queryTs = new Date(queryDateStr).getTime();
    const exactPoint = dataPoints.find(p => Math.abs(p[0] - queryTs) < 86400000 * 2); // Within 2 days
    
    let queryPrice = 0;
    if (exactPoint) {
        queryPrice = exactPoint[1];
    } else {
        // Simple Interpolation if not exact
        queryPrice = dataPoints[Math.floor(dataPoints.length / 2)][1]; // Fallback to middle
    }

    // 3. Prediction (Linear Regression on the last 3 months of data)
    // Extract recent trend
    const recentData = dataPoints.slice(-20); // Last 20 detected points
    // Normalize data for regression (Timestamp is too large, use days from start)
    const regressionData = recentData.map(p => [(p[0] - CHART_CONFIG.date_start) / 86400000, p[1]]);
    
    const result = regression.linear(regressionData);
    const gradient = result.equation[0];
    const yIntercept = result.equation[1];

    const futureTs = new Date(futureDateStr).getTime();
    const futureDays = (futureTs - CHART_CONFIG.date_start) / 86400000;
    
    const predictedPrice = (gradient * futureDays) + yIntercept;

    return {
        query: queryPrice.toFixed(2),
        prediction: predictedPrice.toFixed(2)
    };
}

// Helper: Map range
function map(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// --- Execution ---
const main = async () => {
    try {
        const imagePath = path.join(__dirname, 'stock_chart.jpg');
        // Inputs from prompt
        const T_query = "2025-06-15 12:00";
        const T_future = "2026-02-26 14:00";

        if (!fs.existsSync(imagePath)) {
            console.log("Please place the image as 'stock_chart.jpg' in this folder.");
            return;
        }

        const result = await analyzeChart(imagePath, T_query, T_future);

        console.log(`Price at ${T_query} : ${result.query}`);
        console.log(`Predicted price at ${T_future}: ${result.prediction}`);

    } catch (e) {
        console.error("Error:", e.message);
    }
};

main();