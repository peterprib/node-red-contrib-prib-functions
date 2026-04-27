const logger = new (require("node-red-contrib-logger"))("dcdllm");
logger.sendInfo("Copyright 2026 Jaroslav Peter Prib");

// Component 1: Signal Estimator
const createSignalEstimator = ()=>{
	return {
		estimate: (query, keywords) => {
			// Ensure query is a string
			if (typeof query !== 'string') {
				query = String(query || '');
			}
			// Ensure keywords is an array
			if (!Array.isArray(keywords)) {
				keywords = [];
			}
			return ({
				length: query.length,
				wordCount: query.split(/\s+/).length,
				sentenceCount: (query.match(/[.!?]+/g) || []).length,
				hasQuestion: query.includes('?'),
				hasExclamation: query.includes('!'),
				hasNumbers: /\d/.test(query),
				hasKeywords: keywords.some(kw => query.toLowerCase().includes(kw.toLowerCase())),
				capitalRatio: (query.match(/[A-Z]/g) || []).length / query.length,
				complexity: query.split(/\s+/).filter(word => word.length > 6).length / query.split(/\s+/).length,
				estimatedCost: (query.length / 100) + (query.split(/\s+/).length / 10)
			})
		}
	}
};

// Component RL: Reinforcement Learning Policy
const createRLPolicy = () => {
	const qTable = {};
	const alpha = 0.1; // learning rate
	const gamma = 0.9; // discount factor
	const epsilon = 0.1; // exploration rate
	
	return {
		getState: (signals) => {
			// Discretize signals for state representation
			const compBin = Math.floor(signals.complexity * 5) / 5; // 0.0, 0.2, 0.4, 0.6, 0.8
			const lenBin = signals.length < 50 ? 'short' : signals.length < 200 ? 'medium' : 'long';
			const kwBin = signals.hasKeywords ? 'kw' : 'nokw';
			const questBin = signals.hasQuestion ? 'quest' : 'noquest';
			return `${compBin}_${lenBin}_${kwBin}_${questBin}`;
		},
		
		getAction: (state) => {
			if (!qTable[state]) qTable[state] = [0, 0, 0, 0]; // initialize Q-values for actions
			if (Math.random() < epsilon) {
				return Math.floor(Math.random() * 4); // explore
			} else {
				return qTable[state].indexOf(Math.max(...qTable[state])); // exploit
			}
		},
		
		update: (state, actionIndex, reward, nextState) => {
			if (!qTable[state]) qTable[state] = [0, 0, 0, 0];
			if (!qTable[nextState]) qTable[nextState] = [0, 0, 0, 0];
			const maxNextQ = Math.max(...qTable[nextState]);
			qTable[state][actionIndex] += alpha * (reward + gamma * maxNextQ - qTable[state][actionIndex]);
		},
		
		getQValues: (state) => qTable[state] || [0, 0, 0, 0]
	};
};

// Component 2: Policy Module
const createPolicy = (rl) => {
	return {
		decide: (policyInput, node) => {
			const { signals, thresholds, priors, sequentialContext } = policyInput;
			const state = rl.getState(signals);
			
			let action, reason, confidence, posteriors = {};
			
			if (node.useRL) {
				// RL-based decision
				const actionIndex = rl.getAction(state);
				action = ['answer', 'clarify', 'retrieve', 'escalate'][actionIndex];
				const qValues = rl.getQValues(state);
				const maxQ = Math.max(...qValues);
				const sumQ = qValues.reduce((a, b) => a + b, 0);
				confidence = sumQ > 0 ? maxQ / sumQ : 0.5;
				reason = 'RL policy decision';
			} else {
				// Bayesian decision tree
				const treeDecision = node.evaluateDecisionTree(signals);
				posteriors = node.computeBayesianPosteriors(signals, treeDecision);
				
				if (sequentialContext) {
					const updatedPosteriors = node.updateWithSequential(posteriors, sequentialContext, signals);
					action = Object.keys(updatedPosteriors).reduce((a, b) => 
						updatedPosteriors[a].probability > updatedPosteriors[b].probability ? a : b
					);
					confidence = updatedPosteriors[action].probability;
					reason = `sequential decision: ${treeDecision.reason}`;
				} else {
					action = Object.keys(posteriors).reduce((a, b) => 
						posteriors[a] > posteriors[b] ? a : b
					);
					confidence = posteriors[action];
					reason = treeDecision.reason;
				}
			}
			
			return { action, reason, confidence, posteriors, state, actionIndex: node.useRL ? ['answer', 'clarify', 'retrieve', 'escalate'].indexOf(action) : undefined };
		}
	};
};

