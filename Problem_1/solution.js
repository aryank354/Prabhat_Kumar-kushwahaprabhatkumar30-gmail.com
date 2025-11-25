#!/usr/bin/env node

/**
 * Problem 1: Complete Arithmetic Expression Parser
 * Author: Prabhat Kumar (Updated)
 * 
 * Approach:
 * 1. Tokenize the input string (handle multi-digit numbers, decimals, negative numbers).
 * 2. Convert Infix notation (A + B) to Postfix notation (A B +) using the Shunting-yard algorithm.
 *    This automatically handles operator precedence and parentheses.
 * 3. Evaluate the Postfix expression using a stack.
 * 
 * Complexity: 
 * - Time: O(n) where n is the length of the expression
 * - Space: O(n) for the token array and operator stack
 */

const fs = require('fs');
const path = require('path');

// --- Logic ---

const precedence = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2
};

const isOperator = (c) => ['+', '-', '*', '/'].includes(c);

/**
 * Tokenizes the expression string into numbers and operators.
 * Handles:
 * - Multi-digit numbers
 * - Decimal numbers
 * - Negative numbers (unary minus)
 * - Spaces
 */
function tokenize(expr) {
    const tokens = [];
    let numberBuffer = '';
    let expectUnaryMinus = true; // Track if we expect a unary minus

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (/\s/.test(char)) continue; // Skip spaces

        if (/[\d.]/.test(char)) {
            numberBuffer += char;
            expectUnaryMinus = false;
        } else if (char === '-' && expectUnaryMinus) {
            // This is a unary minus (negative number)
            numberBuffer += char;
        } else {
            if (numberBuffer.length > 0) {
                const num = parseFloat(numberBuffer);
                if (isNaN(num)) {
                    throw new Error(`Invalid number: ${numberBuffer}`);
                }
                tokens.push(num);
                numberBuffer = '';
            }
            
            if (char === '(') {
                expectUnaryMinus = true;
            } else if (isOperator(char)) {
                expectUnaryMinus = true;
            } else if (char === ')') {
                expectUnaryMinus = false;
            }
            
            tokens.push(char);
        }
    }
    
    if (numberBuffer.length > 0) {
        const num = parseFloat(numberBuffer);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${numberBuffer}`);
        }
        tokens.push(num);
    }
    
    return tokens;
}

/**
 * Validates the token array for common errors
 */
function validateTokens(tokens) {
    if (tokens.length === 0) {
        throw new Error("Empty expression");
    }

    let parenCount = 0;
    let lastTokenType = null; // 'number', 'operator', 'open', 'close'

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (typeof token === 'number') {
            if (lastTokenType === 'number' || lastTokenType === 'close') {
                throw new Error(`Invalid expression: unexpected number at position ${i}`);
            }
            lastTokenType = 'number';
        } else if (token === '(') {
            parenCount++;
            if (lastTokenType === 'number' || lastTokenType === 'close') {
                throw new Error(`Invalid expression: unexpected '(' at position ${i}`);
            }
            lastTokenType = 'open';
        } else if (token === ')') {
            parenCount--;
            if (parenCount < 0) {
                throw new Error("Mismatched parentheses: too many closing parentheses");
            }
            if (lastTokenType === 'operator' || lastTokenType === 'open') {
                throw new Error(`Invalid expression: unexpected ')' at position ${i}`);
            }
            lastTokenType = 'close';
        } else if (isOperator(token)) {
            if (lastTokenType === 'operator' || lastTokenType === 'open') {
                throw new Error(`Invalid expression: consecutive operators at position ${i}`);
            }
            lastTokenType = 'operator';
        }
    }

    if (parenCount !== 0) {
        throw new Error("Mismatched parentheses: unclosed opening parentheses");
    }

    if (lastTokenType === 'operator') {
        throw new Error("Invalid expression: ends with an operator");
    }
}

/**
 * Converts Infix expression to Postfix (RPN)
 */
function toPostfix(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    tokens.forEach(token => {
        if (typeof token === 'number') {
            outputQueue.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.pop(); // Pop '('
        } else if (isOperator(token)) {
            while (
                operatorStack.length &&
                operatorStack[operatorStack.length - 1] !== '(' &&
                precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
            ) {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.push(token);
        }
    });

    while (operatorStack.length) {
        outputQueue.push(operatorStack.pop());
    }

    return outputQueue;
}

/**
 * Evaluates the Postfix expression
 */
function evaluatePostfix(postfixTokens) {
    const stack = [];

    postfixTokens.forEach(token => {
        if (typeof token === 'number') {
            stack.push(token);
        } else {
            if (stack.length < 2) {
                throw new Error("Invalid expression: insufficient operands");
            }
            
            const b = stack.pop();
            const a = stack.pop();

            switch (token) {
                case '+': stack.push(a + b); break;
                case '-': stack.push(a - b); break;
                case '*': stack.push(a * b); break;
                case '/': 
                    if (b === 0) {
                        throw new Error("Division by zero");
                    }
                    // Integer division truncating toward zero
                    stack.push(Math.trunc(a / b)); 
                    break;
            }
        }
    });

    if (stack.length !== 1) {
        throw new Error("Invalid expression: too many operands");
    }

    return stack[0];
}

function evaluateExpression(expression) {
    const tokens = tokenize(expression);
    validateTokens(tokens);
    const postfix = toPostfix(tokens);
    return evaluatePostfix(postfix);
}

// --- Execution ---

const main = () => {
    try {
        const inputPath = path.join(__dirname, 'sample_input.txt');
        
        if (fs.existsSync(inputPath)) {
            const fileContent = fs.readFileSync(inputPath, 'utf8').trim();
            console.log(`Input from file: ${fileContent}`);
            console.log(`Result: ${evaluateExpression(fileContent)}`);
        } else {
            // Run comprehensive test cases
            console.log("=== Running Test Cases ===\n");
            
            const testCases = [
                { expr: "2+3*4", expected: 14 },
                { expr: "(10 + 2) * 3 / 4", expected: 9 },
                { expr: "-5 + 3", expected: -2 },
                { expr: "2 * -3", expected: -6 },
                { expr: "(-5 + 3) * 2", expected: -4 },
                { expr: "10 / 3", expected: 3 },
                { expr: "-10 / 3", expected: -3 },
                { expr: "((2+3)*(4-1))/3", expected: 5 },
                { expr: "100 - 50 + 25", expected: 75 },
            ];

            let passed = 0;
            let failed = 0;

            testCases.forEach(({ expr, expected }) => {
                try {
                    const result = evaluateExpression(expr);
                    if (result === expected) {
                        console.log(`✓ PASS: "${expr}" = ${result}`);
                        passed++;
                    } else {
                        console.log(`✗ FAIL: "${expr}" = ${result} (expected ${expected})`);
                        failed++;
                    }
                } catch (err) {
                    console.log(`✗ ERROR: "${expr}" - ${err.message}`);
                    failed++;
                }
            });

            console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
        }
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

main();