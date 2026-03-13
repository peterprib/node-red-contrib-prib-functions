const should = require('should');
const LogisticRegression = require('logisticegression');

describe('Logistic Regression', function() {

    it('should create a LogisticRegression model instance', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        (model instanceof LogisticRegression).should.be.true();
        model.learningRate.should.equal(0.1);
        model.iterations.should.equal(100);
    });

    it('should fit a model with training data', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        const result = model.fit(X, y);
        (result instanceof LogisticRegression).should.be.true();
        (model.weights !== null).should.be.true();
        model.weights.length.should.equal(3); // 2 features + 1 intercept
    });

    it('should predict class labels', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        model.fit(X, y);
        const predictions = model.predict([[0, 0], [1, 1], [0, 1]]);
        
        Array.isArray(predictions).should.be.true();
        predictions.length.should.equal(3);
        predictions.forEach(pred => {
            [0, 1].should.containEql(pred);
        });
    });

    it('should predict probabilities', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        model.fit(X, y);
        const probs = model.predictProba([[0, 0], [1, 1], [0.5, 0.5]]);
        
        Array.isArray(probs).should.be.true();
        probs.length.should.equal(3);
        probs.forEach(prob => {
            (typeof prob === 'number').should.be.true();
            prob.should.be.above(-0.01);
            prob.should.be.below(1.01);
        });
    });

    it('should compute decision function (logits)', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        model.fit(X, y);
        const decisions = model.decisionFunction([[0, 0], [1, 1]]);
        
        Array.isArray(decisions).should.be.true();
        decisions.length.should.equal(2);
        decisions.forEach(d => {
            (typeof d === 'number').should.be.true();
        });
    });

    it('should throw error when fitting without data', function() {
        const model = new LogisticRegression();
        (() => {
            model.fit([], []);
        }).should.throw(/non-empty/);
    });

    it('should throw error when X and y have different lengths', function() {
        const model = new LogisticRegression();
        (() => {
            model.fit([[0, 0], [1, 1]], [0, 1, 1]);
        }).should.throw(/same number/);
    });

    it('should throw error when predicting before fitting', function() {
        const model = new LogisticRegression();
        (() => {
            model.predict([[0, 0]]);
        }).should.throw(/not fitted/);
    });

    it('should support L2 regularization', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100,
            l2: 0.01
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        model.fit(X, y);
        const predictions = model.predict([[0.5, 0.5]]);
        
        Array.isArray(predictions).should.be.true();
        predictions.length.should.equal(1);
    });

    it('should use custom threshold for prediction', function() {
        const model = new LogisticRegression({
            learningRate: 0.1,
            iterations: 100
        });
        const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const y = [0, 1, 1, 1];
        
        model.fit(X, y);
        const predictions = model.predict([[0.5, 0.5]], 0.7);
        
        Array.isArray(predictions).should.be.true();
        [0, 1].should.containEql(predictions[0]);
    });
});

