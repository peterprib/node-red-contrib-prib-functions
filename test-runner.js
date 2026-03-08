#!/usr/bin/env node

// Simple unit test for logistic regression node
const assert = require('assert');
const LogisticRegression = require('logisticegression');

// counters used by both runners
let testsPassed = 0;
let testsFailed = 0;

// If the CLI includes the word 'transform' proceed to run the
// transformation node tests rather than the logistic regression
// suite.  This avoids pulling mocha back in while still exercising
// the existing mocha-based files under test/transform*.js.
if (process.argv.includes('transform')) {
    runTransformTests();
    return;
}

// If the CLI includes 'dataanalysis' run dataAnalysis tests
if (process.argv.includes('dataanalysis')) {
    runDataAnalysisTests();
    return;
}


function test(description, fn) {
    try {
        fn();
        console.log(`✓ PASS: ${description}`);
        testsPassed++;
    } catch (err) {
        console.error(`✗ FAIL: ${description}`);
        console.error(`  Error: ${err.message}`);
        testsFailed++;
    }
}

// ---------------------------------------------------------------------------
// transform test emulation
// ---------------------------------------------------------------------------
function callMaybeAsync(fn) {
    return new Promise((resolve, reject) => {
        try {
            if (fn.length >= 1) {
                fn(err => (err ? reject(err) : resolve()));
            } else {
                Promise.resolve(fn()).then(resolve, reject);
            }
        } catch (err) {
            reject(err);
        }
    });
}

async function runTransformTests() {
    const path = require('path');
    const fs = require('fs');

    let beforeEachFns = [];
    let afterEachFns = [];
    let tests = [];
    let currentDescribe = '';

    global.describe = function(desc, fn) {
        currentDescribe = desc;
        fn();
    };
    global.beforeEach = function(fn) {
        beforeEachFns.push(fn);
    };
    global.afterEach = function(fn) {
        afterEachFns.push(fn);
    };
    global.it = function(desc, fn) {
        const full = currentDescribe ? `${currentDescribe} ${desc}` : desc;
        tests.push({desc: full, fn});
        return { timeout: () => {} };
    };

    console.log("Transform Node Tests\n" + "=".repeat(60));

    const dir = path.join(__dirname, 'test');
    const files = fs.readdirSync(dir).filter(f => /^transform.*\.js$/.test(f));
    files.forEach(f => require(path.join(dir, f)));

    for (const t of tests) {
        for (const bf of beforeEachFns) await callMaybeAsync(bf);
        try {
            await callMaybeAsync(t.fn);
            console.log(`✓ PASS: ${t.desc}`);
            testsPassed++;
        } catch (err) {
            console.error(`✗ FAIL: ${t.desc}`);
            console.error(`  Error: ${err.message}`);
            testsFailed++;
        }
        for (const af of afterEachFns) {
            try {
                await callMaybeAsync(af);
            } catch (err) {
                // ignore server-not-running errors which happen when
                // cleanup double-closes the Node-RED test helper server.
                if (err && err.code === 'ERR_SERVER_NOT_RUNNING') {
                    // no-op
                } else {
                    throw err;
                }
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);
    console.log('='.repeat(60));
    process.exit(testsFailed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// dataanalysis test emulation
// ---------------------------------------------------------------------------
async function runDataAnalysisTests() {
    const path = require('path');
    const fs = require('fs');

    let beforeEachFns = [];
    let afterEachFns = [];
    let tests = [];
    let currentDescribe = '';

    global.describe = function(desc, fn) {
        currentDescribe = desc;
        fn();
    };
    global.beforeEach = function(fn) {
        beforeEachFns.push(fn);
    };
    global.afterEach = function(fn) {
        afterEachFns.push(fn);
    };
    global.it = function(desc, fn) {
        const full = currentDescribe ? `${currentDescribe} ${desc}` : desc;
        tests.push({desc: full, fn});
        return { timeout: () => {} };
    };

    console.log("Data Analysis Extension Tests\n" + "=".repeat(60));

    const dir = path.join(__dirname, 'test');
    const files = fs.readdirSync(dir).filter(f => /^dataAnalysisE.*\.js$/.test(f));
    files.forEach(f => require(path.join(dir, f)));

    for (const t of tests) {
        for (const bf of beforeEachFns) await callMaybeAsync(bf);
        try {
            await callMaybeAsync(t.fn);
            console.log(`✓ PASS: ${t.desc}`);
            testsPassed++;
        } catch (err) {
            console.error(`✗ FAIL: ${t.desc}`);
            console.error(`  Error: ${err.message}`);
            testsFailed++;
        }
        for (const af of afterEachFns) await callMaybeAsync(af);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);
    console.log('='.repeat(60));
    process.exit(testsFailed > 0 ? 1 : 0);
}

console.log("Logistic Regression Unit Tests\n" + "=".repeat(60));

// Test 1: Model instantiation
test("Should create a LogisticRegression model instance", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    assert(model instanceof LogisticRegression);
    assert.strictEqual(model.learningRate, 0.1);
    assert.strictEqual(model.iterations, 100);
});

// Test 2: Model fit
test("Should fit a model with training data", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    const result = model.fit(X, y);
    assert(result instanceof LogisticRegression);
    assert(model.weights !== null);
    assert.strictEqual(model.weights.length, 3); // 2 features + 1 intercept
});

// Test 3: Model predict
test("Should predict class labels", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    model.fit(X, y);
    const predictions = model.predict([[0, 0], [1, 1], [0, 1]]);
    
    assert(Array.isArray(predictions));
    assert.strictEqual(predictions.length, 3);
    predictions.forEach(pred => {
        assert([0, 1].includes(pred));
    });
});

// Test 4: Model predictProba
test("Should predict probabilities", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    model.fit(X, y);
    const probs = model.predictProba([[0, 0], [1, 1], [0.5, 0.5]]);
    
    assert(Array.isArray(probs));
    assert.strictEqual(probs.length, 3);
    probs.forEach(prob => {
        assert(typeof prob === 'number');
        assert(prob >= 0 && prob <= 1);
    });
});

