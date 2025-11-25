# Problem 3: Meeting Slot Finder

## 1. Approach
This is a standard "Merge Intervals" problem.
1. Parse all times into minutes from start of day.
2. Flatten all participants' busy schedules into one list.
3. Sort and merge overlapping intervals to create a master "Busy Timeline".
4. Iterate through the master timeline to find the first gap between intervals that is >= D (duration).
Time Complexity: O(N log N) due to sorting.

## 2. AI Declaration
**AI Tool Used:** Gemini
**Usage:** Used to generate sample inputs for testing edge cases (e.g., overlapping intervals across multiple people).

## 3. How to Run
Method 1 (Direct Run - uses example):
   node solution.js

Method 2 (Custom Input):
   Create a file 'input.txt' with the format, then run:
   cat input.txt | node solution.js   (On Mac/Linux)
   type input.txt | node solution.js  (On Windows)

## 4. Sample Execution Log
**Input:**
2 60
2
09:00 10:00
12:00 13:00
2
11:00 12:30
15:00 16:00

**Output:**
10:00 11:00

**Explanation:**
The algorithm successfully identified the earliest 60-minute window where both participants were available (10:00 to 11:00).