describe('Logistic Regression Node', function() {
    const helper = require("node-red-node-test-helper");
    const logisticRegression = require("../logisticRegression/logisticRegression.js");
    helper.init(require.resolve('node-red'));
    
    const helperNodeOutput = {id: "helperNodeOutput", type: "helper"};
    
    const base = {
        id: "n1",
        type: "logisticRegression",
        modelName: "testModel",
        action: "fit",
        learningRate: 0.1,
        iterations: 2000,
        fitIntercept: true,
        l2: 0.0,
        tolerance: 1e-7,
        verbose: false,
        threshold: 0.5,
        wires: [[helperNodeOutput.id]]
    };
    
    function getNode(node) {
        const n = helper.getNode(node.id);
        n.should.not.be.undefined();
        return n;
    }
    
    afterEach(function(done) {
        helper.unload().then(function() {
            done();
        }).catch(done);
    });

    it('should fit a model with training data', function(done) {
        const newBase = Object.assign({}, base, {action: "fit"});
        const flow = [helperNodeOutput, newBase];
        
        helper.load(logisticRegression, flow, function() {
            try {
                const outputNode = getNode(helperNodeOutput);
                const n1 = getNode(newBase);
                n1.should.have.property("action", "fit");
                
                outputNode.on("input", function(msg) {
                    try {
                        msg.should.have.property("result");
                        msg.result.should.equal("Model fitted and stored as: testModel");
                        msg.should.not.have.property("error");
                    } catch (ex) {
                        return done(ex);
                    }
                    done();
                });
                
                // Send training data
                const trainingData = {
                    payload: {
                        X: [[0, 0], [0, 1], [1, 0], [1, 1]],
                        y: [0, 1, 1, 1]
                    }
                };
                n1.receive(trainingData);
            } catch (ex) {
                done(ex);
            }
        });
    });

    it('should predict class labels after fitting', function(done) {
        const fitBase = Object.assign({}, base, {action: "fit"});
        const predictBase = Object.assign({}, base, {id: "n2", action: "predict"});
        const flow = [helperNodeOutput, fitBase, predictBase];
        
        helper.load(logisticRegression, flow, function() {
            try {
                const outputNode = getNode(helperNodeOutput);
                const fitNode = getNode(fitBase);
                const predictNode = getNode(predictBase);
                
                let fitDone = false;
                
                outputNode.on("input", function(msg) {
                    try {
                        if (!fitDone) {
                            // First message is from fit
                            msg.result.should.equal("Model fitted and stored as: testModel");
                            fitDone = true;
                            
                            // Send prediction data to same node
                            setTimeout(() => {
                                const predictionData = {
                                    payload: [[0, 0], [1, 1], [0, 1]]
                                };
                                predictNode.receive(predictionData);
                            }, 100);
                        } else {
                            // Second message is prediction result
                            msg.should.have.property("result");
                            Array.isArray(msg.result).should.be.true();
                            msg.result.length.should.equal(3);
                            msg.result.forEach(pred => {
                                [0, 1].should.containEql(pred);
                            });
                            done();
                        }
                    } catch (ex) {
                        done(ex);
                    }
                });
                
                // First fit the model
                const trainingData = {
                    payload: {
                        X: [[0, 0], [0, 1], [1, 0], [1, 1]],
                        y: [0, 1, 1, 1]
                    }
                };
                fitNode.receive(trainingData);
            } catch (ex) {
                done(ex);
            }
        });
    });

    it('should predict probabilities after fitting', function(done) {
        const fitBase = Object.assign({}, base, {action: "fit"});
        const probaBase = Object.assign({}, base, {id: "n3", action: "predictProba"});
        const flow = [helperNodeOutput, fitBase, probaBase];
        
        helper.load(logisticRegression, flow, function() {
            try {
                const outputNode = getNode(helperNodeOutput);
                const fitNode = getNode(fitBase);
                const probaNode = getNode(probaBase);
                
                let fitDone = false;
                
                outputNode.on("input", function(msg) {
                    try {
                        if (!fitDone) {
                            // First message is from fit
                            msg.result.should.equal("Model fitted and stored as: testModel");
                            fitDone = true;
                            
                            // Send prediction data
                            setTimeout(() => {
                                const predictionData = {
                                    payload: [[0, 0], [1, 1], [0.5, 0.5]]
                                };
                                probaNode.receive(predictionData);
                            }, 100);
                        } else {
                            // Second message is probability result
                            msg.should.have.property("result");
                            Array.isArray(msg.result).should.be.true();
                            msg.result.length.should.equal(3);
                            msg.result.forEach(prob => {
                                (typeof prob === 'number').should.be.true();
                                prob.should.be.above(-0.01);
                                prob.should.be.below(1.01);
                            });
                            done();
                        }
                    } catch (ex) {
                        done(ex);
                    }
                });
                
                // Fit the model
                const trainingData = {
                    payload: {
                        X: [[0, 0], [0, 1], [1, 0], [1, 1]],
                        y: [0, 1, 1, 1]
                    }
                };
                fitNode.receive(trainingData);
            } catch (ex) {
                done(ex);
            }
        });
    });

    it('should handle fit error when missing X and y', function(done) {
        const newBase = Object.assign({}, base, {action: "fit"});
        const flow = [helperNodeOutput, newBase];
        
        helper.load(logisticRegression, flow, function() {
            try {
                const outputNode = getNode(helperNodeOutput);
                const n1 = getNode(newBase);
                
                outputNode.on("input", function(msg) {
                    try {
                        msg.should.have.property("error");
                        done();
                    } catch (ex) {
                        done(ex);
                    }
                });
                
                // Send invalid data
                const invalidData = {
                    payload: {}
                };
                n1.receive(invalidData);
            } catch (ex) {
                done(ex);
            }
        });
    });

    it('should handle predict error when model not fitted', function(done) {
        const newBase = Object.assign({}, base, {action: "predict"});
        const flow = [helperNodeOutput, newBase];
        
        helper.load(logisticRegression, flow, function() {
            try {
                const outputNode = getNode(helperNodeOutput);
                const n1 = getNode(newBase);
                
                outputNode.on("input", function(msg) {
                    try {
                        msg.should.have.property("error");
                        done();
                    } catch (ex) {
                        done(ex);
                    }
                });
                
                // Try to predict without fitting
                const predictionData = {
                    payload: [[0, 0]]
                };
                n1.receive(predictionData);
            } catch (ex) {
                done(ex);
            }
        });
    });
});