// Test 5: Model decision function
test("Should compute decision function (logits)", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    model.fit(X, y);
    const decisions = model.decisionFunction([[0, 0], [1, 1]]);
    
    assert(Array.isArray(decisions));
    assert.strictEqual(decisions.length, 2);
    decisions.forEach(d => {
        assert(typeof d === 'number');
    });
});

// Test 6: Fit without data
test("Should throw error when fitting without data", () => {
    const model = new LogisticRegression();
    try {
        model.fit([], []);
        throw new Error("Should have thrown an error");
    } catch (err) {
        assert(err.message.includes("non-empty"));
    }
});

// Test 7: Mismatched dimensions
test("Should throw error when X and y have different lengths", () => {
    const model = new LogisticRegression();
    try {
        model.fit([[0, 0], [1, 1]], [0, 1, 1]);
        throw new Error("Should have thrown an error");
    } catch (err) {
        assert(err.message.includes("same number"));
    }
});

// Test 8: Predict before fit
test("Should throw error when predicting before fitting", () => {
    const model = new LogisticRegression();
    try {
        model.predict([[0, 0]]);
        throw new Error("Should have thrown an error");
    } catch (err) {
        assert(err.message.includes("not fitted"));
    }
});

// Test 9: L2 regularization
test("Should support L2 regularization", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100,
        l2: 0.01
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    model.fit(X, y);
    const predictions = model.predict([[0.5, 0.5]]);
    
    assert(Array.isArray(predictions));
    assert.strictEqual(predictions.length, 1);
});

// Test 10: Custom threshold
test("Should use custom threshold for prediction", () => {
    const model = new LogisticRegression({
        learningRate: 0.1,
        iterations: 100
    });
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 1, 1, 1];
    
    model.fit(X, y);
    const predictions = model.predict([[0.5, 0.5]], 0.7);
    
    assert(Array.isArray(predictions));
    assert([0, 1].includes(predictions[0]));
});

// Summary
console.log("\n" + "=".repeat(60));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log("=".repeat(60));

if (testsFailed > 0) {
    console.log("\nSome tests failed!");
    process.exit(1);
} else {
    console.log("\nAll tests passed! ✓");
    process.exit(0);
}
