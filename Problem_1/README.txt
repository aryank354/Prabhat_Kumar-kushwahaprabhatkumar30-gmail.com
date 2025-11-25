# Problem 1: Arithmetic Expression Parser

## 1. Approach & Logic
I used the Shunting-yard algorithm to parse the mathematical expression.
1. Tokenize: Convert string into arrays of numbers and operators.
2. Infix to Postfix: Reorder tokens so operands precede operators, respecting PEMDAS precedence.
3. Postfix Evaluation: Use a stack to calculate the result.
This approach ensures O(n) time complexity and O(n) space complexity.

## 2. AI Declaration
**AI Tool Used:** Gemini
**Usage:** Used to verify the precedence logic for the Shunting-yard algorithm implementation in JavaScript. Code logic is self-contained.

## 3. How to Run
1. Navigate to this directory.
2. (Optional) Edit 'sample_input.txt' with your expression.
3. Run:
   node solution.js

## 4. Sample Execution Log
**Input (from code default):**
"2+3*4"

**Output:**
14

**Complex Input Test:**
"(10 + 2) * 3 / 4"

**Output:**
9   