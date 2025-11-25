#!/usr/bin/env node

/**
 * Problem 3: Multi-Person Meeting Slot Finder
 * Author: Prabhat Kumar
 */

const fs = require('fs');

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

function solve(input) {
    const lines = input.trim().split(/\r?\n/);
    if (lines.length === 0) return "NONE";

    const [P, D] = lines[0].trim().split(/\s+/).map(Number);
    
    // Define Work Day: 09:00 (540) to 17:00 (1020)
    const WORK_START = 540;
    const WORK_END = 1020;

    let allBusy = [];
    let lineIdx = 1;

    // Collect all busy intervals
    for (let i = 0; i < P; i++) {
        if (lineIdx >= lines.length) break;
        const N = parseInt(lines[lineIdx++]);
        for (let j = 0; j < N; j++) {
            const [startStr, endStr] = lines[lineIdx++].trim().split(/\s+/);
            allBusy.push([parseTime(startStr), parseTime(endStr)]);
        }
    }

    // Sort intervals by start time
    allBusy.sort((a, b) => a[0] - b[0]);

    // Merge overlapping intervals
    const mergedBusy = [];
    if (allBusy.length > 0) {
        let [currStart, currEnd] = allBusy[0];
        for (let i = 1; i < allBusy.length; i++) {
            const [nextStart, nextEnd] = allBusy[i];
            if (nextStart < currEnd) {
                // Overlap, extend end time
                currEnd = Math.max(currEnd, nextEnd);
            } else {
                mergedBusy.push([currStart, currEnd]);
                currStart = nextStart;
                currEnd = nextEnd;
            }
        }
        mergedBusy.push([currStart, currEnd]);
    }

    // Find gaps
    // Check gap between Work Start and first busy
    let lastEnd = WORK_START;
    
    for (const [start, end] of mergedBusy) {
        // Gap detected
        if (start - lastEnd >= D) {
            // Found a slot!
            return `${formatTime(lastEnd)} ${formatTime(lastEnd + D)}`; // Returning earliest slot of duration D
        }
        lastEnd = Math.max(lastEnd, end);
    }

    // Check gap after last busy until Work End
    if (WORK_END - lastEnd >= D) {
        return `${formatTime(lastEnd)} ${formatTime(lastEnd + D)}`;
    }

    return "NONE";
}

// --- Input Handling ---
const main = () => {
    // Check if input is piped or from file
    let inputData = "";
    
    if (process.stdin.isTTY) {
        // Run with default example if no input provided
        console.log("No input provided via pipe. Running Example:");
        const example = `2 60
2
09:00 10:00
12:00 13:00
2
11:00 12:30
15:00 16:00`;
        console.log(solve(example));
    } else {
        process.stdin.on('data', chunk => inputData += chunk);
        process.stdin.on('end', () => console.log(solve(inputData)));
    }
};

main();