// Component 3: Executor Module (Information Alteration & Outcome Tracking)
const createExecutor = () => {
	return {
		execute: (action, msg, signals, node) => {
			const executionLog = {
				action,
				timestamp: Date.now(),
				informationState: 'initial',
				outcomeExpected: null,
				sideEffects: []
			};
			
			switch (action) {
				case 'answer':
					executionLog.informationState = 'response_generated';
					executionLog.outcomeExpected = 'user receives answer';
					executionLog.sideEffects.push('system knowledge accessed');
					// Add reasoning instructions
					if (node.reasoningMode === 'cot') {
						msg.reasoningInstruction = "Let's think step by step to answer this query.";
					} else if (node.reasoningMode === 'tot') {
						msg.reasoningInstruction = "Explore multiple reasoning paths like a tree to find the best answer for this query.";
					}
					break;
				case 'clarify':
					executionLog.informationState = 'clarification_requested';
					executionLog.outcomeExpected = 'user provides more context';
					msg.clarificationPrompt = `Please clarify your query (complexity: ${signals.complexity.toFixed(2)})`;
					executionLog.sideEffects.push('user interaction initiated', 'awaiting input');
					break;
				case 'retrieve':
					executionLog.informationState = 'retrieval_initiated';
					executionLog.outcomeExpected = 'knowledge base searched';
					msg.retrievalQuery = msg.payload;
					executionLog.sideEffects.push('knowledge retrieval started', 'context altered');
					break;
				case 'escalate':
					executionLog.informationState = 'escalated';
					executionLog.outcomeExpected = 'human review required';
					msg.escalationReason = 'Query requires human intervention';
					executionLog.sideEffects.push('escalation triggered', 'information queued for review');
					break;
			}
			
			return executionLog;
		}
	};
};

// Component 4: Decision Tree Evaluator
const evaluateDecisionTree = function(signals) {
	// Simple tree structure: checks signals in order of importance
	if (signals.length > this.maxLength) {
		return { action: 'clarify', reason: 'query too long (tree node 1)' };
	}
	if (signals.hasKeywords) {
		return { action: 'retrieve', reason: 'contains keywords (tree node 2)' };
	}
	if (signals.sentenceCount > this.sentenceThreshold || signals.complexity > this.complexityThreshold) {
		return { action: 'clarify', reason: 'high complexity (tree node 3)' };
	}
	if (!signals.hasQuestion && signals.hasExclamation) {
		return { action: 'escalate', reason: 'urgent pattern (tree node 4)' };
	}
	if (signals.hasNumbers && signals.wordCount < this.wordThreshold) {
		return { action: 'retrieve', reason: 'data query (tree node 5)' };
	}
	return { action: 'answer', reason: 'default answer (tree leaf)' };
};

// Component 5: Bayesian Posterior Computation
const computeBayesianPosteriors = function(signals, treeDecision) {
	const posteriors = { answer: 0, clarify: 0, retrieve: 0, escalate: 0 };
	
	// Start with priors
	for (const action in this.priors) {
		posteriors[action] = this.priors[action];
	}
	
	// Update with signal likelihoods
	if (signals.length > this.maxLength) {
		posteriors.clarify *= 1.5;
	}
	if (signals.hasKeywords) {
		posteriors.retrieve *= 1.8;
	}
	if (signals.complexity > this.complexityThreshold) {
		posteriors.clarify *= 1.4;
	}
	if (!signals.hasQuestion && signals.hasExclamation) {
		posteriors.escalate *= 2.0;
	}
	if (signals.hasNumbers && signals.wordCount < this.wordThreshold) {
		posteriors.retrieve *= 1.6;
	}
	
	// Normalize to probabilities
	const total = Object.values(posteriors).reduce((a, b) => a + b, 0);
	for (const action in posteriors) {
		posteriors[action] = total > 0 ? posteriors[action] / total : this.priors[action];
	}
	
	return posteriors;
};

