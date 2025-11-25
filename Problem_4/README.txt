# Problem 4: Stock Analysis AI

## 1. Approach
1. **Image Processing:** Used the `jimp` library to scan the image pixel-by-pixel.
2. **Color Detection:** Identified the graph line by filtering for blue pixels (RGB analysis).
3. **Coordinate Mapping:** Mapped X-pixels to Dates (Jan-Dec) and Y-pixels to Price (100-210) based on chart scale.
4. **Prediction:** Performed a Linear Regression on the extracted data points to forecast the future price.

## 2. AI Declaration
**AI Tool Used:** Gemini
**Usage:** Used to optimize the pixel mapping logic and linear regression syntax.

## 3. How to Run
1. Install dependencies:
   npm install
2. Save your chart image as 'stock_chart.jpg' in this directory.
3. Run:
   node solution.js