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