// Component 6: Sequential Bayesian Updater
const updateWithSequential = function(posteriors, prevDecision, currentSignals) {
	const updated = {};
	for (const action in posteriors) {
		updated[action] = { probability: posteriors[action] };
		
		// Reward consistency if same action in context
		if (prevDecision.action === action) {
			updated[action].probability *= 1.1;
		}
		
		// Penalize if signals changed significantly
		const signalDelta = Math.abs(currentSignals.complexity - prevDecision.signals.complexity);
		if (signalDelta > 0.3) {
			updated[action].probability *= 0.95;
		}
	}
	
	// Normalize
	const total = Object.values(updated).reduce((a, b) => a + b.probability, 0);
	for (const action in updated) {
		updated[action].probability = total > 0 ? updated[action].probability / total : posteriors[action];
	}
	
	return updated;
};

module.exports = function (RED) {
	function dcdllmNode(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.maxLength = config.maxLength || 100;
		this.keywords = config.keywords ? config.keywords.split(',').map(s => s.trim()).filter(s => s) : [];
		this.sentenceThreshold = config.sentenceThreshold || 3;
		this.complexityThreshold = config.complexityThreshold || 0.5;
		this.wordThreshold = config.wordThreshold || 5;
		this.decisionTree = JSON.parse(config.decisionTree || '{}');
		this.priors = JSON.parse(config.priors || '{"answer": 0.5, "clarify": 0.2, "retrieve": 0.2, "escalate": 0.1}');
		this.sequentialMode = config.sequentialMode || false;
		this.useRL = config.useRL || false;
		this.reasoningMode = config.reasoningMode || 'none';
		this.history = {}; // Track sequential decisions per context
		this.diagnostics = []; // Store diagnostics for failure attribution
		this.maxDiagnostics = 100; // Keep last 100 decisions
		
		// Core Components: Signal Estimator, RL, Policy, Executor
		this.signalEstimator = createSignalEstimator();
		this.rl = createRLPolicy();
		this.policy = createPolicy(this.rl);
		this.executor = createExecutor();
		
		// Bind methods to this context
		this.evaluateDecisionTree = evaluateDecisionTree;
		this.computeBayesianPosteriors = computeBayesianPosteriors;
		this.updateWithSequential = updateWithSequential;
		
		this.on("input", (msg) => {
			const query = msg.payload;
			const contextId = msg.contextId || 'default';
			
			// Component 1: Signal Estimation
			const signals = this.signalEstimator.estimate(query, this.keywords);
			
			// RL update if feedback provided
			if (msg.feedback !== undefined && this.useRL) {
				const lastDecision = this.history[contextId];
				if (lastDecision && lastDecision.state !== undefined && lastDecision.actionIndex !== undefined) {
					const reward = msg.feedback;
					const currentState = this.rl.getState(signals);
					this.rl.update(lastDecision.state, lastDecision.actionIndex, reward, currentState);
				}
			}
			
			// Component 2: Policy (Decision Making)
			const policyInput = {
				signals,
				thresholds: {
					maxLength: this.maxLength,
					sentenceThreshold: this.sentenceThreshold,
					complexityThreshold: this.complexityThreshold,
					wordThreshold: this.wordThreshold
				},
				priors: this.priors,
				sequentialContext: this.sequentialMode && this.history[contextId] ? this.history[contextId] : null
			};
			
			const policyDecision = this.policy.decide(policyInput, this);
			const action = policyDecision.action;
			const reason = policyDecision.reason;
			const confidence = policyDecision.confidence;
			
			// Component 3: Executor (Information Alteration)
			const executionResult = this.executor.execute(action, msg, signals, this);
			
			// Store decision in history for sequential context
			const decision = {
				action,
				signals,
				reason,
				confidence,
				timestamp: Date.now(),
				executionResult,
				state: policyDecision.state,
				actionIndex: policyDecision.actionIndex
			};
			
			if (this.sequentialMode) {
				this.history[contextId] = decision;
			}
			
			// Log diagnostics for failure attribution
			this.diagnostics.push(decision);
			if (this.diagnostics.length > this.maxDiagnostics) {
				this.diagnostics.shift();
			}
			
			msg.signals = signals;
			msg.action = action;
			msg.decisionReason = reason;
			msg.confidence = confidence;
			msg.executionResult = executionResult;
			msg.decisionId = `${contextId}_${Date.now()}`;
			
			// Send to appropriate output
			const outputs = [null, null, null, null]; // answer, clarify, retrieve, escalate
			const actionMap = { 'answer': 0, 'clarify': 1, 'retrieve': 2, 'escalate': 3 };
			if (actionMap[action] !== undefined) {
				outputs[actionMap[action]] = msg;
			}
			this.send(outputs);
		});
	}
	RED.nodes.registerType("dcdllm", dcdllmNode);
};