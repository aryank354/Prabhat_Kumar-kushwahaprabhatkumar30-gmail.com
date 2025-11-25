#!/usr/bin/env node

/**
 * Problem 1: Complete Arithmetic Expression Parser
 * Author: Prabhat Kumar
 * * Approach:
 * 1. Tokenize the input string (handle multi-digit numbers).
 * 2. Convert Infix notation (A + B) to Postfix notation (A B +) using the Shunting-yard algorithm.
 * This automatically handles operator precedence and parentheses.
 * 3. Evaluate the Postfix expression using a stack.
 * * Complexity: O(n) time, O(n) space.
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
 */
function tokenize(expr) {
    const tokens = [];
    let numberBuffer = '';

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (/\s/.test(char)) continue; // Skip spaces

        if (/\d/.test(char)) {
            numberBuffer += char;
        } else {
            if (numberBuffer.length > 0) {
                tokens.push(parseInt(numberBuffer));
                numberBuffer = '';
            }
            tokens.push(char);
        }
    }
    if (numberBuffer.length > 0) tokens.push(parseInt(numberBuffer));
    return tokens;
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
            const b = stack.pop();
            const a = stack.pop();

            switch (token) {
                case '+': stack.push(a + b); break;
                case '-': stack.push(a - b); break;
                case '*': stack.push(a * b); break;
                case '/': 
                    // Requirement: Integer division truncating toward zero
                    stack.push(Math.trunc(a / b)); 
                    break;
            }
        }
    });

    return stack[0];
}

function evaluateExpression(expression) {
    const tokens = tokenize(expression);
    const postfix = toPostfix(tokens);
    return evaluatePostfix(postfix);
}

// --- Execution ---

const main = () => {
    // Read from sample_input.txt or default to the example
    try {
        const inputPath = path.join(__dirname, 'sample_input.txt');
        if (fs.existsSync(inputPath)) {
            const fileContent = fs.readFileSync(inputPath, 'utf8').trim();
            console.log(`Input from file: ${fileContent}`);
            console.log(`Result: ${evaluateExpression(fileContent)}`);
        } else {
            // Default Example
            const example = "2+3*4";
            console.log(`Example Input: ${example}`);
            console.log(`Output: ${evaluateExpression(example)}`);
            
            const complexExample = "(10 + 2) * 3 / 4"; // Should be 9
            console.log(`Complex Input: ${complexExample}`);
            console.log(`Output: ${evaluateExpression(complexExample)}`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
};

main();